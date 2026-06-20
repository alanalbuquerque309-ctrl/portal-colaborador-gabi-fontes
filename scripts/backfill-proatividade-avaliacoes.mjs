/**
 * Diagnóstico + backfill de nota_proatividade ausente em avaliacoes_diarias.
 * Uso: node scripts/backfill-proatividade-avaliacoes.mjs [--confirmar]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const confirmar = process.argv.includes('--confirmar');

function notaValida(n) {
  if (n == null || Number.isNaN(Number(n))) return false;
  const x = Math.round(Number(n) * 2) / 2;
  return x >= 1 && x <= 5;
}

function inferirProatividade(row) {
  const v = Number(row.nota_vestimenta);
  const p = Number(row.nota_pontualidade);
  const e = Number(row.nota_trabalho_equipe);
  const d = Number(row.nota_desempenho_tarefas);
  const media = Number(row.media_dia);
  if (![v, p, e, d, media].every((n) => !Number.isNaN(n))) return null;
  const pr = Math.round((media * 5 - v - p - e - d) * 2) / 2;
  return notaValida(pr) ? pr : null;
}

async function colunaProatividadeExiste() {
  const { error } = await sb.from('avaliacoes_diarias').select('nota_proatividade').limit(1);
  if (!error) return true;
  const msg = String(error.message ?? '').toLowerCase();
  return !(msg.includes('nota_proatividade') && (msg.includes('does not exist') || msg.includes('schema cache')));
}

const colExiste = await colunaProatividadeExiste();
console.log('Coluna nota_proatividade:', colExiste ? 'OK' : 'AUSENTE — aplique migration 039');

if (!colExiste) {
  process.exit(1);
}

const { data: avaliadores } = await sb.from('colaboradores').select('id, nome').order('nome');
const nomePorId = Object.fromEntries((avaliadores ?? []).map((c) => [c.id, c.nome]));

const { data: rows, error } = await sb
  .from('avaliacoes_diarias')
  .select(
    'id, colaborador_id, avaliador_id, data_referencia, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, media_dia'
  )
  .in('assiduidade', ['presente', 'falta_justificada', 'P', 'FJ'])
  .is('nota_proatividade', null)
  .not('media_dia', 'is', null)
  .order('data_referencia', { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const candidatos = (rows ?? []).filter((r) => inferirProatividade(r) != null);
const porAvaliador = {};
for (const r of candidatos) {
  const aid = String(r.avaliador_id ?? 'sem');
  porAvaliador[aid] = (porAvaliador[aid] ?? 0) + 1;
}

console.log('\n--- Avaliações com proatividade NULL (com média e 4 critérios) ---');
console.log('Total registros lidos:', rows?.length ?? 0);
console.log('Recuperáveis por inferência da média:', candidatos.length);
console.log('\nPor avaliador:');
for (const [id, qtd] of Object.entries(porAvaliador).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${nomePorId[id] ?? id}: ${qtd}`);
}

if (!confirmar) {
  console.log('\nModo dry-run. Rode com --confirmar para aplicar backfill.');
  process.exit(0);
}

let ok = 0;
let falha = 0;
for (const r of candidatos) {
  const pr = inferirProatividade(r);
  if (pr == null) continue;
  const { error: upErr } = await sb
    .from('avaliacoes_diarias')
    .update({ nota_proatividade: pr, updated_at: new Date().toISOString() })
    .eq('id', r.id);
  if (upErr) {
    console.error('Falha', r.id, upErr.message);
    falha++;
  } else {
    ok++;
  }
}
console.log(`\nBackfill: ${ok} atualizados, ${falha} falhas.`);
