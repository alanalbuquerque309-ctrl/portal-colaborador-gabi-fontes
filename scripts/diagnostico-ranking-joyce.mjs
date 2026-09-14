/**
 * ILI / ranking dos líderes na semana que o portal usa.
 * Uso: node scripts/diagnostico-ranking-joyce.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv() {
  const p = path.join(root, '.env.local');
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
}

function norm(s) {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function roleNorm(role) {
  const r = norm(role);
  if (['admin', 'administrador'].includes(r)) return 'admin';
  if (['gerente', 'chefe', 'chefia', 'lider', 'lideranca', 'master'].includes(r)) return 'gerente';
  if (r === 'rh') return 'rh';
  if (r === 'socio') return 'socio';
  return r || 'colaborador';
}
function homeOffice(tipo) {
  const t = norm(tipo).replace(/[\s_-]+/g, '');
  return t === 'homeoffice' || t === 'remoto' || t === 'teletrabalho';
}
function mediaPilares(r) {
  const vals = [r.n_exemplo ?? r.n_organizacao, r.n_comunicacao ?? r.n_fala_escuta, r.n_suporte ?? r.n_apoio, r.n_justica ?? r.n_organizacao, r.n_clima ?? r.n_ambiente].map(Number);
  const ok = vals.filter((n) => !Number.isNaN(n) && n >= 1 && n <= 5);
  if (!ok.length) return 3;
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}
function notaParaPontos(nota) {
  const c = Math.max(1, Math.min(5, nota));
  return ((c - 1) / 4) * 100;
}
function trimmedMean(values) {
  if (!values.length) return null;
  if (values.length < 5) return values.reduce((a, b) => a + b, 0) / values.length;
  const s = [...values].sort((a, b) => a - b);
  const t = s.slice(1, -1);
  return t.reduce((a, b) => a + b, 0) / t.length;
}

const PESOS = { feedback: 0.4, equipe: 0.3, disciplina: 0.15, treinamentos: 0.1, engajamento: 0.05 };
const FABRICA = ['fabrica de preparos', 'fabrica de doces'];
const BACKOFFICE = ['administracao', 'escritorio', 'cd', 'estoque', 'motorista', 'rh'];

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: unidades } = await sb.from('unidades').select('id, slug');
  const slugPorId = new Map((unidades ?? []).map((u) => [String(u.id), String(u.slug)]));
  const idPorSlug = new Map((unidades ?? []).map((u) => [String(u.slug), String(u.id)]));
  const grupoMesquita = ['mesquita', 'fabrica', 'administrativo'].map((s) => idPorSlug.get(s)).filter(Boolean);

  const { data: cols } = await sb.from('colaboradores').select('id, nome, role, cargo, unidade_id, setor, tipo_escala, onboarding_completo');
  const { data: lps } = await sb.from('lideres_por_setor').select('unidade_id, setor, lider_id, ativo');
  const ativos = (lps ?? []).filter((r) => r.ativo);
  const byId = new Map((cols ?? []).map((c) => [String(c.id), c]));

  const liderIds = new Set();
  for (const r of ativos) liderIds.add(String(r.lider_id));
  for (const c of cols ?? []) {
    const rn = roleNorm(c.role);
    if (rn === 'gerente' || rn === 'admin') liderIds.add(String(c.id));
  }

  function equipeDoLider(liderId) {
    const ids = new Set();
    for (const v of ativos) {
      if (String(v.lider_id) !== liderId) continue;
      const setor = String(v.setor ?? '').trim();
      const nSetor = norm(setor);
      let pool = cols ?? [];
      if (setor === '*') {
        pool = pool.filter((c) => String(c.unidade_id) === String(v.unidade_id));
        const slug = slugPorId.get(String(v.unidade_id));
        if (slug && slug !== 'fabrica') pool = pool.filter((c) => !FABRICA.includes(norm(c.setor)));
      } else if (FABRICA.includes(nSetor)) {
        pool = pool.filter((c) => grupoMesquita.includes(String(c.unidade_id)) && norm(c.setor) === nSetor);
      } else if (BACKOFFICE.includes(nSetor)) {
        pool = pool.filter((c) => norm(c.setor) === nSetor || (nSetor === 'cd' && norm(c.setor) === 'estoque'));
      } else {
        pool = pool.filter((c) => String(c.unidade_id) === String(v.unidade_id) && norm(c.setor) === nSetor);
      }
      for (const c of pool) {
        if (String(c.id) === liderId) continue;
        if (roleNorm(c.role) !== 'colaborador') continue;
        if (homeOffice(c.tipo_escala)) continue;
        ids.add(String(c.id));
      }
    }
    return [...ids].map((id) => byId.get(id)).filter(Boolean);
  }

  const semanaEquipe = '2026-09-07';
  const semanaAnterior = '2026-08-31';
  const semanaFeedbackPortal = '2026-09-14';
  const semanaFeedbackPassada = '2026-09-07';

  const { data: diarias } = await sb
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, media_dia, data_referencia, ignorada')
    .in('data_referencia', [semanaEquipe, semanaAnterior])
    .limit(3000);

  const { data: feedbacks } = await sb
    .from('avaliacoes_lideranca')
    .select('avaliado_id, semana_inicio, n_exemplo, n_comunicacao, n_suporte, n_justica, n_clima')
    .in('semana_inicio', [semanaFeedbackPortal, semanaFeedbackPassada])
    .limit(1000);

  const { data: trofeus } = await sb
    .from('trofeus_entre_pares')
    .select('destinatario_id, semana_inicio')
    .eq('semana_inicio', semanaEquipe)
    .limit(500);

  const avalPorColab = new Map();
  for (const r of diarias ?? []) {
    if (r.ignorada) continue;
    if (String(r.data_referencia) !== semanaEquipe) continue;
    avalPorColab.set(String(r.colaborador_id), r.media_dia != null ? Number(r.media_dia) : null);
  }

  function ili(liderId, semanaFb) {
    const equipe = equipeDoLider(liderId);
    const nEquipe = equipe.length;
    let nAvaliados = 0;
    const medias = [];
    for (const m of equipe) {
      if (avalPorColab.has(String(m.id))) {
        nAvaliados += 1;
        const md = avalPorColab.get(String(m.id));
        if (md != null && !Number.isNaN(md)) medias.push(md);
      }
    }
    const fbs = (feedbacks ?? [])
      .filter((r) => String(r.avaliado_id) === liderId && String(r.semana_inicio) === semanaFb)
      .map(mediaPilares);
    const nFeedback = fbs.length;
    const mediaFeedback = trimmedMean(fbs);
    const mediaEquipe = medias.length ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
    const pctAvaliado = nEquipe > 0 ? nAvaliados / nEquipe : 0;
    const pctTreino = nEquipe > 0 ? equipe.filter((m) => m.onboarding_completo).length / nEquipe : 0;
    let nTrofeus = 0;
    for (const m of equipe) {
      nTrofeus += (trofeus ?? []).filter((t) => String(t.destinatario_id) === String(m.id)).length;
    }
    const motivos = [];
    if (nEquipe < 3) motivos.push('equipe < 3');
    if (pctAvaliado < 0.4) motivos.push(`avaliados ${nAvaliados}/${nEquipe} < 40%`);
    if (nFeedback < 2) motivos.push(`feedbacks ${nFeedback} < 2`);
    const ptsFeedback = mediaFeedback != null ? notaParaPontos(mediaFeedback) : 0;
    const ptsEquipe = mediaEquipe != null ? notaParaPontos(mediaEquipe) : 0;
    const ptsDisciplina = pctAvaliado * 100;
    const ptsTreinamentos = pctTreino * 100;
    const ptsEngajamento = Math.min(nTrofeus / 10, 1) * 100;
    const ili =
      Math.round(
        (ptsFeedback * PESOS.feedback +
          ptsEquipe * PESOS.equipe +
          ptsDisciplina * PESOS.disciplina +
          ptsTreinamentos * PESOS.treinamentos +
          ptsEngajamento * PESOS.engajamento) *
          10
      ) / 10;
    return {
      n_equipe: nEquipe,
      n_avaliados: nAvaliados,
      pct_avaliado: Math.round(pctAvaliado * 100),
      media_equipe: mediaEquipe != null ? Math.round(mediaEquipe * 100) / 100 : null,
      n_feedback: nFeedback,
      media_feedback: mediaFeedback != null ? Math.round(mediaFeedback * 100) / 100 : null,
      pct_portal: Math.round(pctTreino * 100),
      n_trofeus: nTrofeus,
      ili,
      elegivel: motivos.length === 0,
      motivos,
      pts: {
        feedback: Math.round(ptsFeedback * 10) / 10,
        equipe: Math.round(ptsEquipe * 10) / 10,
        disciplina: Math.round(ptsDisciplina * 10) / 10,
        portal: Math.round(ptsTreinamentos * 10) / 10,
        trofeus: Math.round(ptsEngajamento * 10) / 10,
      },
    };
  }

  function ranking(semanaFb) {
    const rows = [];
    for (const id of liderIds) {
      const c = byId.get(id);
      if (!c) continue;
      if (roleNorm(c.role) === 'socio') continue;
      const calc = ili(id, semanaFb);
      rows.push({ nome: c.nome, role: c.role, ...calc });
    }
    rows.sort((a, b) => b.ili - a.ili || a.nome.localeCompare(b.nome, 'pt-BR'));
    return rows.map((r, i) => ({ pos: i + 1, ...r }));
  }

  const portal = ranking(semanaFeedbackPortal);
  const semana07 = ranking(semanaFeedbackPassada);

  const saida = {
    regra: {
      semana_equipe_cobrada: semanaEquipe,
      semana_feedback_no_portal_hoje: semanaFeedbackPortal,
      semana_feedback_se_olhar_semana_passada: semanaFeedbackPassada,
      ranking_publico_so_elegiveis: true,
    },
    ranking_como_o_portal_hoje: portal,
    ranking_com_feedback_da_semana_07: semana07,
    joyce_portal: portal.find((r) => /joyce/i.test(r.nome)),
    joyce_semana_07: semana07.find((r) => /joyce/i.test(r.nome)),
    elegiveis_hoje: portal.filter((r) => r.elegivel).map((r) => ({ pos: r.pos, nome: r.nome, ili: r.ili })),
  };

  fs.writeFileSync(path.join(root, 'scripts', '_snapshots', 'diagnostico-ranking-joyce.json'), JSON.stringify(saida, null, 2));
  console.log(JSON.stringify(saida, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
