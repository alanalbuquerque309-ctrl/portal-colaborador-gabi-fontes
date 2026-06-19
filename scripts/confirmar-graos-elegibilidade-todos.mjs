/**
 * Confirma (ou cancela) Grãos pendentes conforme avaliação da semana.
 * Uso: node scripts/confirmar-graos-elegibilidade-todos.mjs [--confirmar]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const confirmar = process.argv.includes('--confirmar');
const CORTE = '2026-06-15';

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const JUSTIFICATIVA_FORA_PLANTAO =
  'Fora do plantão deste líder (outro líder avalia nesta semana).';
const JUSTIFICATIVA_FERIAS = 'Colaborador de férias nesta semana (não entra na média).';

function assiduidadeDoBanco(stored, justificativa) {
  const s = String(stored ?? '').trim();
  const j = String(justificativa ?? '').trim();
  if (s === 'falta_justificada' && j === JUSTIFICATIVA_FORA_PLANTAO) return 'fora_plantao';
  if (s === 'falta_justificada' && j === JUSTIFICATIVA_FERIAS) return 'ferias';
  if (s === 'presente' || s === 'falta_injustificada' || s === 'falta_justificada') return s;
  return 'presente';
}

function notaBloqueia(n) {
  if (n == null || Number.isNaN(Number(n))) return false;
  return Number(n) <= 2;
}

function elegivelDeLinha(row) {
  if (!row) return { elegivel: false, motivo: 'sem avaliacao' };
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return { elegivel: false, motivo: 'fora_plantao' };
  if (a === 'ferias') return { elegivel: false, motivo: 'ferias' };
  if (a === 'falta_injustificada' || a === 'falta_justificada') return { elegivel: false, motivo: a };
  if (a === 'presente') {
    for (const k of [
      'nota_pontualidade',
      'nota_vestimenta',
      'nota_trabalho_equipe',
      'nota_desempenho_tarefas',
      'nota_proatividade',
    ]) {
      if (notaBloqueia(row[k])) return { elegivel: false, motivo: 'nota_baixa' };
    }
    return { elegivel: true, motivo: null };
  }
  return { elegivel: false, motivo: 'aguardando' };
}

function escolherAvaliacaoParaGraos(rows) {
  const ativos = (rows ?? []).filter((r) => !r.ignorada);
  if (!ativos.length) return null;
  const comFechamento = ativos.filter((r) => assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa) !== 'fora_plantao');
  const pool = comFechamento.length > 0 ? comFechamento : ativos;
  pool.sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
  return pool[0] ?? null;
}

async function buscarAvaliacao(colaboradorId, semanaInicio) {
  let data;
  const prim = await sb
    .from('avaliacoes_diarias')
    .select(
      'assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, ignorada, updated_at'
    )
    .eq('colaborador_id', colaboradorId)
    .eq('data_referencia', semanaInicio)
    .order('updated_at', { ascending: false });
  if (prim.error && /ignorada/i.test(prim.error.message)) {
    const retry = await sb
      .from('avaliacoes_diarias')
      .select(
        'assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, updated_at'
      )
      .eq('colaborador_id', colaboradorId)
      .eq('data_referencia', semanaInicio)
      .order('updated_at', { ascending: false });
    if (retry.error) throw new Error(retry.error.message);
    data = retry.data;
  } else {
    if (prim.error) throw new Error(prim.error.message);
    data = prim.data;
  }
  return escolherAvaliacaoParaGraos(data ?? []);
}

async function processarColaborador(colaboradorId, nome) {
  const { data: movs, error } = await sb
    .from('graos_movimentos')
    .select('id, semana_inicio, graos, missao, estado')
    .eq('colaborador_id', colaboradorId)
    .in('estado', ['pendente', 'cancelado'])
    .gt('graos', 0)
    .not('missao', 'in', '("debito_resgate","ajuste_rh")');
  if (error) throw new Error(error.message);
  if (!movs?.length) return { confirmados: 0, cancelados: 0, semAval: 0, reconfirmados: 0 };

  const porSemana = new Map();
  for (const p of movs) {
    const sem = String(p.semana_inicio);
    if (!porSemana.has(sem)) porSemana.set(sem, []);
    porSemana.get(sem).push(p);
  }

  let confirmados = 0;
  let cancelados = 0;
  let semAval = 0;
  let reconfirmados = 0;

  for (const [sem, movsSem] of porSemana) {
    if (sem < CORTE) continue;
    const av = await buscarAvaliacao(colaboradorId, sem);
    const { elegivel, motivo } = elegivelDeLinha(av);
    const graos = movsSem.reduce((s, m) => s + Number(m.graos), 0);
    const tinhaCancelado = movsSem.some((m) => m.estado === 'cancelado');
    if (!av && motivo === 'sem avaliacao') {
      semAval += movsSem.filter((m) => m.estado === 'pendente').length;
      console.log(
        `  ${nome} | sem ${sem} | ${movsSem.length} mov(s) ${graos} grãos → aguardando (sem avaliação)`
      );
      continue;
    }
    const novo = elegivel ? 'confirmado' : 'cancelado';
    const tag = tinhaCancelado && elegivel ? ' (reconfirma cancelados)' : '';
    console.log(
      `  ${nome} | sem ${sem} | ${movsSem.length} mov(s) ${graos} grãos → ${novo}${tag}${motivo && !elegivel ? ` (${motivo})` : ''}`
    );
    if (confirmar) {
      const ids = movsSem.map((m) => m.id);
      const { error: updErr } = await sb.from('graos_movimentos').update({ estado: novo }).in('id', ids);
      if (updErr) throw new Error(updErr.message);
    }
    if (novo === 'confirmado') {
      confirmados += graos;
      if (tinhaCancelado) reconfirmados += graos;
    } else cancelados += graos;
  }

  return { confirmados, cancelados, semAval, reconfirmados };
}

const { data: colaboradores, error: errColab } = await sb
  .from('colaboradores')
  .select('id, nome')
  .eq('role', 'colaborador')
  .order('nome');
if (errColab) throw new Error(errColab.message);

console.log(confirmar ? '=== APLICAR elegibilidade Grãos ===\n' : '=== Dry-run (use --confirmar) ===\n');

let totConf = 0;
let totCanc = 0;
let totSemAval = 0;
let totReconf = 0;

for (const c of colaboradores ?? []) {
  const r = await processarColaborador(c.id, c.nome);
  totConf += r.confirmados;
  totCanc += r.cancelados;
  totSemAval += r.semAval;
  totReconf += r.reconfirmados;
}

console.log(
  `\nTotal: ${totConf} grãos confirmados (${totReconf} reconfirmados de cancelados) | ${totCanc} cancelados | ${totSemAval} mov. sem avaliação`
);
