/**
 * Backfill Grãos: sincroniza missões das últimas semanas com base em avaliações e ações no banco.
 * Uso:
 *   node scripts/backfill-graos-semanas.mjs --semanas=8 --supabase
 *   node scripts/backfill-graos-semanas.mjs --semanas=8   (requer DATABASE_URL)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile, resolveDatabaseUrl } from './lib/resolve-database-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

function segundaSemanaSaoPauloDe(isoDate) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, mo, d] = isoDate.split('-').map(Number);
  const ref = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const parts = fmt.formatToParts(ref);
  const y2 = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo2 = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day2 = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y2, mo2, day2);
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  const ys = local.getFullYear();
  const ms = String(local.getMonth() + 1).padStart(2, '0');
  const ds = String(local.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

function listarSemanas(n) {
  const out = [];
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const hoje = fmt.formatToParts(new Date());
  const y = parseInt(hoje.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(hoje.find((p) => p.type === 'month')?.value ?? '1', 10);
  const day = parseInt(hoje.find((p) => p.type === 'day')?.value ?? '1', 10);
  const isoHoje = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  for (let i = 0; i < n; i++) {
    const ref = new Date(y, mo - 1, day);
    ref.setDate(ref.getDate() - i * 7);
    const iso = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`;
    const seg = segundaSemanaSaoPauloDe(iso || isoHoje);
    if (!out.includes(seg)) out.push(seg);
  }
  return out;
}

function calcularElegivel(avaliacao) {
  if (!avaliacao || avaliacao.assiduidade !== 'presente') return false;
  const notas = [
    avaliacao.nota_pontualidade,
    avaliacao.nota_vestimenta,
    avaliacao.nota_trabalho_equipe,
    avaliacao.nota_desempenho_tarefas,
    avaliacao.nota_proatividade,
  ].filter((n) => n != null);
  return notas.length > 0 && notas.every((n) => Number(n) > 2);
}

function calcularHasFalta(avaliacao) {
  if (!avaliacao) return false;
  if (avaliacao.assiduidade === 'falta_justificada' || avaliacao.assiduidade === 'falta_injustificada') {
    return true;
  }
  if (avaliacao.assiduidade === 'presente') {
    return [
      avaliacao.nota_pontualidade,
      avaliacao.nota_vestimenta,
      avaliacao.nota_trabalho_equipe,
      avaliacao.nota_desempenho_tarefas,
      avaliacao.nota_proatividade,
    ].some((n) => n != null && Number(n) <= 2);
  }
  return false;
}

async function processarColaboradorSemana(ctx, c, semana) {
  const cid = c.id;
  const avaliacao = await ctx.fetchAvaliacao(cid, semana);
  const elegivel = calcularElegivel(avaliacao);
  const hasFalta = calcularHasFalta(avaliacao);

  const upsert = async (missao, graos, refKey, descricao) => {
    if (graos <= 0) return;
    await ctx.upsertMovimento({ colaboradorId: cid, semana, missao, graos, refKey, descricao });
  };

  // Login: só se houve outra ação comprovada na semana (proxy de uso real do portal).
  const nLid = await ctx.countLideranca(cid, semana);
  const nSug = await ctx.countSugestao(cid, semana);
  const nTrof = await ctx.countTrofeus(cid, semana);
  const temAviso = await ctx.temAvisoSemana(cid, semana);
  const teveAtividade = temAviso || nLid > 0 || nSug > 0 || nTrof > 0;

  if (teveAtividade) {
    await upsert('login_semana', 5, `${cid}:login_semana:${semana}`, 'Entrada no portal na semana');
  }

  if (temAviso) {
    await upsert('aviso_semana', 5, `${cid}:aviso_semana:${semana}`, 'Leitura de comunicado');
  }

  if (nLid > 0) await upsert('lideranca_semana', 10, `${cid}:lideranca_semana:${semana}`, 'Avaliar liderança');

  if (nSug > 0) await upsert('sugestao_semana', 3, `${cid}:sugestao_semana:${semana}`, 'Enviar sugestão');

  const gt = nTrof <= 0 ? 0 : nTrof === 1 ? 1 : nTrof === 2 ? 2 : 5;
  if (gt > 0) await upsert('trofeu_semana', gt, `${cid}:trofeu_semana:${semana}`, `Troféus entre pares (${nTrof} enviado(s))`);

  if (!avaliacao) {
    /* mantém pendente */
  } else if (elegivel) {
    await ctx.confirmarPendentes(cid, semana);
  } else if (hasFalta || avaliacao.assiduidade !== 'presente') {
    await ctx.cancelarPendentes(cid, semana);
  }

  const saldo = await ctx.saldoConfirmado(cid);
  if (saldo > 0 || elegivel || !avaliacao) {
    const status = !avaliacao ? 'sem aval.' : elegivel ? 'ok' : 'sem grãos';
    console.log(`  ${c.nome}: ${status} | saldo confirmado ${saldo}`);
  }
}

async function backfillViaPostgres(sql, semanasArg) {
  const semanas = listarSemanas(semanasArg);
  const [{ n: tbl }] = await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'graos_movimentos'`;
  if (!tbl) {
    console.error('Tabela graos_movimentos não existe. Cole supabase/APLIQUE_044_GRAOS_SQL_EDITOR.sql no SQL Editor.');
    process.exit(1);
  }

  const colaboradores = await sql`
    SELECT id, nome FROM colaboradores WHERE role = 'colaborador' ORDER BY nome
  `;

  console.log(`Backfill (Postgres) ${semanas.length} semana(s), ${colaboradores.length} colaborador(es)\n`);

  const ctx = {
    fetchAvaliacao: async (cid, semana) => {
      const [row] = await sql`
        SELECT assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta,
               nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade
        FROM avaliacoes_diarias
        WHERE colaborador_id = ${cid} AND data_referencia = ${semana}::date
        ORDER BY updated_at DESC LIMIT 1
      `;
      return row ?? null;
    },
    upsertMovimento: async ({ colaboradorId, semana, missao, graos, refKey, descricao }) => {
      await sql`
        INSERT INTO graos_movimentos (colaborador_id, semana_inicio, missao, graos, estado, ref_key, descricao)
        VALUES (${colaboradorId}, ${semana}::date, ${missao}, ${graos}, 'pendente', ${refKey}, ${descricao})
        ON CONFLICT (ref_key) DO NOTHING
      `;
    },
    temAvisoSemana: async (cid, semana) => {
      const [row] = await sql`
        SELECT 1 FROM aviso_confirmacoes
        WHERE colaborador_id = ${cid} AND created_at >= ${semana}::date
        LIMIT 1
      `;
      return Boolean(row);
    },
    countLideranca: async (cid, semana) => {
      const [{ n }] = await sql`
        SELECT count(*)::int AS n FROM avaliacoes_lideranca
        WHERE avaliador_id = ${cid} AND semana_inicio = ${semana}::date
      `;
      return n ?? 0;
    },
    countSugestao: async (cid, semana) => {
      const [{ n }] = await sql`
        SELECT count(*)::int AS n FROM sugestoes_reclamacoes
        WHERE colaborador_id = ${cid} AND tipo = 'sugestao' AND created_at >= ${semana}::date
      `;
      return n ?? 0;
    },
    countTrofeus: async (cid, semana) => {
      const [{ n }] = await sql`
        SELECT count(*)::int AS n FROM trofeus_entre_pares
        WHERE avaliador_id = ${cid} AND semana_inicio = ${semana}::date
      `;
      return n ?? 0;
    },
    confirmarPendentes: async (cid, semana) => {
      await sql`
        UPDATE graos_movimentos SET estado = 'confirmado'
        WHERE colaborador_id = ${cid} AND semana_inicio = ${semana}::date AND estado = 'pendente' AND graos > 0
      `;
    },
    cancelarPendentes: async (cid, semana) => {
      await sql`
        UPDATE graos_movimentos SET estado = 'cancelado'
        WHERE colaborador_id = ${cid} AND semana_inicio = ${semana}::date AND estado = 'pendente' AND graos > 0
      `;
    },
    saldoConfirmado: async (cid) => {
      const [{ saldo }] = await sql`
        SELECT coalesce(sum(graos),0)::int AS saldo FROM graos_movimentos
        WHERE colaborador_id = ${cid} AND estado = 'confirmado'
      `;
      return saldo ?? 0;
    },
  };

  for (const semana of semanas) {
    console.log(`--- Semana ${semana} ---`);
    for (const c of colaboradores) {
      await processarColaboradorSemana(ctx, c, semana);
    }
  }
}

async function backfillViaSupabase(supabase, semanasArg) {
  const { error: probeErr } = await supabase.from('graos_catalogo').select('id').limit(1);
  if (probeErr && /does not exist|schema cache/i.test(probeErr.message)) {
    console.error('Tabelas Grãos não existem. Cole supabase/APLIQUE_044_GRAOS_SQL_EDITOR.sql no SQL Editor do Supabase.');
    process.exit(1);
  }
  if (probeErr) throw new Error(probeErr.message);

  const { data: colaboradores, error: colErr } = await supabase
    .from('colaboradores')
    .select('id, nome')
    .eq('role', 'colaborador')
    .order('nome');
  if (colErr) throw new Error(colErr.message);

  const semanas = listarSemanas(semanasArg);
  console.log(`Backfill (Supabase API) ${semanas.length} semana(s), ${colaboradores.length} colaborador(es)\n`);

  const ctx = {
    fetchAvaliacao: async (cid, semana) => {
      const { data } = await supabase
        .from('avaliacoes_diarias')
        .select(
          'assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade'
        )
        .eq('colaborador_id', cid)
        .eq('data_referencia', semana)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    upsertMovimento: async ({ colaboradorId, semana, missao, graos, refKey, descricao }) => {
      const { error } = await supabase.from('graos_movimentos').upsert(
        {
          colaborador_id: colaboradorId,
          semana_inicio: semana,
          missao,
          graos,
          estado: 'pendente',
          ref_key: refKey,
          descricao,
        },
        { onConflict: 'ref_key', ignoreDuplicates: true }
      );
      if (error) throw new Error(error.message);
    },
    temAvisoSemana: async (cid, semana) => {
      const { count } = await supabase
        .from('aviso_confirmacoes')
        .select('aviso_id', { count: 'exact', head: true })
        .eq('colaborador_id', cid)
        .gte('created_at', `${semana}T00:00:00`);
      return (count ?? 0) > 0;
    },
    countLideranca: async (cid, semana) => {
      const { count } = await supabase
        .from('avaliacoes_lideranca')
        .select('id', { count: 'exact', head: true })
        .eq('avaliador_id', cid)
        .eq('semana_inicio', semana);
      return count ?? 0;
    },
    countSugestao: async (cid, semana) => {
      const { count } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id', { count: 'exact', head: true })
        .eq('colaborador_id', cid)
        .eq('tipo', 'sugestao')
        .gte('created_at', `${semana}T00:00:00`);
      return count ?? 0;
    },
    countTrofeus: async (cid, semana) => {
      const { count } = await supabase
        .from('trofeus_entre_pares')
        .select('id', { count: 'exact', head: true })
        .eq('avaliador_id', cid)
        .eq('semana_inicio', semana);
      return count ?? 0;
    },
    confirmarPendentes: async (cid, semana) => {
      const { error } = await supabase
        .from('graos_movimentos')
        .update({ estado: 'confirmado' })
        .eq('colaborador_id', cid)
        .eq('semana_inicio', semana)
        .eq('estado', 'pendente')
        .gt('graos', 0);
      if (error) throw new Error(error.message);
    },
    cancelarPendentes: async (cid, semana) => {
      const { error } = await supabase
        .from('graos_movimentos')
        .update({ estado: 'cancelado' })
        .eq('colaborador_id', cid)
        .eq('semana_inicio', semana)
        .eq('estado', 'pendente')
        .gt('graos', 0);
      if (error) throw new Error(error.message);
    },
    saldoConfirmado: async (cid) => {
      const { data, error } = await supabase
        .from('graos_movimentos')
        .select('graos')
        .eq('colaborador_id', cid)
        .eq('estado', 'confirmado');
      if (error) throw new Error(error.message);
      return (data ?? []).reduce((s, r) => s + Number(r.graos ?? 0), 0);
    },
  };

  for (const semana of semanas) {
    console.log(`--- Semana ${semana} ---`);
    for (const c of colaboradores) {
      await processarColaboradorSemana(ctx, c, semana);
    }
  }
}

const env = { ...loadEnvFile(portalRoot), ...process.env };
const semanasArg = parseInt(process.argv.find((a) => a.startsWith('--semanas='))?.split('=')[1] ?? '8', 10);
const forceSupabase = process.argv.includes('--supabase');
const databaseUrl = forceSupabase ? null : resolveDatabaseUrl(env);
const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

try {
  if (forceSupabase || (!databaseUrl && supabaseUrl && serviceKey)) {
    if (!supabaseUrl || !serviceKey) {
      console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
      process.exit(1);
    }
    await backfillViaSupabase(createClient(supabaseUrl, serviceKey), semanasArg);
  } else if (databaseUrl) {
    const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });
    try {
      await backfillViaPostgres(sql, semanasArg);
    } finally {
      await sql.end();
    }
  } else {
    console.error('Use --supabase (recomendado) ou configure DATABASE_URL.');
    process.exit(1);
  }
  console.log('\nBackfill concluído.');
} catch (e) {
  console.error('Erro:', e instanceof Error ? e.message : e);
  process.exit(1);
}
