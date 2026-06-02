/**
 * Aplica migrations 038 + 039 no Postgres do Supabase.
 *
 * Uso (uma das opções no .env.local):
 *   DATABASE_URL=postgresql://postgres:...@db.REF.supabase.co:5432/postgres
 *   ou SUPABASE_DB_PASSWORD=... (com NEXT_PUBLIC_SUPABASE_URL)
 *
 * npm run db:apply-migrations-avaliacao
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(portalRoot, name);
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
  return { ...out, ...process.env };
}

function resolveDatabaseUrl(env) {
  const direct = String(env.DATABASE_URL ?? env.DIRECT_URL ?? '').trim();
  if (direct) return direct;
  const pwd = String(env.SUPABASE_DB_PASSWORD ?? env.POSTGRES_PASSWORD ?? '').trim();
  const base = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const ref = base.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  if (!pwd || !ref) return null;
  return `postgresql://postgres:${encodeURIComponent(pwd)}@db.${ref}.supabase.co:5432/postgres`;
}

const env = loadEnv();
const databaseUrl = resolveDatabaseUrl(env);

if (!databaseUrl) {
  console.error('');
  console.error('Não achei conexão com o banco.');
  console.error('Opção A — no .env.local adicione DATABASE_URL (Settings → Database → URI no Supabase)');
  console.error('Opção B — SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL já no .env.local');
  console.error('');
  console.error('Opção C — SQL Editor do Supabase: copie e rode o arquivo:');
  console.error('  supabase/APLIQUE_038_039_SQL_EDITOR.sql');
  console.error('');
  process.exit(1);
}

const sqlPath = path.join(portalRoot, 'supabase', 'APLIQUE_038_039_SQL_EDITOR.sql');
const migSql = fs.readFileSync(sqlPath, 'utf8');

const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });
try {
  await sql.unsafe(migSql);
  console.log('OK: migrations 038 e 039 aplicadas. Recarregue o portal (Atualizar lista).');
} catch (e) {
  console.error('Erro:', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await sql.end();
}
