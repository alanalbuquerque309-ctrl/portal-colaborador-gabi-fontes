/** Avaliações semana passada com média null vs semana atual com nota. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASSADA = '2026-06-01';
const ATUAL = '2026-06-08';
const FORA = 'Fora do plantão deste líder (outro líder avalia nesta semana).';

function chave(colab, aval) {
  return `${colab}|${aval}`;
}

const { data: rows, error: errRows } = await sb
  .from('avaliacoes_diarias')
  .select(
    'id, colaborador_id, avaliador_id, data_referencia, assiduidade, media_dia, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, justificativa_nota_baixa'
  )
  .in('data_referencia', [PASSADA, ATUAL]);

if (errRows) {
  console.error('Erro query:', errRows.message);
  process.exit(1);
}

const passada = new Map();
const atual = new Map();
for (const r of rows ?? []) {
  const k = chave(r.colaborador_id, r.avaliador_id);
  const nomeColab = Array.isArray(r.colaboradores) ? r.colaboradores[0]?.nome : r.colaboradores?.nome;
  const nomeAv = Array.isArray(r.avaliador) ? r.avaliador[0]?.nome : r.avaliador?.nome;
  const item = { ...r, nomeColab, nomeAv };
  if (r.data_referencia === PASSADA) passada.set(k, item);
  if (r.data_referencia === ATUAL) atual.set(k, item);
}

console.log('Semana atual', ATUAL, 'total:', atual.size);
console.log('Semana passada', PASSADA, 'total:', passada.size);

const candidatos = [];
for (const [k, a] of atual) {
  const p = passada.get(k);
  if (!p) continue;
  const fora =
    p.assiduidade === 'falta_justificada' &&
    String(p.justificativa_nota_baixa ?? '').trim() === FORA;
  const passadaZerada = p.media_dia == null || fora;
  const atualComNota = a.media_dia != null && a.assiduidade === 'presente';
  if (passadaZerada && atualComNota) {
    candidatos.push({ k, nomeColab: a.nomeColab, nomeAv: a.nomeAv, passada_id: p.id, atual: a, passada: p });
  }
}

console.log('\nCandidatos (passada zerada, atual com nota):', candidatos.length);
for (const c of candidatos) {
  console.log(c.nomeColab, '—', c.nomeAv, '| passada media:', c.passada.media_dia, '→ atual:', c.atual.media_dia);
}

// Tiago qualquer semana recente
const { data: tiago } = await sb
  .from('avaliacoes_diarias')
  .select('data_referencia, media_dia, assiduidade, avaliador:avaliador_id(nome)')
  .eq('colaborador_id', '51a8ce5e-93f2-48f9-b96d-9ef885d57cde')
  .gte('data_referencia', '2026-05-01')
  .order('data_referencia', { ascending: false });
console.log('\nTiago todas recentes:');
for (const t of tiago ?? []) {
  const av = Array.isArray(t.avaliador) ? t.avaliador[0]?.nome : t.avaliador?.nome;
  console.log(t.data_referencia, av, t.assiduidade, t.media_dia);
}
