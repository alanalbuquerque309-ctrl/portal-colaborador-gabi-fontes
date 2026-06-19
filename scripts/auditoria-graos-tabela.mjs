/** Tabela resumida Grãos — todos colaboradores. */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function segundaSemanaSaoPaulo(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  local.setDate(local.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

const SEM = '2026-06-15';
const CORTE = SEM;
const { data: cols } = await sb.from('colaboradores').select('id, nome').eq('role', 'colaborador').order('nome');

const semAtual = segundaSemanaSaoPaulo();
console.log(`semana_atual=${semAtual} | piloto_desde=${CORTE}`);
console.log('nome|conf_total|pend_total|sem_atual_conf|sem_atual_pend|tem_aval_sem_atual|assiduidade');

for (const c of cols ?? []) {
  const { data: movs } = await sb.from('graos_movimentos').select('graos, estado, semana_inicio').eq('colaborador_id', c.id);
  let conf = 0, pend = 0, sc = 0, sp = 0;
  for (const m of movs ?? []) {
    const g = Number(m.graos) || 0;
    const sem = m.semana_inicio ? String(m.semana_inicio) : null;
    if (sem && sem < CORTE) continue;
    if (m.estado === 'confirmado') conf += g;
    if (m.estado === 'pendente' && g > 0) pend += g;
    if (String(m.semana_inicio) === semAtual && g > 0) {
      if (m.estado === 'confirmado') sc += g;
      if (m.estado === 'pendente') sp += g;
    }
  }
  const { data: av } = await sb
    .from('avaliacoes_diarias')
    .select('assiduidade, justificativa_nota_baixa')
    .eq('colaborador_id', c.id)
    .eq('data_referencia', semAtual)
    .limit(1)
    .maybeSingle();
  const ass = av ? String(av.assiduidade) : '—';
  console.log(`${c.nome}|${conf}|${pend}|${sc}|${sp}|${av ? 'sim' : 'nao'}|${ass}`);
}
