/**
 * Diagnóstico do balão de aniversário (Supabase + data BR).
 * Uso: node scripts/diagnostico-aniversario-hoje.mjs
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
  return null;
}

function dataCivilBr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

function aniversarioNoDia(dataNascimento, ref = new Date()) {
  if (!dataNascimento) return false;
  const iso = String(dataNascimento).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const mesNasc = Number(m[2]);
  const diaNasc = Number(m[3]);
  const hoje = dataCivilBr(ref);
  const [, mesStr, diaStr] = hoje.split('-');
  return diaNasc === Number(diaStr) && mesNasc === Number(mesStr);
}

const url = readDatabaseUrl(portalRoot);
if (!url) {
  console.error('DATABASE_URL não encontrada em .env.local');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const hoje = dataCivilBr();
  console.log('=== DIAGNÓSTICO BALÃO ANIVERSÁRIO ===');
  console.log('Data civil BR hoje:', hoje);

  const tabela = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'aniversario_dia_acao'
    ) AS existe
  `;
  console.log('Tabela aniversario_dia_acao:', tabela[0]?.existe ? 'OK' : 'FALTA (rode a migration 041)');

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'colaboradores'
      AND column_name IN ('data_nascimento', 'nome', 'role')
    ORDER BY column_name
  `;
  console.log('Colunas colaboradores:', cols.map((c) => c.column_name).join(', ') || 'nenhuma');

  const todos = await sql`
    SELECT c.id, c.nome, c.role, c.data_nascimento, u.nome AS unidade
    FROM colaboradores c
    LEFT JOIN unidades u ON u.id = c.unidade_id
    WHERE c.data_nascimento IS NOT NULL
    ORDER BY c.nome
  `;

  const doDia = todos.filter((c) => aniversarioNoDia(c.data_nascimento));
  console.log('\nAniversariantes de hoje:', doDia.length);
  for (const c of doDia) {
    console.log(`  - ${c.nome} (${c.role}) · ${c.unidade ?? 'sem unidade'} · nasc ${c.data_nascimento}`);
  }

  const preview = todos.filter(
    (c) =>
      ['socio', 'admin'].includes(String(c.role ?? '').toLowerCase()) ||
      /alan|gabriela/i.test(String(c.nome ?? ''))
  );
  console.log('\nQuem veria no preview (socio/admin ou Alan/Gabi):');
  for (const c of preview.slice(0, 8)) {
    console.log(`  - ${c.nome} (${c.role})`);
  }
  if (preview.length > 8) console.log(`  ... +${preview.length - 8}`);

  if (doDia.length === 0) {
    console.log('\nAVISO: nenhum colaborador com data_nascimento = hoje no banco.');
    console.log('Cadastre data_nascimento no admin ou confira o dia/mês.');
  }

  console.log('\nDeploy: o código do balão ainda precisa estar no GitHub (git push origin main).');
} catch (e) {
  console.error('ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
