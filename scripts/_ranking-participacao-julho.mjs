/**
 * Ranking de participação no portal — julho/2026.
 * Equipe: login + treinos + comunicados + troféus + avaliação de liderança + elogios.
 * Líderes: o mesmo (exceto aval. liderança da equipe) + avaliações da equipe feitas.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      out[t.slice(0, i).trim()] = v;
    }
  }
  return out;
}

function normRole(role) {
  const r = String(role ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!r) return 'colaborador';
  if (['gerente', 'chefe', 'chefia', 'coordenador'].includes(r)) return 'gerente';
  if (r === 'socio' || r === 'master' || r === 'admin' || r === 'rh' || r === 'colaborador') return r;
  return r;
}

function isLider(role) {
  const r = normRole(role);
  return r === 'gerente' || r === 'master' || r === 'rh';
}

function isEquipe(role) {
  return normRole(role) === 'colaborador';
}

const UNIDADES_LOJA = new Set(['barra', 'mesquita', 'nova-iguacu']);
const INI = '2026-07-01T03:00:00.000Z';
const FIM = '2026-08-01T03:00:00.000Z';

const env = readEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cols, error: errCols } = await sb
  .from('colaboradores')
  .select('id, nome, role, setor, unidades(nome, slug)');

if (errCols) {
  console.error(errCols);
  process.exit(1);
}

const byId = new Map();
for (const c of cols ?? []) {
  const un = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
  const slug = un?.slug ?? '';
  byId.set(c.id, {
    id: c.id,
    nome: c.nome,
    role: normRole(c.role),
    roleRaw: c.role,
    setor: c.setor,
    unidade: un?.nome ?? slug,
    slug,
  });
}

const elegiveis = [...byId.values()].filter((c) => UNIDADES_LOJA.has(c.slug));

function scoreBlank(c) {
  return {
    ...c,
    login: 0,
    treinos: 0,
    comunicados: 0,
    trofeusDados: 0,
    trofeusRecebidos: 0,
    avalLideranca: 0,
    elogios: 0,
    avalEquipe: 0,
    pontos: 0,
  };
}

const scores = new Map(elegiveis.map((c) => [c.id, scoreBlank(c)]));

const { data: graos } = await sb
  .from('graos_movimentos')
  .select('colaborador_id, missao, estado, created_at')
  .gte('created_at', INI)
  .lt('created_at', FIM)
  .in('estado', ['pendente', 'confirmado']);

for (const g of graos ?? []) {
  const s = scores.get(g.colaborador_id);
  if (!s) continue;
  if (g.missao === 'login_semana') s.login += 1;
}

const { data: treinos } = await sb
  .from('treinamento_confirmacoes')
  .select('colaborador_id, confirmado_em')
  .gte('confirmado_em', INI)
  .lt('confirmado_em', FIM);

for (const t of treinos ?? []) {
  const s = scores.get(t.colaborador_id);
  if (!s) continue;
  s.treinos += 1;
}

const { data: avisos } = await sb
  .from('aviso_confirmacoes')
  .select('colaborador_id, confirmado_em')
  .gte('confirmado_em', INI)
  .lt('confirmado_em', FIM);

for (const a of avisos ?? []) {
  const s = scores.get(a.colaborador_id);
  if (!s) continue;
  s.comunicados += 1;
}

const { data: trofeus } = await sb
  .from('trofeus_entre_pares')
  .select('de_colaborador_id, para_colaborador_id, created_at')
  .gte('created_at', INI)
  .lt('created_at', FIM);

for (const t of trofeus ?? []) {
  const de = scores.get(t.de_colaborador_id);
  if (de) de.trofeusDados += 1;
  const para = scores.get(t.para_colaborador_id);
  if (para) para.trofeusRecebidos += 1;
}

// Avaliação de liderança (equipe avalia o líder)
const { data: avalLid, error: errAvalLid } = await sb
  .from('avaliacoes_lideranca')
  .select('avaliador_id, created_at, semana_inicio')
  .gte('created_at', INI)
  .lt('created_at', FIM);

if (errAvalLid) {
  console.warn('avaliacoes_lideranca:', errAvalLid.message);
} else {
  for (const a of avalLid ?? []) {
    const s = scores.get(a.avaliador_id);
    if (!s) continue;
    s.avalLideranca += 1;
  }
}

// Elogios enviados (canal sugestões, tipo elogio)
const { data: elogios, error: errElog } = await sb
  .from('sugestoes_reclamacoes')
  .select('colaborador_id, tipo, created_at')
  .eq('tipo', 'elogio')
  .gte('created_at', INI)
  .lt('created_at', FIM);

if (errElog) {
  console.warn('elogios:', errElog.message);
} else {
  for (const e of elogios ?? []) {
    const s = scores.get(e.colaborador_id);
    if (!s) continue;
    s.elogios += 1;
  }
}

// Avaliações da equipe feitas por líderes
const { data: avals, error: errAval } = await sb
  .from('avaliacoes_diarias')
  .select('avaliador_id, created_at, data_referencia')
  .gte('created_at', INI)
  .lt('created_at', FIM);

if (errAval) {
  console.warn('avaliacoes_diarias:', errAval.message);
} else {
  for (const a of avals ?? []) {
    const s = scores.get(a.avaliador_id);
    if (!s) continue;
    s.avalEquipe += 1;
  }
}

for (const s of scores.values()) {
  s.pontos =
    s.login * 3 +
    s.treinos * 4 +
    s.comunicados * 3 +
    s.trofeusDados * 2 +
    s.trofeusRecebidos * 1 +
    s.avalLideranca * 4 +
    s.elogios * 3 +
    (isLider(s.role) ? Math.min(s.avalEquipe, 40) * 0.5 : 0);
}

const equipe = [...scores.values()]
  .filter((s) => isEquipe(s.role))
  .sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.avalLideranca - a.avalLideranca ||
      b.treinos - a.treinos ||
      a.nome.localeCompare(b.nome, 'pt-BR')
  );

const lideres = [...scores.values()]
  .filter((s) => isLider(s.role))
  .sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.avalEquipe - a.avalEquipe ||
      a.nome.localeCompare(b.nome, 'pt-BR')
  );

function line(s, i) {
  const extra = isLider(s.role)
    ? `, avalEq ${s.avalEquipe}`
    : `, avalLid ${s.avalLideranca}, elogio ${s.elogios}`;
  return `${i + 1}. ${s.nome} · ${s.unidade} · ${s.roleRaw} · ${s.pontos.toFixed(1)} pts (login ${s.login}, treino ${s.treinos}, com ${s.comunicados}, troféu↓ ${s.trofeusDados}, troféu↑ ${s.trofeusRecebidos}${extra})`;
}

console.log('=== TOP 5 EQUIPE (3 lojas) — julho/2026 ===');
equipe.slice(0, 5).forEach((s, i) => console.log(line(s, i)));
console.log('\n=== TOP 3 LIDERANÇA (3 lojas) — julho/2026 ===');
lideres.slice(0, 3).forEach((s, i) => console.log(line(s, i)));
console.log('\n--- Próximos equipe (6–12) ---');
equipe.slice(5, 12).forEach((s, i) => console.log(line(s, i + 5)));
console.log('\n--- Próximos líderes (4–8) ---');
lideres.slice(3, 8).forEach((s, i) => console.log(line(s, i + 3)));
console.log(
  '\nPesos: login×3, treino×4, comunicado×3, troféu dado×2, recebido×1, aval. liderança×4, elogio×3; líderes + aval. equipe×0.5 (cap 40)'
);
console.log('Elegíveis lojas:', elegiveis.length, '| equipe:', equipe.length, '| líderes:', lideres.length);
