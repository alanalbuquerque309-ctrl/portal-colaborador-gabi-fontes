import fs from 'fs';
import path from 'path';

const DEFAULT_POOLER_REGION = 'us-east-1';
const DEFAULT_POOLER_AWS = 'aws-1';

/** Session pooler (IPv4) — evita ETIMEDOUT em redes sem IPv6 estável ao db.*.supabase.co */
export function buildPoolerDatabaseUrl(ref, pwd, region = DEFAULT_POOLER_REGION, awsPrefix = DEFAULT_POOLER_AWS) {
  const enc = encodeURIComponent(pwd);
  return `postgresql://postgres.${ref}:${enc}@${awsPrefix}-${region}.pooler.supabase.com:5432/postgres`;
}

/** Resolve Postgres URI: DATABASE_URL, DIRECT_URL ou SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL */
export function resolveDatabaseUrl(env) {
  const direct = String(env.DATABASE_URL ?? env.DIRECT_URL ?? '').trim();
  if (direct && !direct.includes('SUA_SENHA') && !direct.includes('COLE_A_SENHA')) {
    return direct;
  }

  const pwd = String(env.SUPABASE_DB_PASSWORD ?? env.POSTGRES_PASSWORD ?? '').trim();
  const base = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const ref = base.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  if (!pwd || !ref) return direct || null;

  const region = String(env.SUPABASE_POOLER_REGION ?? DEFAULT_POOLER_REGION).trim();
  const usePooler = String(env.SUPABASE_USE_POOLER ?? '1').trim() !== '0';
  if (usePooler) return buildPoolerDatabaseUrl(ref, pwd, region);

  return `postgresql://postgres:${encodeURIComponent(pwd)}@db.${ref}.supabase.co:5432/postgres`;
}
export function loadEnvFile(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  }
  return out;
}
