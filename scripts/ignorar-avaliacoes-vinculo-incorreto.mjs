/**
 * Ignora avaliações de um avaliador para colaboradores (por nome), sem apagar linhas.
 * Uso: npm run db:ignorar-avaliacoes-vinculo
 *      node scripts/ignorar-avaliacoes-vinculo-incorreto.mjs --confirmar --dry-run
 *
 * Padrão: Silvia → Leandro + Rodrigos (nomes parciais).
 * Requer migration 040 (npm run db:apply-040 ou APLIQUE_040_SQL_EDITOR.sql).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

const MOTIVO =
  'Vínculo de liderança incorreto no cadastro; avaliação não deve compor a média do colaborador.';

const AVALIADOR_NOME = 'silvia';

function stripBom(s) {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function loadEnvFile(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    let raw = fs.readFileSync(p, 'utf8');
    raw = stripBom(raw);
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

function nomeCombina(nome, parte) {
  return String(nome ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .includes(parte);
}

const confirmar = process.argv.includes('--confirmar');
const dryRun = process.argv.includes('--dry-run');
if (!confirmar) {
  console.error('Rode com --confirmar (opcional: --dry-run para só listar).');
  process.exit(1);
}

const fileEnv = loadEnvFile(portalRoot);
const env = { ...fileEnv, ...process.env };
const databaseUrl = String(env.DATABASE_URL ?? '').trim();
const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

async function resolverIdsSupabase(supabase) {
  const { data: todos, error } = await supabase.from('colaboradores').select('id, nome');
  if (error) throw new Error(error.message);

  const avaliadores = (todos ?? []).filter((c) => nomeCombina(c.nome, AVALIADOR_NOME));
  const alvos = (todos ?? []).filter(
    (c) => nomeCombina(c.nome, 'leandro') || nomeCombina(c.nome, 'rodrigo')
  );
  return { avaliadores, alvos };
}

async function listarLinhasSupabase(supabase, avaliadorIds, alvoIds) {
  const { data, error } = await supabase
    .from('avaliacoes_diarias')
    .select(
      'id, data_referencia, media_dia, ignorada, colaborador_id, avaliador_id, colaborador:colaborador_id(nome), avaliador:avaliador_id(nome)'
    )
    .in('avaliador_id', avaliadorIds)
    .in('colaborador_id', alvoIds);

  if (error) {
    if (error.message.toLowerCase().includes('ignorada')) {
      throw new Error(
        'Coluna ignorada ausente. Cole supabase/APLIQUE_040_SQL_EDITOR.sql no SQL Editor do Supabase.'
      );
    }
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((r) => r.ignorada !== true)
    .map((r) => ({
      id: r.id,
      data_referencia: r.data_referencia,
      media_dia: r.media_dia,
      colaborador_nome:
        r.colaborador && typeof r.colaborador === 'object' && 'nome' in r.colaborador
          ? r.colaborador.nome
          : r.colaborador_id,
      avaliador_nome:
        r.avaliador && typeof r.avaliador === 'object' && 'nome' in r.avaliador
          ? r.avaliador.nome
          : r.avaliador_id,
    }));
}

async function ignorarIdsSupabase(supabase, ids) {
  const agora = new Date().toISOString();
  const { data, error } = await supabase
    .from('avaliacoes_diarias')
    .update({
      ignorada: true,
      ignorada_em: agora,
      ignorada_por: null,
      ignorada_motivo: MOTIVO,
      updated_at: agora,
    })
    .in('id', ids)
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

async function runViaPostgres(sql) {
  const avaliadores = await sql`
    SELECT id, nome FROM colaboradores WHERE lower(nome) LIKE ${'%' + AVALIADOR_NOME + '%'}
  `;
  const alvos = await sql`
    SELECT id, nome FROM colaboradores
    WHERE lower(nome) LIKE '%leandro%' OR lower(nome) LIKE '%rodrigo%'
  `;
  if (avaliadores.length === 0) throw new Error('Nenhum avaliador Silvia encontrado.');
  if (alvos.length === 0) throw new Error('Nenhum alvo Leandro/Rodrigo encontrado.');

  const linhas = await sql`
    SELECT a.id, a.data_referencia, a.media_dia,
           c.nome AS colaborador_nome, av.nome AS avaliador_nome
    FROM avaliacoes_diarias a
    JOIN colaboradores c ON c.id = a.colaborador_id
    JOIN colaboradores av ON av.id = a.avaliador_id
    WHERE a.avaliador_id = ANY(${avaliadores.map((a) => a.id)})
      AND a.colaborador_id = ANY(${alvos.map((a) => a.id)})
      AND coalesce(a.ignorada, false) = false
    ORDER BY a.data_referencia DESC, c.nome
  `;

  return { avaliadores, alvos, linhas };
}

async function ignorarViaPostgres(sql, ids) {
  const updated = await sql`
    UPDATE avaliacoes_diarias
    SET ignorada = true, ignorada_em = now(), ignorada_por = NULL,
        ignorada_motivo = ${MOTIVO}, updated_at = now()
    WHERE id = ANY(${ids})
    RETURNING id
  `;
  return updated.length;
}

async function main() {
  let avaliadores;
  let alvos;
  let linhas;

  if (databaseUrl) {
    const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });
    try {
      const hasIgnorada = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'avaliacoes_diarias' AND column_name = 'ignorada'
        LIMIT 1
      `;
      if (hasIgnorada.length === 0) {
        throw new Error('Coluna ignorada ausente. Rode: npm run db:apply-040');
      }
      const res = await runViaPostgres(sql);
      avaliadores = res.avaliadores;
      alvos = res.alvos;
      linhas = res.linhas;
      if (!dryRun && linhas.length > 0) {
        const n = await ignorarViaPostgres(
          sql,
          linhas.map((r) => r.id)
        );
        console.log('Ignoradas:', n);
      }
    } finally {
      await sql.end();
    }
  } else if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const ids = await resolverIdsSupabase(supabase);
    avaliadores = ids.avaliadores;
    alvos = ids.alvos;
    if (avaliadores.length === 0) throw new Error('Nenhum avaliador Silvia encontrado.');
    if (alvos.length === 0) throw new Error('Nenhum alvo Leandro/Rodrigo encontrado.');
    linhas = await listarLinhasSupabase(
      supabase,
      avaliadores.map((a) => a.id),
      alvos.map((a) => a.id)
    );
    if (!dryRun && linhas.length > 0) {
      const n = await ignorarIdsSupabase(
        supabase,
        linhas.map((r) => r.id)
      );
      console.log('Ignoradas:', n);
    }
  } else {
    console.error('Configure DATABASE_URL ou NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('Avaliador(es):', avaliadores.map((a) => `${a.nome} (${a.id})`).join('; '));
  console.log('Alvos:', alvos.map((a) => `${a.nome} (${a.id})`).join('; '));
  console.log('Linhas a ignorar:', linhas.length);
  for (const r of linhas) {
    console.log(
      `  ${r.data_referencia} | ${r.colaborador_nome} | ${r.avaliador_nome} | média ${r.media_dia ?? '—'} | ${r.id}`
    );
  }
  if (linhas.length === 0) console.log('Nada a fazer.');
  else if (dryRun) console.log('--dry-run: nenhuma alteração gravada.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
