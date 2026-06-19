/**
 * Normaliza envio de sugestão: 1 Grão por semana (nunca 3), uma linha por colaborador/semana.
 * Uso: node scripts/corrigir-graos-sugestao-envio.mjs [--confirmar]
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
  .select('id, colaborador_id, semana_inicio, graos, estado, ref_key, created_at')
  .eq('missao', 'sugestao_semana')
  .gte('semana_inicio', CORTE)
  .neq('estado', 'cancelado');

if (error) throw new Error(error.message);

let ajustarGraos = 0;
let cancelarDup = 0;
const ops = [];

for (const m of movs ?? []) {
  if (Number(m.graos) !== 1) {
    ajustarGraos++;
    if (confirmar) {
      ops.push(
        sb.from('graos_movimentos').update({ graos: 1, descricao: 'Enviar sugestão' }).eq('id', m.id)
      );
    }
  }
}

const porPar = new Map();
for (const m of movs ?? []) {
  const k = `${m.colaborador_id}:${m.semana_inicio}`;
  if (!porPar.has(k)) porPar.set(k, []);
  porPar.get(k).push(m);
}

const rank = (est) => (est === 'confirmado' ? 2 : est === 'pendente' ? 1 : 0);

for (const [k, rows] of porPar) {
  if (rows.length <= 1) continue;
  const [cid, sem] = k.split(':');
  const canonRef = `${cid}:sugestao_semana:${sem}`;
  const sorted = [...rows].sort((a, b) => {
    const dr = rank(b.estado) - rank(a.estado);
    if (dr !== 0) return dr;
    if (a.ref_key === canonRef) return -1;
    if (b.ref_key === canonRef) return 1;
    return String(a.created_at).localeCompare(String(b.created_at));
  });
  for (const dup of sorted.slice(1)) {
    cancelarDup++;
    if (confirmar) {
      ops.push(
        sb
          .from('graos_movimentos')
          .update({
            estado: 'cancelado',
            meta: { ajuste_sistema: 'envio_sugestao_unico_semana', oculto_colaborador: true },
          })
          .eq('id', dup.id)
      );
    }
  }
  const manter = sorted[0];
  if (confirmar && (Number(manter.graos) !== 1 || manter.ref_key !== canonRef)) {
    ops.push(
      sb
        .from('graos_movimentos')
        .update({ graos: 1, ref_key: canonRef, descricao: 'Enviar sugestão' })
        .eq('id', manter.id)
    );
  }
}

console.log(
  `${confirmar ? 'Aplicar' : 'Dry-run'}: ${ajustarGraos} linha(s) 3→1 | ${cancelarDup} duplicata(s) a cancelar`
);

if (confirmar && ops.length) {
  for (const op of ops) {
    const { error: e } = await op;
    if (e) throw new Error(e.message);
  }
}

console.log('OK');
