/**
 * Ajuste de arranque do piloto de Grãos (semana 15/06).
 * Regras desta rodada (one-off):
 *  - Elegibilidade usa a avaliação que o líder FEZ nesta semana (created_at >= 15/06),
 *    independentemente do data_referencia (a avaliação padrão referencia a semana anterior).
 *  - Login (5) só vale para quem REALMENTE entrou no portal (emocional_registro/presença/ação).
 *  - Elegível -> confirma pendentes; falta/nota baixa -> cancela; fora do plantão / sem
 *    avaliação recente -> mantém pendente (aguardando).
 * Uso: node scripts/kickoff-graos-piloto.mjs [--confirmar]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const SEM = '2026-06-15';
const SEM_INI_UTC = '2026-06-15T03:00:00.000Z';
const SEM_FIM_UTC = '2026-06-22T03:00:00.000Z';
const confirmar = process.argv.includes('--confirmar');

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const JUST_FORA = 'Fora do plantão deste líder (outro líder avalia nesta semana).';
const JUST_FERIAS = 'Colaborador de férias nesta semana (não entra na média).';

function assiduidade(stored, just) {
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
function elegivelDeLinha(row) {
  if (!row) return { elegivel: false, motivo: 'sem_avaliacao' };
  const a = assiduidade(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return { elegivel: false, motivo: 'fora_plantao' };
  if (a === 'ferias') return { elegivel: false, motivo: 'ferias' };
  if (a === 'falta_injustificada') return { elegivel: false, motivo: 'falta_injustificada' };
  if (a === 'falta_justificada') return { elegivel: false, motivo: 'falta_justificada' };
  for (const k of ['nota_pontualidade', 'nota_vestimenta', 'nota_trabalho_equipe', 'nota_desempenho_tarefas', 'nota_proatividade']) {
    if (notaBloqueia(row[k])) return { elegivel: false, motivo: 'nota_baixa' };
  }
  return { elegivel: true, motivo: null };
}

/** Avaliação que o líder fez NESTA semana (created_at >= 15/06), preferindo fechamento. */
async function avaliacaoFeitaNaSemana(cid) {
  const cols = 'assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, updated_at, created_at';
  let { data, error } = await sb
    .from('avaliacoes_diarias')
    .select(`${cols}, ignorada`)
    .eq('colaborador_id', cid)
    .gte('created_at', SEM_INI_UTC)
    .lt('created_at', SEM_FIM_UTC)
    .order('updated_at', { ascending: false });
  if (error && /ignorada/i.test(error.message)) {
    ({ data, error } = await sb
      .from('avaliacoes_diarias')
      .select(cols)
      .eq('colaborador_id', cid)
      .gte('created_at', SEM_INI_UTC)
      .lt('created_at', SEM_FIM_UTC)
      .order('updated_at', { ascending: false }));
  }
  if (error) throw new Error(error.message);
  const ativos = (data ?? []).filter((r) => !r.ignorada);
  if (!ativos.length) return null;
  const comFech = ativos.filter((r) => assiduidade(r.assiduidade, r.justificativa_nota_baixa) !== 'fora_plantao');
  return (comFech.length ? comFech : ativos)[0];
}

async function entrouNoPortal(cid) {
  const { data: emo } = await sb.from('emocional_registro').select('data').eq('colaborador_id', cid).gte('data', SEM).limit(1);
  if (emo?.length) return 'emocional';
  const { data: pres } = await sb.from('portal_presenca').select('ultimo_ping_at').eq('colaborador_id', cid).gte('ultimo_ping_at', SEM_INI_UTC).limit(1);
  if (pres?.length) return 'presenca';
  const { count: av } = await sb.from('aviso_confirmacoes').select('aviso_id', { count: 'exact', head: true }).eq('colaborador_id', cid).gte('confirmado_em', SEM_INI_UTC).lt('confirmado_em', SEM_FIM_UTC);
  if ((av ?? 0) > 0) return 'aviso';
  const { count: lid } = await sb.from('avaliacoes_lideranca').select('id', { count: 'exact', head: true }).eq('avaliador_id', cid).eq('semana_inicio', SEM);
  if ((lid ?? 0) > 0) return 'lideranca';
  const { count: trf } = await sb.from('trofeus_entre_pares').select('id', { count: 'exact', head: true }).eq('avaliador_id', cid).eq('semana_inicio', SEM);
  if ((trf ?? 0) > 0) return 'trofeu';
  return null;
}

const { data: cols, error: errC } = await sb.from('colaboradores').select('id, nome').eq('role', 'colaborador').order('nome');
if (errC) throw new Error(errC.message);

console.log(confirmar ? '=== APLICAR kickoff Grãos piloto ===\n' : '=== Dry-run kickoff (use --confirmar) ===\n');

let totConf = 0, totCancLogin = 0, totCancIneleg = 0, totPend = 0;
const aplicar = [];

for (const c of cols ?? []) {
  const { data: movs } = await sb
    .from('graos_movimentos')
    .select('id, missao, graos, estado')
    .eq('colaborador_id', c.id)
    .eq('semana_inicio', SEM)
    .in('estado', ['pendente', 'cancelado'])
    .gt('graos', 0)
    .not('missao', 'in', '("debito_resgate","ajuste_rh")');
  if (!movs?.length) continue;

  const entrada = await entrouNoPortal(c.id);
  const av = await avaliacaoFeitaNaSemana(c.id);
  const elig = elegivelDeLinha(av);

  let confirma = 0, cancelaLogin = 0, cancelaIneleg = 0, mantemPend = 0;
  for (const m of movs) {
    const g = Number(m.graos) || 0;
    if (m.missao === 'login_semana' && !entrada) {
      if (m.estado !== 'cancelado') aplicar.push({ id: m.id, novo: 'cancelado', motivo: 'nao_entrou' });
      cancelaLogin += g;
      continue;
    }
    if (elig.elegivel) {
      if (m.estado !== 'confirmado') aplicar.push({ id: m.id, novo: 'confirmado' });
      confirma += g;
    } else if (['falta_injustificada', 'falta_justificada', 'nota_baixa'].includes(elig.motivo)) {
      if (m.estado !== 'cancelado') aplicar.push({ id: m.id, novo: 'cancelado', motivo: elig.motivo });
      cancelaIneleg += g;
    } else {
      mantemPend += g; // fora_plantao / sem_avaliacao / ferias -> aguarda
    }
  }

  totConf += confirma; totCancLogin += cancelaLogin; totCancIneleg += cancelaIneleg; totPend += mantemPend;
  const status = elig.elegivel ? 'ELEGÍVEL' : `inelegível:${elig.motivo}`;
  console.log(`${c.nome} | entrada=${entrada ?? 'NÃO'} | aval=${av ? assiduidade(av.assiduidade, av.justificativa_nota_baixa) : '—'} ${status} | confirma=${confirma} cancLogin=${cancelaLogin} cancIneleg=${cancelaIneleg} pend=${mantemPend}`);
}

console.log(`\nTotais: confirmar=${totConf} | cancelar login(não entrou)=${totCancLogin} | cancelar inelegível=${totCancIneleg} | mantém pendente=${totPend}`);
console.log(`Operações no banco: ${aplicar.length}`);

if (confirmar && aplicar.length) {
  const porNovo = new Map();
  for (const a of aplicar) {
    const key = a.novo === 'confirmado' ? 'confirmado' : `cancelado:${a.motivo}`;
    if (!porNovo.has(key)) porNovo.set(key, []);
    porNovo.get(key).push(a.id);
  }
  for (const [key, ids] of porNovo) {
    const novo = key.startsWith('cancelado') ? 'cancelado' : 'confirmado';
    const motivo = key.includes(':') ? key.split(':')[1] : null;
    for (let i = 0; i < ids.length; i += 100) {
      const slice = ids.slice(i, i + 100);
      const patch = { estado: novo };
      if (novo === 'cancelado') patch.meta = { ajuste_sistema: `kickoff_${motivo ?? 'inelegivel'}`, oculto_colaborador: true };
      const { error } = await sb.from('graos_movimentos').update(patch).in('id', slice);
      if (error) throw new Error(error.message);
    }
  }
  console.log('Aplicado.');
}
