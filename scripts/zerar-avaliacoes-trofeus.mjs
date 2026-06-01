/**
 * Remove todas as linhas de avaliacoes_diarias e trofeus_entre_pares (dados de teste).
 * Uso: node scripts/zerar-avaliacoes-trofeus.mjs --confirmar
 * Usa DATABASE_URL (preferido) ou NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
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

const confirmar = process.argv.includes('--confirmar');
if (!confirmar) {
  console.error('Operação destrutiva. Rode com: node scripts/zerar-avaliacoes-trofeus.mjs --confirmar');
  process.exit(1);
}

const fileEnv = loadEnvFile(portalRoot);
const env = { ...fileEnv, ...process.env };

const databaseUrl = String(env.DATABASE_URL ?? '').trim();
const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

async function zerarViaPostgres() {
  const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });
  try {
    const antesAval = await sql`SELECT count(*)::int AS n FROM avaliacoes_diarias`;
    const antesTrof = await sql`SELECT count(*)::int AS n FROM trofeus_entre_pares`;
    await sql`DELETE FROM trofeus_entre_pares`;
    await sql`DELETE FROM avaliacoes_diarias`;
    const depoisAval = await sql`SELECT count(*)::int AS n FROM avaliacoes_diarias`;
    const depoisTrof = await sql`SELECT count(*)::int AS n FROM trofeus_entre_pares`;
    return { antesAval: antesAval[0].n, antesTrof: antesTrof[0].n, depoisAval: depoisAval[0].n, depoisTrof: depoisTrof[0].n };
  } finally {
    await sql.end();
  }
}

async function zerarViaSupabase() {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { count: antesTrof } = await supabase
    .from('trofeus_entre_pares')
    .select('*', { count: 'exact', head: true });
  const { count: antesAval } = await supabase
    .from('avaliacoes_diarias')
    .select('*', { count: 'exact', head: true });

  const { error: errT } = await supabase.from('trofeus_entre_pares').delete().gte('semana_inicio', '1900-01-01');
  if (errT) throw new Error(errT.message);
  const { error: errA } = await supabase.from('avaliacoes_diarias').delete().gte('data_referencia', '1900-01-01');
  if (errA) throw new Error(errA.message);

  const { count: depoisTrof } = await supabase
    .from('trofeus_entre_pares')
    .select('*', { count: 'exact', head: true });
  const { count: depoisAval } = await supabase
    .from('avaliacoes_diarias')
    .select('*', { count: 'exact', head: true });

  return {
    antesAval: antesAval ?? 0,
    antesTrof: antesTrof ?? 0,
    depoisAval: depoisAval ?? 0,
    depoisTrof: depoisTrof ?? 0,
  };
}

try {
  let stats;
  if (databaseUrl) {
    stats = await zerarViaPostgres();
  } else if (supabaseUrl && serviceKey) {
    stats = await zerarViaSupabase();
  } else {
    console.error(
      'Configure DATABASE_URL ou NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY em .env.local'
    );
    process.exit(1);
  }

  console.log('Removido:');
  console.log(`  avaliacoes_diarias: ${stats.antesAval} -> ${stats.depoisAval}`);
  console.log(`  trofeus_entre_pares: ${stats.antesTrof} -> ${stats.depoisTrof}`);
  console.log('Banco zerado para começar avaliações e troféus reais.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
