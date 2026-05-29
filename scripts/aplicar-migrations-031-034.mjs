/**
 * Aplica migrations 031–034 (presença, liderança, troféus) via DATABASE_URL.
 * Uso na raiz do portal: npm run db:apply-pendentes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

const FILES = [
  '028_justificativa_nota_baixa.sql',
  '031_portal_presenca.sql',
  '032_lideres_por_setor.sql',
  '033_trofeus_entre_pares.sql',
  '034_trofeus_tipos_postura_eficiencia.sql',
  '035_operacao_apto.sql',
];

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
  console.error('Supabase: Project Settings -> Database -> Connection string -> URI (Direct, porta 5432).');
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });

try {
  for (const file of FILES) {
    const sqlPath = path.join(portalRoot, 'supabase', 'migrations', file);
    if (!fs.existsSync(sqlPath)) {
      console.error('Arquivo nao encontrado:', sqlPath);
      process.exit(1);
    }
    let ddl = fs.readFileSync(sqlPath, 'utf8');
    ddl = stripBom(ddl).trim();
    if (!ddl) {
      console.error('SQL vazio:', file);
      process.exit(1);
    }
    console.log(`A aplicar ${file} ...`);
    await client.unsafe(ddl);
    console.log(`OK: ${file}`);
  }
  console.log('Todas as migrations 028, 031–035 aplicadas.');
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  if (/already exists/i.test(msg)) {
    console.error('Algumas partes ja existem; confira no Supabase ou rode ficheiro a ficheiro.');
  }
  console.error('Se falhar com pooler, use URI Direct (porta 5432) em DATABASE_URL.');
  process.exit(1);
} finally {
  await client.end({ timeout: 5 });
}
