/**

 * Mostra quantas avaliações existem por semana (equipe + liderança).

 * Uso: npm run db:diagnostico-avaliacoes

 */

import fs from 'fs';

import path from 'path';

import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const portalRoot = path.join(__dirname, '..');



function loadEnvFile(dir) {

  const out = {};

  for (const name of ['.env.local', '.env']) {

    const p = path.join(dir, name);

    if (!fs.existsSync(p)) continue;

    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {

      const t = line.trim();

      if (!t || t.startsWith('#')) continue;

      const m = t.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);

      if (!m) continue;

      let v = m[2].trim();

      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {

        v = v.slice(1, -1);

      }

      out[m[1]] = v;

    }

  }

  return out;

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



const env = { ...loadEnvFile(portalRoot), ...process.env };

const url = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();

const key = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

if (!url || !key) {

  console.error('Falta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');

  process.exit(1);

}



const semanaAtual = segundaSemanaSaoPaulo();

const sb = createClient(url, key);



const { data: equipe, error: errE } = await sb

  .from('avaliacoes_diarias')

  .select('data_referencia, colaborador_id, avaliador_id, media_dia, assiduidade')

  .order('data_referencia');



if (errE) {

  console.error('Erro ao ler avaliacoes_diarias:', errE.message);

  process.exit(1);

}



const porSemana = {};

for (const r of equipe ?? []) {

  const d = r.data_referencia;

  porSemana[d] = (porSemana[d] ?? 0) + 1;

}



const naAtual = porSemana[semanaAtual] ?? 0;



console.log('');

console.log('=== Diagnóstico — avaliações no Supabase ===');

console.log(`Semana atual (segunda SP): ${semanaAtual}`);

console.log('');

console.log('Avaliação da equipe (avaliacoes_diarias):');

if (Object.keys(porSemana).length === 0) {

  console.log('  (nenhum registro)');

} else {

  for (const [sem, n] of Object.entries(porSemana).sort()) {

    const tag = sem === semanaAtual ? '  <- semana atual' : '';

    console.log(`  ${sem}: ${n} avaliação(ões)${tag}`);

  }

}

console.log('');

console.log(`Total na semana atual: ${naAtual}`);

console.log(`Total geral equipe: ${(equipe ?? []).length}`);



const { data: lider, error: errL } = await sb.from('avaliacoes_lideranca').select('semana_inicio');

if (!errL) {

  const cl = {};

  for (const r of lider ?? []) {

    const d = r.semana_inicio;

    cl[d] = (cl[d] ?? 0) + 1;

  }

  console.log('');

  console.log('Avaliar liderança (avaliacoes_lideranca):');

  if (Object.keys(cl).length === 0) console.log('  (nenhum registro)');

  else {

    for (const [sem, n] of Object.entries(cl).sort()) {

      console.log(`  ${sem}: ${n}`);

    }

  }

}



console.log('');

if (naAtual > 0) {

  console.log('OK: há dados na semana atual. No portal use Atualizar lista.');

  console.log('Não é preciso restaurar backup.');

} else {

  console.log('ATENÇÃO: semana atual VAZIA no banco.');

  console.log('Restaurar só pelo Supabase: Database → Backups → Point in Time Recovery');

  console.log('(não há comando mágico no terminal sem arquivo .dump de backup)');

}

console.log('');


