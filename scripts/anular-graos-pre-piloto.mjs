/**
 * Anula créditos de Grãos anteriores ao piloto (sem. 15/06/2026).
 * Uso: node scripts/anular-graos-pre-piloto.mjs [--confirmar]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const CORTE = '2026-06-15';
const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const confirmar = process.argv.includes('--confirmar');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: movs, error } = await sb
  .from('graos_movimentos')
  .select('id, colaborador_id, semana_inicio, graos, estado, missao')
  .not('semana_inicio', 'is', null)
  .lt('semana_inicio', CORTE)
  .neq('estado', 'cancelado');

if (error) throw new Error(error.message);

let graos = 0;
const ids = [];
for (const m of movs ?? []) {
  if (Number(m.graos) <= 0) continue;
  ids.push(m.id);
  graos += Number(m.graos);
}

console.log(`${confirmar ? 'Aplicar' : 'Dry-run'}: ${ids.length} movimentos (${graos} grãos) antes de ${CORTE}`);

if (confirmar && ids.length) {
  const chunk = 100;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { error: updErr } = await sb
      .from('graos_movimentos')
      .update({
        estado: 'cancelado',
        meta: { ajuste_sistema: 'pre_piloto_anulado', oculto_colaborador: true },
      })
      .in('id', slice);
    if (updErr) throw new Error(updErr.message);
  }
}

console.log('OK');
