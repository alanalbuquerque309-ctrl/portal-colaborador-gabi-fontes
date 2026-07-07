/**
 * Verifica se migrations 067/068/069 de checklists estão aplicadas.
 * Uso: node scripts/verificar-migrations-checklists.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  console.error('Defina DATABASE_URL em .env.local');
  process.exit(2);
}

const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });

function setoresNoCheck(def) {
  const m = String(def ?? '').match(/IN \(([^)]+)\)/i);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
}

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('checklists_operacionais', 'checklists_vistoria_gerencia')
    ORDER BY table_name`;

  const nomes = tables.map((r) => r.table_name);
  console.log('067 checklists_operacionais:', nomes.includes('checklists_operacionais') ? 'OK' : 'FALTA');
  console.log('068 checklists_vistoria_gerencia:', nomes.includes('checklists_vistoria_gerencia') ? 'OK' : 'FALTA');

  if (nomes.includes('checklists_vistoria_gerencia')) {
    const checks = await sql`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'checklists_vistoria_gerencia' AND c.contype = 'c'
      ORDER BY conname`;

    const setorCheck = checks.find((c) => String(c.conname).includes('setor'));
    const setores = setorCheck ? setoresNoCheck(setorCheck.def) : [];
    const esperados = ['estoque', 'asg', 'cozinha', 'balcao', 'caixa'];
    const faltam = esperados.filter((s) => !setores.includes(s));
    const extras = setores.filter((s) => !esperados.includes(s));

    console.log('069 setores no CHECK:', setores.length ? setores.join(', ') : '(nao encontrado)');
    if (faltam.length === 0 && extras.length === 0 && setores.length === 5) {
      console.log('069 balcao+caixa:', 'OK');
    } else if (setores.length === 3 && faltam.includes('balcao') && faltam.includes('caixa')) {
      console.log('069 balcao+caixa:', 'FALTA — rode npm run db:apply-069');
    } else if (faltam.length) {
      console.log('069 balcao+caixa:', `PARCIAL — faltam: ${faltam.join(', ')}`);
    } else {
      console.log('069 balcao+caixa:', 'REVISAR constraint');
    }

    const idx = await sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'checklists_vistoria_gerencia'
      ORDER BY indexname`;
    console.log('Indices vistoria:', idx.map((r) => r.indexname).join(', ') || '(nenhum)');
  }

  if (nomes.includes('checklists_operacionais')) {
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM checklists_operacionais`;
    console.log('Registros em checklists_operacionais:', count);
  }

  if (nomes.includes('checklists_vistoria_gerencia')) {
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM checklists_vistoria_gerencia`;
    console.log('Registros em checklists_vistoria_gerencia:', count);
  }
} catch (e) {
  console.error('ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await sql.end();
}
