/**
 * Auditoria minuciosa Grãos por colaborador (operacao).
 * Uso: node scripts/auditoria-graos-todos-colaboradores.mjs [--nome "Leticia"]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const filtroNome = (() => {
  const i = process.argv.indexOf('--nome');
  return i >= 0 ? process.argv[i + 1]?.trim() : '';
})();

function segundaSemanaSaoPaulo(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  local.setDate(local.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

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
  if (!row) return { elegivel: false, estado: 'aguardando_lider', motivo: 'sem avaliacao' };
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return { elegivel: false, estado: 'aguardando_outro_lider', motivo: 'fora_plantao' };
  if (a === 'ferias') return { elegivel: false, estado: 'ferias', motivo: 'ferias' };
  if (a === 'falta_injustificada') return { elegivel: false, estado: 'inelegivel', motivo: 'falta_injustificada' };
  if (a === 'falta_justificada') return { elegivel: false, estado: 'inelegivel', motivo: 'falta_justificada' };
  if (a === 'presente') {
    for (const k of [
      'nota_pontualidade',
      'nota_vestimenta',
      'nota_trabalho_equipe',
      'nota_desempenho_tarefas',
      'nota_proatividade',
    ]) {
      if (notaBloqueia(row[k])) return { elegivel: false, estado: 'inelegivel', motivo: `nota_baixa:${k}` };
    }
    return { elegivel: true, estado: 'elegivel', motivo: null };
  }
  return { elegivel: false, estado: 'aguardando_lider', motivo: 'indefinido' };
}

async function buscarAvaliacao(colaboradorId, semanaInicio) {
  let data;
  const prim = await sb
    .from('avaliacoes_diarias')
    .select(
      'assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, ignorada, updated_at, avaliador_id'
    )
    .eq('colaborador_id', colaboradorId)
    .eq('data_referencia', semanaInicio)
    .order('updated_at', { ascending: false });
  if (prim.error && /ignorada/i.test(prim.error.message)) {
    const retry = await sb
      .from('avaliacoes_diarias')
      .select(
        'assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, updated_at, avaliador_id'
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
  const ativos = (data ?? []).filter((r) => !r.ignorada);
  const comFechamento = ativos.filter(
    (r) => assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa) !== 'fora_plantao'
  );
  const pool = comFechamento.length > 0 ? comFechamento : ativos;
  pool.sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
  return pool[0] ?? null;
}

function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nomeMatch(cadastro, busca) {
  const a = norm(cadastro);
  const b = norm(busca);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const parts = b.split(/\s+/).filter((p) => p.length > 2);
  return parts.length >= 1 && parts.every((p) => a.includes(p));
}

async function auditarColaborador(c) {
  const { data: movs, error } = await sb
    .from('graos_movimentos')
    .select('id, missao, graos, estado, semana_inicio, descricao, created_at')
    .eq('colaborador_id', c.id)
    .order('created_at', { ascending: false });
  if (error && /graos_movimentos|does not exist/i.test(error.message)) {
    return { colaborador: c, erro: 'tabela ausente' };
  }
  if (error) throw new Error(error.message);

  let confirmado = 0;
  let pendente = 0;
  let canceladoVisivel = 0;
  const porSemana = new Map();

  for (const m of movs ?? []) {
    const g = Number(m.graos) || 0;
    const est = String(m.estado);
    const sem = String(m.semana_inicio ?? '(sem)');
    if (!porSemana.has(sem)) porSemana.set(sem, { confirmado: 0, pendente: 0, cancelado: 0, movs: [] });
    const bucket = porSemana.get(sem);
    bucket.movs.push(m);
    if (g <= 0) continue;
    if (est === 'confirmado') {
      confirmado += g;
      bucket.confirmado += g;
    } else if (est === 'pendente') {
      pendente += g;
      bucket.pendente += g;
    } else if (est === 'cancelado') {
      canceladoVisivel += g;
      bucket.cancelado += g;
    }
  }

  const semAtual = segundaSemanaSaoPaulo();
  const semanasRecentes = [...porSemana.keys()]
    .filter((s) => s !== '(sem)')
    .sort()
    .slice(-6);

  const detalheSemanas = [];
  for (const sem of semanasRecentes) {
    const b = porSemana.get(sem);
    const av = await buscarAvaliacao(c.id, sem);
    const elig = elegivelDeLinha(av);
    detalheSemanas.push({
      semana: sem,
      confirmado: b.confirmado,
      pendente: b.pendente,
      cancelado: b.cancelado,
      elegibilidade: elig,
      tem_avaliacao: Boolean(av),
      assiduidade: av ? assiduidadeDoBanco(av.assiduidade, av.justificativa_nota_baixa) : null,
    });
  }

  const semAtualBucket = porSemana.get(semAtual) ?? { confirmado: 0, pendente: 0, cancelado: 0 };
  const avAtual = await buscarAvaliacao(c.id, semAtual);

  return {
    id: c.id,
    nome: c.nome,
    setor: c.setor,
    unidade_id: c.unidade_id,
    onboarding: c.onboarding_completo,
    saldo_confirmado: confirmado,
    saldo_pendente: pendente,
    saldo_cancelado_historico: canceladoVisivel,
    semana_atual: semAtual,
    semana_atual_graos: semAtualBucket,
    semana_atual_eleg: elegivelDeLinha(avAtual),
    semanas: detalheSemanas,
    flags: [],
  };
}

const semAtual = segundaSemanaSaoPaulo();
console.log(`Auditoria Grãos | semana SP atual: ${semAtual}\n`);

let q = sb.from('colaboradores').select('id, nome, setor, unidade_id, onboarding_completo, role').eq('role', 'colaborador');
const { data: cols, error: errCols } = await q.order('nome');
if (errCols) throw new Error(errCols.message);

const lista = (cols ?? []).filter((c) => !filtroNome || nomeMatch(c.nome, filtroNome));

const resultados = [];
for (const c of lista) {
  resultados.push(await auditarColaborador(c));
}

// Resumo geral
const comPendenteSemAval = [];
const comCanceladoElegivel = [];
const zeradosComMissao = [];
const altoSaldo = [];

for (const r of resultados) {
  if (r.erro) continue;
  if (r.saldo_confirmado >= 30) altoSaldo.push(r);
  if (r.saldo_confirmado === 0 && r.saldo_pendente === 0 && r.saldo_cancelado_historico > 0) {
    zeradosComMissao.push(r);
  }
  for (const s of r.semanas) {
    if (s.pendente > 0 && !s.tem_avaliacao) {
      comPendenteSemAval.push({ nome: r.nome, ...s });
    }
    if (s.cancelado > 0 && s.elegibilidade.elegivel) {
      comCanceladoElegivel.push({ nome: r.nome, ...s });
    }
  }
  if (r.saldo_pendente > 0 && r.semana_atual_eleg.elegivel) {
    comCanceladoElegivel.push({
      nome: r.nome,
      semana: r.semana_atual,
      pendente: r.semana_atual_graos.pendente,
      elegibilidade: r.semana_atual_eleg,
      nota: 'pendente_mas_elegivel_agora',
    });
  }
}

console.log('=== RESUMO GERAL ===');
console.log(`Colaboradores auditados: ${resultados.length}`);
console.log(`Saldo confirmado >= 30: ${altoSaldo.length}`);
console.log(`Zerados mas com cancelados no historico: ${zeradosComMissao.length}`);
console.log(`Semanas pendentes sem avaliacao (recentes): ${comPendenteSemAval.length}`);
console.log(`Cancelado indevido ou pendente elegivel: ${comCanceladoElegivel.length}\n`);

if (altoSaldo.length) {
  console.log('--- Saldo alto (>=30 confirmado) ---');
  for (const r of altoSaldo.sort((a, b) => b.saldo_confirmado - a.saldo_confirmado)) {
    console.log(`  ${r.nome}: ${r.saldo_confirmado} conf | ${r.saldo_pendente} pend | ${r.saldo_cancelado_historico} canc hist`);
    for (const s of r.semanas.filter((x) => x.confirmado > 0 || x.pendente > 0).slice(-4)) {
      console.log(
        `    sem ${s.semana}: +${s.confirmado} conf +${s.pendente} pend | aval=${s.assiduidade ?? '—'} eleg=${s.elegibilidade.estado}`
      );
    }
  }
  console.log('');
}

const foco = ['Leticia', 'Rodrigo Maciel'];
for (const busca of foco) {
  const r = resultados.find((x) => nomeMatch(x.nome, busca));
  if (!r || r.erro) {
    console.log(`--- ${busca}: nao encontrado ---\n`);
    continue;
  }
  console.log(`--- DETALHE: ${r.nome} ---`);
  console.log(`  Saldo: ${r.saldo_confirmado} confirmado | ${r.saldo_pendente} pendente | ${r.saldo_cancelado_historico} cancelado (historico)`);
  console.log(`  Semana atual ${r.semana_atual}: conf=${r.semana_atual_graos.confirmado} pend=${r.semana_atual_graos.pendente} canc=${r.semana_atual_graos.cancelado}`);
  console.log(`  Elegibilidade sem atual: ${r.semana_atual_eleg.estado} (${r.semana_atual_eleg.motivo ?? 'ok'})`);
  for (const s of r.semanas) {
    console.log(
      `  sem ${s.semana}: conf=${s.confirmado} pend=${s.pendente} canc=${s.cancelado} | aval=${s.assiduidade ?? '—'} | ${s.elegibilidade.estado}${s.elegibilidade.motivo ? ' — ' + s.elegibilidade.motivo : ''}`
    );
  }
  const { data: movsSem } = await sb
    .from('graos_movimentos')
    .select('missao, graos, estado, semana_inicio, created_at')
    .eq('colaborador_id', r.id)
    .order('created_at', { ascending: false })
    .limit(25);
  console.log('  Ultimos movimentos:');
  for (const m of movsSem ?? []) {
    console.log(`    ${m.created_at?.slice(0, 10)} sem=${m.semana_inicio} ${m.missao} ${m.graos} ${m.estado}`);
  }
  console.log('');
}

if (comCanceladoElegivel.length) {
  console.log('--- CORRIGIR: cancelado indevido ou pendente+elegivel ---');
  for (const x of comCanceladoElegivel.slice(0, 40)) {
    console.log(
      `  ${x.nome} sem ${x.semana}: pend=${x.pendente ?? '?'} canc=${x.cancelado ?? '?'} | ${x.elegibilidade?.estado}${x.nota ? ' ' + x.nota : ''}`
    );
  }
  if (comCanceladoElegivel.length > 40) console.log(`  ... +${comCanceladoElegivel.length - 40} mais`);
  console.log('');
}

if (zeradosComMissao.length) {
  console.log('--- ZERADOS com historico cancelado (amostra 25) ---');
  for (const r of zeradosComMissao.slice(0, 25)) {
    console.log(`  ${r.nome}: ${r.saldo_cancelado_historico} grãos cancelados no historico`);
  }
  console.log('');
}
