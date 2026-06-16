/**
 * Testa variantes de conexão Supabase (Direct + poolers). Não imprime senha.
 * Uso: node scripts/testar-conexoes-supabase.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const ref = 'fxopbgjallrweshdehbn';

let pwd = String(env.SUPABASE_DB_PASSWORD ?? env.POSTGRES_PASSWORD ?? '').trim();
if (!pwd) {
  const tb = path.join(portalRoot, 'scripts', 'test-bootstrap.mjs');
  if (fs.existsSync(tb)) {
    const m = fs.readFileSync(tb, 'utf8').match(/postgresql:\/\/postgres:([^@]+)@/);
    if (m) pwd = decodeURIComponent(m[1]);
  }
}
if (!pwd) {
  console.error('Defina SUPABASE_DB_PASSWORD no .env.local ou rode após reset da senha.');
  process.exit(1);
}

const enc = encodeURIComponent(pwd);
const candidates = [
  ['direct-5432', `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`],
  ['pool-aws0-use1-session-5432', `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`],
  ['pool-aws0-use1-tx-6543', `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`],
  ['pool-aws1-use1-session-5432', `postgresql://postgres.${ref}:${enc}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`],
  ['pool-aws1-use1-tx-6543', `postgresql://postgres.${ref}:${enc}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`],
  ['pool-aws0-sae1-session-5432', `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`],
  ['pool-aws0-sae1-tx-6543', `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`],
  ['pool-aws1-sae1-session-5432', `postgresql://postgres.${ref}:${enc}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`],
  ['pool-aws1-sae1-tx-6543', `postgresql://postgres.${ref}:${enc}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`],
];

for (const [label, url] of candidates) {
  process.stdout.write(`${label} ... `);
  const sql = postgres(url, { max: 1, ssl: 'require', connect_timeout: 8 });
  try {
    await sql`SELECT 1 AS ok`;
    console.log('OK');
    console.log(`\nUse esta variante (${label}):`);
    console.log(`  $env:DATABASE_URL = "<copie do Supabase ou use label ${label}>"`);
    console.log('\nPara aplicar Grãos:');
    console.log('  node scripts/aplicar-graos-044.mjs');
    await sql.end();
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password authentication failed/i.test(msg)) {
      console.log('OK (rede) — senha Postgres incorreta. Reset em Supabase → Database → Reset database password.');
    } else {
      console.log(msg.slice(0, 100));
    }
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

console.error('\nNenhuma conexão funcionou. Use SQL Editor em Edge/Firefox anónimo ou Supabase CLI.');
