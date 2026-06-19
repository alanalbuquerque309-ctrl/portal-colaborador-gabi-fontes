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
  return (data ?? []).find((r) => !r.ignorada) ?? (data ?? [])[0] ?? null;
}

async function processarColaborador(colaboradorId, nome) {
  const { data: pendentes, error } = await sb
    .from('graos_movimentos')
    .select('id, semana_inicio, graos, missao')
    .eq('colaborador_id', colaboradorId)
    .eq('estado', 'pendente')
    .gt('graos', 0);
  if (error) throw new Error(error.message);
  if (!pendentes?.length) return { confirmados: 0, cancelados: 0, semAval: 0 };

  const porSemana = new Map();
  for (const p of pendentes) {
    const sem = String(p.semana_inicio);
    if (!porSemana.has(sem)) porSemana.set(sem, []);
    porSemana.get(sem).push(p);
  }

  let confirmados = 0;
  let cancelados = 0;
  let semAval = 0;

  for (const [sem, movs] of porSemana) {
    const av = await buscarAvaliacao(colaboradorId, sem);
    const { elegivel, motivo } = elegivelDeLinha(av);
    const graos = movs.reduce((s, m) => s + Number(m.graos), 0);
    if (!av && motivo === 'sem avaliacao') {
      semAval += movs.length;
      console.log(
        `  ${nome} | sem ${sem} | ${movs.length} mov(s) ${graos} grãos → aguardando (sem avaliação)`
      );
      continue;
    }
    const novo = elegivel ? 'confirmado' : 'cancelado';
    console.log(
      `  ${nome} | sem ${sem} | ${movs.length} mov(s) ${graos} grãos → ${novo}${av ? '' : ' (sem avaliação)'}${motivo && !elegivel ? ` (${motivo})` : ''}`
    );
    if (confirmar) {
      const ids = movs.map((m) => m.id);
      const { error: updErr } = await sb.from('graos_movimentos').update({ estado: novo }).in('id', ids);
      if (updErr) throw new Error(updErr.message);
    }
    if (novo === 'confirmado') confirmados += graos;
    else cancelados += graos;
  }

  return { confirmados, cancelados, semAval };
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

for (const c of colaboradores ?? []) {
  const r = await processarColaborador(c.id, c.nome);
  totConf += r.confirmados;
  totCanc += r.cancelados;
  totSemAval += r.semAval;
}

console.log(`\nTotal: ${totConf} grãos confirmados | ${totCanc} cancelados | ${totSemAval} mov. sem avaliação`);
