/**
 * Atualiza tipo_escala/setor e gera escalas de junho/2026 (documento Folgas de domingo).
 * Uso:
 *   node scripts/aplicar-escalas-junho-2026.mjs           # simulação
 *   node scripts/aplicar-escalas-junho-2026.mjs --confirmar
 * Requer DATABASE_URL em .env.local
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

const ANO = 2026;
const MES = 6;
const CONFIRMAR = process.argv.includes('--confirmar');

const DOMINGOS_JUNHO_2026 = ['2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28'];

const ESCALAS_DOC = [
  { chavesNome: ['miguel'], unidadeSlug: 'mesquita', config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-21'] } },
  { chavesNome: ['ana luiza'], unidadeSlug: 'barra', config: { tipo: '5x2', folgaDiasSemana: [2, 3], domingosFolgaExtras: ['2026-06-07', '2026-06-21'] } },
  { chavesNome: ['leonardo'], unidadeSlug: 'mesquita', config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-28'] } },
  { chavesNome: ['guilherme'], unidadeSlug: 'mesquita', config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-28'] } },
  { chavesNome: ['bianca'], unidadeSlug: 'mesquita', config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-07', '2026-06-21'] } },
  { chavesNome: ['marcella'], unidadeSlug: 'nova-iguacu', config: { tipo: '5x2', folgaDiasSemana: [3, 4], domingosFolgaExtras: ['2026-06-14', '2026-06-28'] } },
  { chavesNome: ['gladys'], unidadeSlug: 'mesquita', config: { tipo: '6x1', folgaDiasSemana: [4], domingosFolgaExtras: ['2026-06-07', '2026-06-21'] } },
  { chavesNome: ['ledilma'], unidadeSlug: 'mesquita', config: { tipo: '6x1', folgaDiasSemana: [3], domingosFolgaExtras: ['2026-06-07', '2026-06-28'] } },
  { chavesNome: ['veronica'], unidadeSlug: 'mesquita', config: { tipo: '6x1', folgaDiasSemana: [4], domingosFolgaExtras: ['2026-06-21'] } },
  { chavesNome: ['luciana'], unidadeSlug: 'mesquita', config: { tipo: '6x1', folgaDiasSemana: [4], domingosFolgaExtras: ['2026-06-21'] } },
  {
    chavesNome: ['tiago'],
    unidadeSlug: 'mesquita',
    setor: 'Administração',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
  {
    chavesNome: ['sabrina'],
    unidadeSlug: 'mesquita',
    setor: 'Fábrica de doces',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
  {
    chavesNome: ['luis henrique', 'luiz henrique'],
    unidadeSlug: 'mesquita',
    setor: 'Fábrica de doces',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
  {
    chavesNome: ['florismar'],
    unidadeSlug: 'mesquita',
    setor: 'Atendimento',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
];

function stripBom(s) {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function loadEnvFile(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    let raw = stripBom(fs.readFileSync(p, 'utf8'));
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  }
  return out;
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
  const fileEnv = loadEnvFile(dir);
  return fileEnv.DATABASE_URL || process.env.DATABASE_URL || null;
}

function norm(nome) {
  return String(nome ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function diasDoMes(ano, mes) {
  const ultimo = new Date(ano, mes, 0).getDate();
  const out = [];
  for (let d = 1; d <= ultimo; d++) {
    out.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

function gerarMes(config) {
  const extras = new Set(config.domingosFolgaExtras ?? []);
  const folgaSemana = new Set(config.folgaDiasSemana ?? []);
  return diasDoMes(ANO, MES).map((dataIso) => {
    const dow = new Date(`${dataIso}T12:00:00`).getDay();
    let folga = false;
    if (config.tipo === '6x1' && config.folgaDomingoSemanal) folga = dow === 0;
    else if (folgaSemana.has(dow)) folga = true;
    if (extras.has(dataIso)) folga = true;
    return { data: dataIso, folga, observacao: folga ? 'Folga' : null };
  });
}

function folgaDiasTexto(config) {
  const map = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };
  if (config.folgaDomingoSemanal) return 'dom';
  return (config.folgaDiasSemana ?? [])
    .map((d) => map[d] ?? '')
    .filter(Boolean)
    .join(',');
}

function acharColaborador(rows, chavesNome) {
  const keys = new Set(chavesNome.map(norm));
  return rows.find((r) => keys.has(norm(r.nome)));
}

async function main() {
  const databaseUrl = readDatabaseUrl(portalRoot);
  if (!databaseUrl) {
    console.error('DATABASE_URL não encontrada em .env.local');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const migPath = path.join(portalRoot, 'supabase', 'migrations', '036_tipo_escala_colaborador.sql');
    if (fs.existsSync(migPath) && CONFIRMAR) {
      const migSql = fs.readFileSync(migPath, 'utf8');
      await sql.unsafe(migSql);
      console.log('Migration 036 aplicada.');
    }

    const cols = await sql`
      SELECT c.id, c.nome, c.setor, c.tipo_escala, u.slug AS unidade_slug
      FROM colaboradores c
      JOIN unidades u ON u.id = c.unidade_id
      WHERE c.role IS NULL OR c.role NOT IN ('socio')
      ORDER BY c.nome
    `;

    console.log(CONFIRMAR ? '=== APLICANDO ===' : '=== SIMULAÇÃO (use --confirmar) ===\n');

    const naoAchados = [];
    const resumo = [];

    for (const perfil of ESCALAS_DOC) {
      const col = acharColaborador(cols, perfil.chavesNome);
      if (!col) {
        naoAchados.push(perfil.chavesNome.join(' / '));
        continue;
      }

      const dias = gerarMes(perfil.config);
      const folgas = dias.filter((d) => d.folga).length;
      const trabalho = dias.length - folgas;
      const setorAntes = col.setor?.trim() || '(vazio)';
      const setorNovo = perfil.setor ?? col.setor;

      console.log(`${col.nome} → ${perfil.config.tipo} | ${trabalho} trabalho / ${folgas} folga em junho`);
      console.log(`   setor: ${setorAntes}${perfil.setor ? ` → ${perfil.setor}` : ''}`);

      if (CONFIRMAR) {
        await sql`
          UPDATE colaboradores SET
            tipo_escala = ${perfil.config.tipo},
            escala_folga_dias = ${folgaDiasTexto(perfil.config)},
            setor = COALESCE(${perfil.setor ?? null}, setor),
            updated_at = now()
          WHERE id = ${col.id}
        `;

        await sql`
          DELETE FROM escalas
          WHERE colaborador_id = ${col.id}
            AND data >= ${`${ANO}-06-01`}
            AND data <= ${`${ANO}-06-30`}
        `;

        const entrada = '08:00';
        const saida = '17:00';
        for (const dia of dias) {
          await sql`
            INSERT INTO escalas (colaborador_id, data, hora_entrada, hora_saida, observacao)
            VALUES (
              ${col.id},
              ${dia.data},
              ${dia.folga ? '00:00' : entrada},
              ${dia.folga ? '00:00' : saida},
              ${dia.observacao}
            )
            ON CONFLICT (colaborador_id, data) DO UPDATE SET
              hora_entrada = EXCLUDED.hora_entrada,
              hora_saida = EXCLUDED.hora_saida,
              observacao = EXCLUDED.observacao
          `;
        }
      }

      resumo.push({ nome: col.nome, tipo: perfil.config.tipo, trabalho, folgas });
    }

    console.log('\n--- Setor dos 4 (6x1 domingo) no cadastro atual ---');
    for (const nome of ['tiago', 'sabrina', 'luis henrique', 'luiz henrique', 'florismar']) {
      const c = cols.find((r) => norm(r.nome).includes(nome.split(' ')[0]) && norm(r.nome).includes(nome.split(' ').pop()));
      const exact = cols.find((r) => norm(r.nome) === nome || norm(r.nome) === nome.replace('luis', 'luiz'));
      const row = exact || c;
      if (row) console.log(`  ${row.nome}: setor="${row.setor?.trim() || '(vazio)'}" unidade=${row.unidade_slug}`);
    }

    if (naoAchados.length) {
      console.log('\n⚠ Não encontrados no portal (conferir grafia):');
      naoAchados.forEach((n) => console.log('  -', n));
    }

    const docIds = new Set();
    for (const perfil of ESCALAS_DOC) {
      const col = acharColaborador(cols, perfil.chavesNome);
      if (col) docIds.add(col.id);
    }
    const outros = cols.filter((c) => !docIds.has(c.id) && c.tipo_escala !== '12x36');
    const sem12 = cols.filter((c) => !docIds.has(c.id));
    console.log(`\nColaboradores fora do documento (ficam sem junho gerado agora): ${sem12.length}`);
    console.log('Próximo passo: marcar tipo_escala=12x36 e gerar quando você enviar o ciclo dia a dia.');

    if (!CONFIRMAR) {
      console.log('\nRode com --confirmar para gravar no banco.');
    } else {
      console.log('\nConcluído. Colaboradores veem em Minha escala (portal).');
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
