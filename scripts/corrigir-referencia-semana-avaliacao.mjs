/**
 * Corrige avaliações gravadas na segunda da semana corrente em vez da semana passada.
 * Uso: node scripts/corrigir-referencia-semana-avaliacao.mjs --confirmar
 *      node scripts/corrigir-referencia-semana-avaliacao.mjs --confirmar --avaliador-id=UUID
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

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
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

function semanaAnterior(seg) {
  const [y, m, d] = seg.split('-').map((x) => parseInt(x, 10));
  const local = new Date(y, (m || 1) - 1, d || 1);
  local.setDate(local.getDate() - 7);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

loadEnv();

const confirmar = process.argv.includes('--confirmar');
const avArg = process.argv.find((a) => a.startsWith('--avaliador-id='));
const avaliadorFiltro = avArg ? avArg.split('=')[1]?.trim() : '';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam credenciais Supabase');
  process.exit(1);
}

const supabase = createClient(url, key);
const corrente = segundaSemanaSaoPaulo();
const passada = semanaAnterior(corrente);

let q = supabase
  .from('avaliacoes_diarias')
  .select('id, colaborador_id, avaliador_id, data_referencia')
  .eq('data_referencia', corrente);
if (avaliadorFiltro) q = q.eq('avaliador_id', avaliadorFiltro);

const { data: rows, error } = await q;
if (error) {
  console.error(error.message);
  process.exit(1);
}

const plano = [];
for (const r of rows ?? []) {
  const { data: dup } = await supabase
    .from('avaliacoes_diarias')
    .select('id')
    .eq('avaliador_id', r.avaliador_id)
    .eq('colaborador_id', r.colaborador_id)
    .eq('data_referencia', passada)
    .maybeSingle();
  if (dup?.id) continue;
  plano.push({ id: r.id, avaliador_id: r.avaliador_id, colaborador_id: r.colaborador_id });
}

console.log(
  JSON.stringify(
    {
      modo: confirmar ? 'aplicar' : 'simulacao',
      corrente,
      passada,
      candidatas: (rows ?? []).length,
      mover_para_passada: plano.length,
    },
    null,
    2
  )
);

if (!confirmar) {
  console.log('\nRode com --confirmar para aplicar.');
  process.exit(0);
}

let ok = 0;
for (const p of plano) {
  const { error: upErr } = await supabase
    .from('avaliacoes_diarias')
    .update({ data_referencia: passada })
    .eq('id', p.id);
  if (!upErr) ok++;
  else console.error(upErr.message, p.id);
}

console.log(JSON.stringify({ movidas: ok }, null, 2));
