/**
 * Aplica migração 044 Grãos via DATABASE_URL ou SUPABASE_DB_PASSWORD (.env.local).
 * Uso: node scripts/aplicar-graos-044.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { loadEnvFile, resolveDatabaseUrl } from './lib/resolve-database-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

const env = { ...loadEnvFile(portalRoot), ...process.env };
const databaseUrl = resolveDatabaseUrl(env);

if (!databaseUrl) {
  console.error('Falta conexão Postgres. No .env.local use uma das opções:');
  console.error('  DATABASE_URL=postgresql://postgres:SENHA@db.fxopbgjallrweshdehbn.supabase.co:5432/postgres');
  console.error('  ou SUPABASE_DB_PASSWORD=SENHA (com NEXT_PUBLIC_SUPABASE_URL já definido)');
  console.error('Copie a URI em Supabase → Settings → Database → Connection string → Direct (5432).');
  process.exit(1);
}

const sqlPath = path.join(portalRoot, 'supabase', 'APLIQUE_044_GRAOS_SQL_EDITOR.sql');
const raw = fs.readFileSync(sqlPath, 'utf8');
const statements = raw
  .split(';')
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter((s) => s.length > 0 && !/^NOTIFY/i.test(s));

const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });

try {
  for (const stmt of statements) {
    const preview = stmt.slice(0, 60).replace(/\s+/g, ' ');
    console.log('Executando:', preview, '...');
    await sql.unsafe(stmt);
  }
  console.log('OK: migração 044 Grãos aplicada.');
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM graos_catalogo`;
  console.log(`Catálogo: ${n} item(ns).`);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('Erro:', msg);
  if (/ETIMEDOUT|ENOTFOUND|tenant\/user/.test(msg)) {
    console.error('');
    console.error('Conexão pelo PC falhou (IPv6 ou pooler errado).');
    console.error('1) Cole supabase/APLIQUE_044_GRAOS_SQL_EDITOR.sql no SQL Editor do Supabase (navegador).');
    console.error('2) Backfill sem senha Postgres: node scripts/backfill-graos-semanas.mjs --semanas=8 --supabase');
    console.error('');
    console.error('Se quiser insistir no terminal: copie a URI EXATA em Supabase → Database → Connection string (não invente o host).');
  }
  process.exit(1);
} finally {
  await sql.end();
}
