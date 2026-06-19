/** Re-cancela login reaberto indevidamente em semanas ja encerradas. */
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

const semAtual = segundaSemanaSaoPaulo();
const { data: movs, error } = await sb
  .from('graos_movimentos')
  .select('id, semana_inicio')
  .eq('missao', 'login_semana')
  .eq('estado', 'pendente')
  .gt('graos', 0)
  .lt('semana_inicio', semAtual);
if (error) throw new Error(error.message);

const ids = (movs ?? []).map((m) => m.id);
console.log(`Semana atual ${semAtual}: re-cancelar ${ids.length} login(s) de semanas antigas`);
if (ids.length) {
  const { error: updErr } = await sb
    .from('graos_movimentos')
    .update({
      estado: 'cancelado',
      meta: { ajuste_sistema: 'encerramento_pendente_semana_anterior', oculto_colaborador: true },
    })
    .in('id', ids);
  if (updErr) throw new Error(updErr.message);
}
console.log('OK');
