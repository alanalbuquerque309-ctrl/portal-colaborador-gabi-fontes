/**
 * Aplica a coluna `setor` em `colaboradores` usando DATABASE_URL do .env.local (ou .env).
 * Nao precisa de psql. Uso na raiz do portal: npm run db:apply-setor
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
  console.error('DATABASE_URL nao encontrado em .env.local nem .env na raiz do Portal.');
  console.error('Supabase: Project Settings -> Database -> Connection string -> URI');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  console.log('A aplicar: colaboradores.setor ...');
  await sql`ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS setor TEXT`;
  await sql.unsafe(
    "COMMENT ON COLUMN colaboradores.setor IS 'Setor fixo: Cozinha loja, Fábrica de doces, etc.'"
  );
  console.log('OK. Pode cadastrar o colaborador de novo.');
} catch (e) {
  console.error(e.message || e);
  console.error(
    'Se falhar com pooler, use a URI Direct connection (porta 5432) em DATABASE_URL.'
  );
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
