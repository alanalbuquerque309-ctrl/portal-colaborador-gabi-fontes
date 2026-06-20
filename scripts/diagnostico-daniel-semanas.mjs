/** Daniel — comparar semana atual vs passada (médias zeradas). */
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
const DANIEL = '4a7dd5c2-4a59-437d-8774-361234a2400c';
const SEMANA_ATUAL = '2026-06-15';
const SEMANA_PASSADA = '2026-06-08';

const { data: atual } = await sb
  .from('avaliacoes_diarias')
  .select('id, colaborador_id, assiduidade, media_dia, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, justificativa_nota_baixa, colaboradores(nome)')
  .eq('avaliador_id', DANIEL)
  .eq('data_referencia', SEMANA_ATUAL);

const { data: passada } = await sb
  .from('avaliacoes_diarias')
  .select('id, colaborador_id, assiduidade, media_dia, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, justificativa_nota_baixa, colaboradores(nome)')
  .eq('avaliador_id', DANIEL)
  .eq('data_referencia', SEMANA_PASSADA);

const passadaPorColab = new Map((passada ?? []).map((r) => [r.colaborador_id, r]));

console.log('Daniel semana atual', SEMANA_ATUAL, ':', atual?.length ?? 0, 'avaliações');
for (const a of atual ?? []) {
  const nome = Array.isArray(a.colaboradores) ? a.colaboradores[0]?.nome : a.colaboradores?.nome;
  const p = passadaPorColab.get(a.colaborador_id);
  console.log({
    nome,
    atual_media: a.media_dia,
    passada_media: p?.media_dia ?? '(sem registro)',
    passada_id: p?.id ?? null,
    passada_assid: p?.assiduidade ?? null,
  });
}

console.log('\nPassada sem par na atual:');
for (const p of passada ?? []) {
  const nome = Array.isArray(p.colaboradores) ? p.colaboradores[0]?.nome : p.colaboradores?.nome;
  const temAtual = (atual ?? []).some((a) => a.colaborador_id === p.colaborador_id);
  if (!temAtual) {
    console.log({ nome, media: p.media_dia, assid: p.assiduidade });
  }
}
