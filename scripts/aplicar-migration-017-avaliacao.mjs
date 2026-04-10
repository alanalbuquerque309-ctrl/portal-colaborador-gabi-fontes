/**
 * Aplica supabase/migrations/017_avaliacoes_diarias_e_lider.sql usando DATABASE_URL.
 * Uso na raiz: npm run db:apply-avaliacao
 * Supabase: Project Settings → Database → Connection string → URI (preferir Direct, porta 5432).
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

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
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
      if (m) return unquote(m[1]);
    }
  }
  return null;
}

const databaseUrl =
  (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) ||
  readDatabaseUrl(portalRoot);
if (!databaseUrl) {
  console.error('DATABASE_URL nao encontrado em .env.local nem .env.');
  console.error('Cole a URI em .env.local: DATABASE_URL=postgresql://...');
  process.exit(1);
}

const sqlPath = path.join(portalRoot, 'supabase', 'migrations', '017_avaliacoes_diarias_e_lider.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Arquivo nao encontrado:', sqlPath);
  process.exit(1);
}

let ddl = fs.readFileSync(sqlPath, 'utf8');
ddl = stripBom(ddl).trim();
if (!ddl) {
  console.error('SQL vazio.');
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });

try {
  console.log('A aplicar migration 017 (lider_id + avaliacoes_diarias)...');
  await client.unsafe(ddl);
  console.log('OK. Tabelas e colunas criadas/atualizadas.');
} catch (e) {
  console.error(e.message || e);
  console.error('Se falhar com pooler, use a URI Direct connection (porta 5432).');
  process.exit(1);
} finally {
  await client.end({ timeout: 5 });
}
