/**
 * Reabre login_semana cancelado indevidamente quando a semana aguarda avaliacao do lider.
 * Uso: node scripts/corrigir-login-cancelado-aguardando.mjs [--confirmar]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const confirmar = process.argv.includes('--confirmar');
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

const semAtual = segundaSemanaSaoPaulo();

const { data: movs, error } = await sb
  .from('graos_movimentos')
  .select('id, colaborador_id, semana_inicio, graos, estado, missao')
  .eq('missao', 'login_semana')
  .eq('estado', 'cancelado')
  .gt('graos', 0);
if (error) throw new Error(error.message);

let total = 0;
for (const m of movs ?? []) {
  const sem = String(m.semana_inicio ?? '');
  if (!sem || sem !== semAtual) continue;
  const { count } = await sb
    .from('avaliacoes_diarias')
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', m.colaborador_id)
    .eq('data_referencia', sem);
  if ((count ?? 0) > 0) continue;

  const { data: col } = await sb.from('colaboradores').select('nome').eq('id', m.colaborador_id).maybeSingle();
  console.log(`${col?.nome ?? m.colaborador_id} | sem ${sem} | login +${m.graos} cancelado → pendente`);
  if (confirmar) {
    await sb.from('graos_movimentos').update({ estado: 'pendente' }).eq('id', m.id);
  }
  total += 1;
}
console.log(`\n${confirmar ? 'Corrigidos' : 'Encontrados'}: ${total} (use --confirmar)`);
