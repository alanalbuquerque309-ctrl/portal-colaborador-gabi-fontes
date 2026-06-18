/**
 * Corrige Grãos pendentes indevidos (backfill, semanas passadas, duplicatas login).
 *
 * Uso:
 *   node scripts/corrigir-graos-pendentes-indevidos.mjs --supabase
 *   node scripts/corrigir-graos-pendentes-indevidos.mjs --supabase --confirmar
 *   node scripts/corrigir-graos-pendentes-indevidos.mjs --supabase --nome="Rodrigo"
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

function segundaSemanaSaoPaulo(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  const ys = local.getFullYear();
  const ms = String(local.getMonth() + 1).padStart(2, '0');
  const ds = String(local.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

async function main() {
  const env = { ...loadEnvFile(portalRoot), ...process.env };
  const confirmar = process.argv.includes('--confirmar');
  const filtroNome = process.argv.find((a) => a.startsWith('--nome='))?.split('=').slice(1).join('=').trim() ?? '';

  const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceKey) {
    console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const semanaCorrente = segundaSemanaSaoPaulo();

  let qColab = supabase.from('colaboradores').select('id, nome').eq('role', 'colaborador').order('nome');
  if (filtroNome) qColab = qColab.ilike('nome', `%${filtroNome}%`);

  const { data: colaboradores, error: errColab } = await qColab;
  if (errColab) throw new Error(errColab.message);

  console.log(`Semana corrente (SP): ${semanaCorrente}`);
  console.log(`Colaboradores: ${colaboradores?.length ?? 0}${filtroNome ? ` (filtro: ${filtroNome})` : ''}`);
  console.log(confirmar ? 'Modo: APLICAR correções\n' : 'Modo: dry-run (use --confirmar para aplicar)\n');

  let totalCancelar = 0;
  let totalRenomear = 0;

  for (const c of colaboradores ?? []) {
    const cid = String(c.id);
    const nome = String(c.nome ?? '');

    const { data: movs, error } = await supabase
      .from('graos_movimentos')
      .select('id, missao, semana_inicio, estado, graos, descricao, ref_key, created_at')
      .eq('colaborador_id', cid)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const cancelarIds = [];
    const renomearIds = [];

    // 1) Pendentes de semanas passadas
    for (const m of movs ?? []) {
      if (m.estado !== 'pendente' || Number(m.graos) <= 0) continue;
      const sem = String(m.semana_inicio ?? '');
      if (sem && sem < semanaCorrente) cancelarIds.push(m.id);
    }

    // 2) Pendentes login/backfill sem atividade (descrição legada backfill) — semanas passadas já cobertos
    for (const m of movs ?? []) {
      if (m.estado !== 'pendente' || m.missao !== 'login_semana') continue;
      const desc = String(m.descricao ?? '');
      if (desc.includes('(backfill)')) cancelarIds.push(m.id);
    }

    // 3) Duplicatas login na mesma semana
    const loginPorSemana = new Map();
    for (const m of movs ?? []) {
      if (m.missao !== 'login_semana') continue;
      const sem = String(m.semana_inicio ?? '');
      if (!sem) continue;
      const lista = loginPorSemana.get(sem) ?? [];
      lista.push(m);
      loginPorSemana.set(sem, lista);
    }
    for (const rows of loginPorSemana.values()) {
      if (rows.length <= 1) continue;
      const manter = rows.find((r) => r.estado === 'confirmado') ?? rows[0];
      for (const r of rows) {
        if (r.id !== manter.id && r.estado !== 'cancelado') cancelarIds.push(r.id);
      }
    }

    // 4) Normalizar descrição backfill → texto padrão (só estética/histórico)
    for (const m of movs ?? []) {
      const desc = String(m.descricao ?? '');
      if (desc.includes('(backfill)')) renomearIds.push(m.id);
    }

    const uniqCancelar = [...new Set(cancelarIds)];
    const uniqRenomear = [...new Set(renomearIds)];

    if (uniqCancelar.length === 0 && uniqRenomear.length === 0) continue;

    const pendAntes = (movs ?? []).filter((m) => m.estado === 'pendente' && Number(m.graos) > 0).length;
    console.log(`${nome}:`);
    console.log(`  pendentes ativos: ${pendAntes}`);
    if (uniqCancelar.length) console.log(`  → cancelar ${uniqCancelar.length} movimento(s)`);
    if (uniqRenomear.length) console.log(`  → renomear ${uniqRenomear.length} descrição(ões) backfill`);

    totalCancelar += uniqCancelar.length;
    totalRenomear += uniqRenomear.length;

    if (confirmar) {
      if (uniqCancelar.length) {
        const { error: updErr } = await supabase
          .from('graos_movimentos')
          .update({ estado: 'cancelado' })
          .in('id', uniqCancelar);
        if (updErr) throw new Error(updErr.message);
      }
      for (const m of movs ?? []) {
        if (!uniqRenomear.includes(m.id)) continue;
        const desc = String(m.descricao ?? '').replace(' (backfill)', '').replace('(backfill)', '');
        let nova = desc;
        if (m.missao === 'login_semana') nova = 'Entrada no portal na semana';
        else if (m.missao === 'aviso_semana') nova = 'Leitura de comunicado';
        else if (m.missao === 'lideranca_semana') nova = 'Avaliar liderança';
        else if (m.missao === 'sugestao_semana') nova = 'Enviar sugestão';
        await supabase.from('graos_movimentos').update({ descricao: nova }).eq('id', m.id);
      }
    }
  }

  console.log('\n--- Resumo ---');
  console.log(`Cancelamentos: ${totalCancelar}`);
  console.log(`Renomeações: ${totalRenomear}`);
  if (!confirmar && (totalCancelar > 0 || totalRenomear > 0)) {
    console.log('\nExecute com --confirmar para aplicar.');
  }
}

main().catch((e) => {
  console.error('Erro:', e instanceof Error ? e.message : e);
  process.exit(1);
});
