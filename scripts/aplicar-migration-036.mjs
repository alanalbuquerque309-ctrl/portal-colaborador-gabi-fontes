/**
 * Aplica supabase/migrations/036_tipo_escala_colaborador.sql
 * Uso: npm run db:apply-036
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
  return process.env.DATABASE_URL || null;
}

const databaseUrl = readDatabaseUrl(portalRoot);
if (!databaseUrl) {
  console.error('DATABASE_URL não encontrada.');
  process.exit(1);
}

const migPath = path.join(portalRoot, 'supabase', 'migrations', '036_tipo_escala_colaborador.sql');
const migSql = fs.readFileSync(migPath, 'utf8');

const sql = postgres(databaseUrl, { max: 1 });
try {
  await sql.unsafe(migSql);
  console.log('036_tipo_escala_colaborador.sql aplicada.');
} finally {
  await sql.end();
}
