/**
 * Aplica migration 059 (paridade plantão 12×36 nas lojas).
 * Uso: npm run db:apply-059
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL ausente em .env.local');
    process.exit(1);
  }
  const sql = fs.readFileSync(
    path.join(root, 'supabase/migrations/059_plantao_paridade_lojas_jun2026.sql'),
    'utf8'
  );
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('[db:apply-059] OK — paridade plantão jun/2026 aplicada nas lojas.');
}

main().catch((e) => {
  console.error('[db:apply-059] ERRO:', e.message);
  process.exit(1);
});
