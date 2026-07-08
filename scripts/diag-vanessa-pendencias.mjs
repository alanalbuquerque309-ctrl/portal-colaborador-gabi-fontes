/**
 * Diagnóstico: Vanessa / Nova Iguaçu — avaliações vs pendências.
 * Uso: node scripts/diag-vanessa-pendencias.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam credenciais Supabase');
  process.exit(1);
}

const supabase = createClient(url, key);

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
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

function semanaAnterior(seg) {
  const [y, m, d] = seg.split('-').map((x) => parseInt(x, 10));
  const local = new Date(y, (m || 1) - 1, d || 1);
  local.setDate(local.getDate() - 7);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

const semanaAtual = segundaSemanaSaoPaulo();
const semanaPassada = semanaAnterior(semanaAtual);

const { data: unidade } = await supabase.from('unidades').select('id').eq('slug', 'nova-iguacu').maybeSingle();
const uid = unidade?.id;

const { data: lideres } = await supabase
  .from('colaboradores')
  .select('id, nome, role, unidade_id, onboarding_completo')
  .or('nome.ilike.Vanessa%,nome.ilike.Nathalia%,nome.ilike.Joyce%');

const { data: lps } = await supabase
  .from('lideres_por_setor')
  .select('lider_id, unidade_id, setor, ativo, plantao_paridade, colaboradores(nome), unidades(slug)')
  .eq('ativo', true)
  .eq('setor', '*');

const lpsNi = (lps ?? []).filter((r) => {
  const u = Array.isArray(r.unidades) ? r.unidades[0] : r.unidades;
  return u?.slug === 'nova-iguacu';
});

const vanessa = (lideres ?? []).find((l) => String(l.nome).toLowerCase().includes('vanessa'));

let vanessaAvals = { passada: 0, atual: 0, ids: [] };
if (vanessa?.id) {
  for (const [label, sem] of [
    ['passada', semanaPassada],
    ['atual', semanaAtual],
  ]) {
    const { data, count } = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, media_dia, assiduidade, justificativa_nota_baixa', { count: 'exact' })
      .eq('avaliador_id', vanessa.id)
      .eq('data_referencia', sem);
    vanessaAvals[label] = count ?? 0;
    if (label === 'passada') vanessaAvals.ids = (data ?? []).map((r) => r.colaborador_id);
  }
}

let colsNi = 0;
if (uid) {
  const { count } = await supabase
    .from('colaboradores')
    .select('id', { count: 'exact', head: true })
    .eq('unidade_id', uid)
    .eq('role', 'colaborador');
  colsNi = count ?? 0;
}

console.log(
  JSON.stringify(
    {
      semana_atual_sp: semanaAtual,
      semana_passada_sp: semanaPassada,
      pendencias_monitoram: semanaPassada,
      vanessa: vanessa
        ? {
            id: vanessa.id,
            nome: vanessa.nome,
            role: vanessa.role,
            unidade_id: vanessa.unidade_id,
            onboarding: vanessa.onboarding_completo,
          }
        : null,
      avaliacoes_vanessa: vanessaAvals,
      colaboradores_ni: colsNi,
      lideres_por_setor_ni_asterisco: lpsNi.map((r) => {
        const c = Array.isArray(r.colaboradores) ? r.colaboradores[0] : r.colaboradores;
        return {
          nome: c?.nome,
          lider_id: r.lider_id,
          paridade: r.plantao_paridade,
        };
      }),
    },
    null,
    2
  )
);
