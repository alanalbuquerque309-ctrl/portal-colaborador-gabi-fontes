/**
 * Corrige saldos negativos de Grãos (resgates órfãos do pré-piloto).
 * O saldo nunca pode ficar negativo — não existe banco de dívidas.
 * Cancela débitos de resgate até o saldo confirmado voltar a >= 0.
 * Uso: node scripts/corrigir-graos-saldo-negativo.mjs [--confirmar]
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

function semanaVigente(sem) {
  const s = String(sem ?? '').trim();
  if (!s) return true;
  return s >= CORTE;
}

const { data: movs, error } = await sb
  .from('graos_movimentos')
  .select('id, colaborador_id, semana_inicio, graos, estado, missao, created_at')
  .neq('estado', 'cancelado');

if (error) throw new Error(error.message);

const porColab = new Map();
for (const m of movs ?? []) {
  if (!semanaVigente(m.semana_inicio)) continue;
  const cid = String(m.colaborador_id);
  const acc = porColab.get(cid) ?? { confirmado: 0, debitos: [] };
  const g = Number(m.graos) || 0;
  if (m.estado === 'confirmado') {
    acc.confirmado += g;
    if (g < 0 && m.missao === 'debito_resgate') acc.debitos.push(m);
  }
  porColab.set(cid, acc);
}

const cancelarIds = [];
let totalDevolvido = 0;
for (const [cid, acc] of porColab) {
  if (acc.confirmado >= 0) continue;
  // cancela resgates (mais recentes primeiro) até zerar a dívida
  acc.debitos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  let saldo = acc.confirmado;
  for (const d of acc.debitos) {
    if (saldo >= 0) break;
    cancelarIds.push(d.id);
    saldo += Math.abs(Number(d.graos) || 0);
    totalDevolvido += Math.abs(Number(d.graos) || 0);
  }
  console.log(`Colab ${cid}: confirmado ${acc.confirmado} -> ${Math.max(0, saldo)} (cancela ${acc.debitos.filter((d) => cancelarIds.includes(d.id)).length} resgate(s))`);
}

console.log(`${confirmar ? 'Aplicar' : 'Dry-run'}: ${cancelarIds.length} débitos de resgate órfãos (${totalDevolvido} grãos)`);

if (confirmar && cancelarIds.length) {
  const chunk = 100;
  for (let i = 0; i < cancelarIds.length; i += chunk) {
    const slice = cancelarIds.slice(i, i + chunk);
    const { error: updErr } = await sb
      .from('graos_movimentos')
      .update({
        estado: 'cancelado',
        meta: { ajuste_sistema: 'resgate_orfao_pre_piloto', oculto_colaborador: true },
      })
      .in('id', slice);
    if (updErr) throw new Error(updErr.message);
  }
}

console.log('OK');
