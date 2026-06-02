/**
 * Remove avaliações de semanas anteriores à semana corrente (America/Sao_Paulo).
 * Mantém apenas a semana atual (contagem oficial).
 *
 * Uso: node scripts/limpar-avaliacoes-semanas-antigas.mjs --confirmar
 * Opcional: --semana=2026-06-02  (segunda-feira da semana a preservar; padrão = hoje SP)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

function stripBom(s) {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function loadEnvFile(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    let raw = fs.readFileSync(p, 'utf8');
    raw = stripBom(raw);
    for (const line of raw.split(/\r?\n/)) {
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

/** Segunda-feira da semana em America/Sao_Paulo (YYYY-MM-DD). */
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

const confirmar = process.argv.includes('--confirmar');
const semanaArg = process.argv.find((a) => a.startsWith('--semana='))?.split('=')[1]?.trim();
const semanaPreservar = semanaArg || segundaSemanaSaoPaulo();

if (!confirmar) {
  console.error(
    `Remove avaliações com data/semana ANTERIOR a ${semanaPreservar}.\n` +
      'Rode: node scripts/limpar-avaliacoes-semanas-antigas.mjs --confirmar'
  );
  process.exit(1);
}

const fileEnv = loadEnvFile(portalRoot);
const env = { ...fileEnv, ...process.env };
const databaseUrl = String(env.DATABASE_URL ?? '').trim();
const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

async function limparViaPostgres() {
  const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });
  try {
    const antesEquipe = await sql`
      SELECT count(*)::int AS n FROM avaliacoes_diarias WHERE data_referencia < ${semanaPreservar}
    `;
    const antesLider = await sql`
      SELECT count(*)::int AS n FROM avaliacoes_lideranca WHERE semana_inicio < ${semanaPreservar}
    `;
    const manterEquipe = await sql`
      SELECT count(*)::int AS n FROM avaliacoes_diarias WHERE data_referencia >= ${semanaPreservar}
    `;

    await sql`DELETE FROM avaliacoes_diarias WHERE data_referencia < ${semanaPreservar}`;
    let removidosLider = 0;
    try {
      const delL = await sql`
        DELETE FROM avaliacoes_lideranca WHERE semana_inicio < ${semanaPreservar}
      `;
      removidosLider = delL.count ?? antesLider[0].n;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/avaliacoes_lideranca/i.test(msg)) throw e;
      console.warn('Tabela avaliacoes_lideranca ausente; ignorado.');
    }

    return {
      removidosEquipe: antesEquipe[0].n,
      removidosLider: removidosLider || antesLider[0].n,
      mantidosEquipe: manterEquipe[0].n,
    };
  } finally {
    await sql.end();
  }
}

async function limparViaSupabase() {
  const supabase = createClient(supabaseUrl, serviceKey);

  const { count: antesEquipe } = await supabase
    .from('avaliacoes_diarias')
    .select('*', { count: 'exact', head: true })
    .lt('data_referencia', semanaPreservar);

  const { count: manterEquipe } = await supabase
    .from('avaliacoes_diarias')
    .select('*', { count: 'exact', head: true })
    .gte('data_referencia', semanaPreservar);

  const { error: errDel } = await supabase
    .from('avaliacoes_diarias')
    .delete({ count: 'exact' })
    .lt('data_referencia', semanaPreservar);
  if (errDel) throw new Error(errDel.message);

  let removidosLider = 0;
  const { count: antesLider } = await supabase
    .from('avaliacoes_lideranca')
    .select('*', { count: 'exact', head: true })
    .lt('semana_inicio', semanaPreservar);

  const { error: errL } = await supabase
    .from('avaliacoes_lideranca')
    .delete({ count: 'exact' })
    .lt('semana_inicio', semanaPreservar);
  if (errL && !/avaliacoes_lideranca/i.test(errL.message)) throw new Error(errL.message);
  else removidosLider = antesLider ?? 0;

  return {
    removidosEquipe: antesEquipe ?? 0,
    removidosLider,
    mantidosEquipe: manterEquipe ?? 0,
  };
}

try {
  console.log(`Semana preservada (segunda SP): ${semanaPreservar}`);
  let stats;
  if (databaseUrl) stats = await limparViaPostgres();
  else if (supabaseUrl && serviceKey) stats = await limparViaSupabase();
  else {
    console.error('Configure DATABASE_URL ou NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('Removido:');
  console.log(`  avaliacoes_diarias (equipe): ${stats.removidosEquipe}`);
  console.log(`  avaliacoes_lideranca: ${stats.removidosLider}`);
  console.log(`Mantido nesta semana (equipe): ${stats.mantidosEquipe} registro(s)`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
