/**
 * Compara saldo confirmado vs esperado (semana 15/06) para todos colaboradores.
 * Uso: node scripts/auditoria-graos-saldo-esperado.mjs [--nome Tiago]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const SEM = '2026-06-15';
const SEM_INI = '2026-06-15T03:00:00.000Z';
const SEM_FIM = '2026-06-22T03:00:00.000Z';
const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const filtro = (() => {
  const i = process.argv.indexOf('--nome');
  return i >= 0 ? process.argv[i + 1]?.trim().toLowerCase() : '';
})();

const JUST_FORA = 'Fora do plantão deste líder (outro líder avalia nesta semana).';
const JUST_FERIAS = 'Colaborador de férias nesta semana (não entra na média).';

function assid(stored, just) {
  const s = String(stored ?? '').trim();
  const j = String(just ?? '').trim();
  if (s === 'falta_justificada' && j === JUST_FORA) return 'fora_plantao';
  if (s === 'falta_justificada' && j === JUST_FERIAS) return 'ferias';
  if (['presente', 'falta_injustificada', 'falta_justificada'].includes(s)) return s;
  return 'presente';
}
function notaBloqueia(n) {
  return n != null && !Number.isNaN(Number(n)) && Number(n) <= 2;
}
function elegivel(row) {
  if (!row) return false;
  const a = assid(row.assiduidade, row.justificativa_nota_baixa);
  if (a !== 'presente') return false;
  for (const k of ['nota_pontualidade', 'nota_vestimenta', 'nota_trabalho_equipe', 'nota_desempenho_tarefas', 'nota_proatividade']) {
    if (notaBloqueia(row[k])) return false;
  }
  return true;
}

async function avaliacaoFeitaNaSemana(cid) {
  const { data } = await sb
    .from('avaliacoes_diarias')
    .select('assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, ignorada, updated_at, created_at')
    .eq('colaborador_id', cid)
    .gte('created_at', SEM_INI)
    .lt('created_at', SEM_FIM)
    .order('updated_at', { ascending: false });
  const ativos = (data ?? []).filter((r) => !r.ignorada);
  const comFech = ativos.filter((r) => assid(r.assiduidade, r.justificativa_nota_baixa) !== 'fora_plantao');
  return (comFech.length ? comFech : ativos)[0] ?? null;
}

async function entrouNoPortal(cid) {
  const { data: emo } = await sb.from('emocional_registro').select('data').eq('colaborador_id', cid).gte('data', SEM).limit(1);
  if (emo?.length) return true;
  const { data: pres } = await sb.from('portal_presenca').select('ultimo_ping_at').eq('colaborador_id', cid).gte('ultimo_ping_at', SEM_INI).limit(1);
  if (pres?.length) return true;
  const { count: av } = await sb.from('aviso_confirmacoes').select('id', { count: 'exact', head: true }).eq('colaborador_id', cid).gte('confirmado_em', SEM_INI).lt('confirmado_em', SEM_FIM);
  if ((av ?? 0) > 0) return true;
  const { count: lid } = await sb.from('avaliacoes_lideranca').select('id', { count: 'exact', head: true }).eq('avaliador_id', cid).eq('semana_inicio', SEM);
  if ((lid ?? 0) > 0) return true;
  const { count: trf } = await sb.from('trofeus_entre_pares').select('id', { count: 'exact', head: true }).eq('avaliador_id', cid).eq('semana_inicio', SEM);
  if ((trf ?? 0) > 0) return true;
  return false;
}

async function calcularEsperado(cid) {
  const av = await avaliacaoFeitaNaSemana(cid);
  const elig = elegivel(av);
  const entrada = await entrouNoPortal(cid);

  let conf = 0;
  let pend = 0;
  const linhas = [];

  const add = (missao, g, ok) => {
    if (g <= 0) return;
    linhas.push({ missao, g, ok: ok ? 'conf' : 'pend' });
    if (ok) conf += g;
    else pend += g;
  };

  if (entrada) add('login_semana', 5, elig);
  const { count: aviso } = await sb.from('aviso_confirmacoes').select('id', { count: 'exact', head: true }).eq('colaborador_id', cid).gte('confirmado_em', SEM_INI).lt('confirmado_em', SEM_FIM);
  if ((aviso ?? 0) > 0) add('aviso_semana', 5, elig);
  const { count: lid } = await sb.from('avaliacoes_lideranca').select('id', { count: 'exact', head: true }).eq('avaliador_id', cid).eq('semana_inicio', SEM);
  if ((lid ?? 0) > 0) add('lideranca_semana', 10, elig);
  const { count: trof } = await sb.from('trofeus_entre_pares').select('id', { count: 'exact', head: true }).eq('avaliador_id', cid).eq('semana_inicio', SEM);
  const gTrof = (trof ?? 0) >= 3 ? 5 : trof ?? 0;
  if (gTrof > 0) add('trofeu_semana', gTrof, elig);
  const { count: sug } = await sb.from('sugestoes_reclamacoes').select('id', { count: 'exact', head: true }).eq('colaborador_id', cid).eq('tipo', 'sugestao').gte('created_at', SEM_INI).lt('created_at', SEM_FIM);
  if ((sug ?? 0) > 0) add('sugestao_semana', 1, elig);
  const { data: qConc } = await sb.from('graos_quinta_conclusoes').select('data_quinta').eq('colaborador_id', cid).gte('data_quinta', SEM).limit(5);
  if ((qConc ?? []).length > 0) add('quinta', 5, elig);

  // Bônus resposta gestão: maior bônus respondido na semana (1 por semana)
  const { data: sugsResp } = await sb
    .from('sugestoes_reclamacoes')
    .select('graos_destaque_em, graos_resposta_bonus')
    .eq('colaborador_id', cid)
    .eq('tipo', 'sugestao')
    .gte('created_at', SEM_INI)
    .lt('created_at', SEM_FIM)
    .not('graos_destaque_em', 'is', null);
  let bonusMax = 0;
  for (const s of sugsResp ?? []) {
    const b = Number(s.graos_resposta_bonus ?? 0) || (s.graos_destaque_em ? 7 : 0);
    if (b > bonusMax) bonusMax = b;
  }
  if (bonusMax > 0) add('sugestao_destaque', bonusMax, elig);

  // Pendentes extras: resposta admin ainda não confirmada elegibilidade
  const { data: movsPend } = await sb
    .from('graos_movimentos')
    .select('missao, graos, estado')
    .eq('colaborador_id', cid)
    .eq('semana_inicio', SEM)
    .eq('estado', 'pendente')
    .gt('graos', 0);
  const pendDb = (movsPend ?? []).reduce((s, m) => s + Number(m.graos), 0);

  return { conf, pend, linhas, elig, entrada, pendDb, av: av ? assid(av.assiduidade, av.justificativa_nota_baixa) : null };
}

function saldoDb(movs) {
  let conf = 0;
  let pend = 0;
  const det = [];
  for (const m of movs) {
    const g = Number(m.graos) || 0;
    if (m.estado === 'confirmado') {
      conf += g;
      if (g !== 0) det.push(`${m.missao}:${g}`);
    } else if (m.estado === 'pendente' && g > 0) det.push(`${m.missao}:${g}(pend)`);
    if (m.estado === 'pendente' && g > 0) pend += g;
  }
  return { conf, pend, det };
}

const { data: cols } = await sb.from('colaboradores').select('id, nome').eq('role', 'colaborador').order('nome');
const lista = (cols ?? []).filter((c) => !filtro || c.nome.toLowerCase().includes(filtro));

console.log(`Auditoria saldo esperado | semana ${SEM}\n`);

const divergentes = [];

for (const c of lista) {
  const { data: movs } = await sb
    .from('graos_movimentos')
    .select('missao, graos, estado, descricao, semana_inicio')
    .eq('colaborador_id', c.id)
    .gte('semana_inicio', SEM)
    .neq('estado', 'cancelado');

  const db = saldoDb(movs ?? []);
  const esp = await calcularEsperado(c.id);
  const deltaConf = db.conf - esp.conf;
  const deltaPend = db.pend - esp.pend;

  if (deltaConf !== 0 || deltaPend !== 0 || filtro) {
    console.log(`--- ${c.nome} ---`);
    console.log(`  DB:     ${db.conf} conf | ${db.pend} pend`);
    console.log(`  Esperado: ${esp.conf} conf | ${esp.pend} pend (eleg=${esp.elig}, aval=${esp.av ?? '—'}, entrou=${esp.entrada})`);
    if (deltaConf !== 0 || deltaPend !== 0) {
      console.log(`  DELTA: conf ${deltaConf >= 0 ? '+' : ''}${deltaConf} | pend ${deltaPend >= 0 ? '+' : ''}${deltaPend}`);
      divergentes.push({ nome: c.nome, deltaConf, deltaPend });
    }
    console.log(`  DB det: ${db.det.join(', ')}`);
    console.log(`  Esp:    ${esp.linhas.map((l) => `${l.missao}:${l.g}(${l.ok})`).join(', ')}`);
    console.log('');
  }
}

console.log(`\n=== RESUMO: ${divergentes.length} divergências ===`);
for (const d of divergentes.sort((a, b) => Math.abs(b.deltaConf) - Math.abs(a.deltaConf)).slice(0, 25)) {
  console.log(`  ${d.nome}: conf ${d.deltaConf >= 0 ? '+' : ''}${d.deltaConf}, pend ${d.deltaPend >= 0 ? '+' : ''}${d.deltaPend}`);
}
