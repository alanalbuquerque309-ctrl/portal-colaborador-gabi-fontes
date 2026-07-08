/**
 * Aplica supabase/migrations/065_home_office_tipo_escala.sql
 * Uso: node scripts/aplicar-migration-065.mjs
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

const sqlPath = path.join(portalRoot, 'supabase', 'migrations', '065_home_office_tipo_escala.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = postgres(databaseUrl, { max: 1, ssl: 'require' });
try {
  await client.unsafe(sql);
  const rows = await client`
    SELECT id, nome, tipo_escala
    FROM colaboradores
    WHERE id = '073a6d3c-ddd0-4823-ac8a-1e99b037607a'
  `;
  console.log('[db:apply-065] OK — home_office liberado; Thaís:', rows[0] ?? '(não encontrada)');
} catch (e) {
  console.error('[db:apply-065] ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end();
}
