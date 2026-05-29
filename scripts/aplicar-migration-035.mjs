/**
 * Aplica só supabase/migrations/035_operacao_apto.sql
 * Uso: npm run db:apply-035  (requer DATABASE_URL em .env.local)
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
        if (v) return v;
      }
    }
  }
  return null;
}

const databaseUrl =
  (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) ||
  readDatabaseUrl(portalRoot);

if (!databaseUrl) {
  console.error('DATABASE_URL nao encontrado em .env.local nem .env.');
  console.error('Supabase: Settings -> Database -> Connection string -> URI Direct (porta 5432).');
  process.exit(1);
}

const sqlPath = path.join(portalRoot, 'supabase', 'migrations', '035_operacao_apto.sql');
const ddl = stripBom(fs.readFileSync(sqlPath, 'utf8')).trim();

const client = postgres(databaseUrl, { max: 1, ssl: 'require' });

try {
  console.log('A aplicar 035_operacao_apto.sql ...');
  await client.unsafe(ddl);
  console.log('OK: migration 035 aplicada.');
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/already exists/i.test(msg)) {
    console.log('Colunas ja existiam (OK).');
  } else {
    console.error(msg);
    process.exit(1);
  }
} finally {
  await client.end();
}
