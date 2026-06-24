/**
 * Aplica supabase/migrations/059_plantao_paridade_lojas_jun2026.sql
 * Uso: npm run db:apply-059
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

function stripBom(s) {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function readDatabaseUrl(dir) {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    let raw = fs.readFileSync(p, 'utf8');
    raw = stripBom(raw);
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^\s*DATABASE_URL\s*=\s*(.+)$/i);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        return v;
      }
    }
  }
  return '';
}

const databaseUrl = readDatabaseUrl(portalRoot);
if (!databaseUrl) {
  console.error('Defina DATABASE_URL em .env.local (conexão direta Supabase, porta 5432).');
  process.exit(1);
}

const sqlPath = path.join(portalRoot, 'supabase', 'migrations', '059_plantao_paridade_lojas_jun2026.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = postgres(databaseUrl, { max: 1, ssl: 'require' });
try {
  await client.unsafe(sql);
  console.log('[db:apply-059] OK — paridade plantão jun/2026 aplicada nas lojas.');
} catch (e) {
  console.error('[db:apply-059] ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end();
}
