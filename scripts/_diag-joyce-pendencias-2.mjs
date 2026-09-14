/**
 * Joyce: por que «2 pendências» e a UI parece vazia.
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[t.slice(0, i).trim()] = v;
    }
  }
  return out;
}

const JOYCE = '9fafb159-fe1b-4687-8d2d-a5783df7bd7c';
const env = readEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: avisos } = await sb
  .from('avisos')
  .select('id, titulo, exige_confirmacao, ativo, publico_alvo, unidade_id, data_publicacao, unidades(slug, nome)')
  .eq('ativo', true)
  .eq('exige_confirmacao', true)
  .order('data_publicacao', { ascending: false })
  .limit(20);

const { data: conf } = await sb.from('aviso_confirmacoes').select('aviso_id, confirmado_em').eq('colaborador_id', JOYCE);
const confSet = new Set((conf ?? []).map((c) => c.aviso_id));

const { data: vis } = await sb.from('aviso_visualizacoes').select('aviso_id, visualizado_em').eq('colaborador_id', JOYCE);
const visSet = new Set((vis ?? []).map((v) => v.aviso_id));

console.log('\n=== Avisos exige_confirmacao ativos ===');
for (const a of avisos ?? []) {
  const pend = !confSet.has(a.id);
  if (!pend) continue;
  console.log({
    titulo: a.titulo,
    publico: a.publico_alvo,
    unidade: a.unidades,
    visualizado: visSet.has(a.id),
    confirmado: false,
    id: a.id,
    pub: a.data_publicacao,
  });
}

// Montar pendências reais via código compilado? simular equipe
const { data: joyce } = await sb.from('colaboradores').select('id, unidade_id, role, setor, unidades(slug)').eq('id', JOYCE).single();

// Import listagem equipe is TS — approximate: colaboradores mesquita + fabrica preparos under joyce setores
const { data: mapa } = await sb.from('lideres_por_setor').select('unidade_id, setor').eq('lider_id', JOYCE).eq('ativo', true);

const semanas = ['2026-07-20', '2026-07-27'];
const { data: cols } = await sb
  .from('colaboradores')
  .select('id, nome, role, setor, unidade_id, operacao_apto')
  .eq('role', 'colaborador');

const setoresPorUnidade = new Map();
for (const m of mapa ?? []) {
  const key = m.unidade_id;
  const set = setoresPorUnidade.get(key) ?? new Set();
  set.add(m.setor);
  setoresPorUnidade.set(key, set);
}

function naEquipe(c) {
  const set = setoresPorUnidade.get(c.unidade_id);
  if (!set) return false;
  if (set.has('*')) return true;
  return set.has(c.setor);
}

const equipe = (cols ?? []).filter(naEquipe);
console.log('\nEquipe joyce (aprox):', equipe.length);

const ids = equipe.map((c) => c.id);
const { data: avals } = await sb
  .from('avaliacoes_diarias')
  .select('colaborador_id, avaliador_id, data_referencia, assiduidade, media_dia, justificativa_nota_baixa, ignorada')
  .in('colaborador_id', ids)
  .in('data_referencia', semanas);

function fecha(row) {
  if (row.ignorada) return false;
  const a = String(row.assiduidade || '');
  if (a === 'fora_plantao') return false;
  if (a === 'ferias') return true;
  if (a === 'falta_justificada' && /licenca|afastamento|ferias/i.test(String(row.justificativa_nota_baixa || ''))) return true;
  if (a === 'falta_injustificada') return true;
  return row.media_dia != null;
}

const fechados = new Set();
const ferias = new Set();
const licenca = new Set();
for (const r of avals ?? []) {
  if (r.data_referencia === '2026-07-20' || r.data_referencia === '2026-07-27') {
    if (fecha(r)) fechados.add(r.colaborador_id);
  }
  if (r.data_referencia === '2026-07-20') {
    if (r.assiduidade === 'ferias') ferias.add(r.colaborador_id);
    if (/licenca|afastamento/i.test(String(r.justificativa_nota_baixa || '')) || r.assiduidade === 'licenca') {
      licenca.add(r.colaborador_id);
    }
  }
}

const pendEquipe = equipe.filter((c) => !fechados.has(c.id) && !ferias.has(c.id) && !licenca.has(c.id));
console.log('Pendentes equipe (aprox home):', pendEquipe.length);
console.log(pendEquipe.map((c) => c.nome).slice(0, 15));

const soJoyce = (avals ?? []).filter((r) => r.avaliador_id === JOYCE && r.data_referencia === '2026-07-20');
const joyceAvaliou = new Set(soJoyce.map((r) => r.colaborador_id));
const pendNaTelaJoyce = equipe.filter((c) => !joyceAvaliou.has(c.id));
console.log('Pendentes na tela Joyce (só dela, semana 20):', pendNaTelaJoyce.length);
