/** Daniel — pares semana a semana (fonte com nota → destino zerado). */
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
const FORA = 'Fora do plantão deste líder (outro líder avalia nesta semana).';

function destinoZerado(r) {
  if (!r) return true;
  const fora =
    r.assiduidade === 'falta_justificada' &&
    String(r.justificativa_nota_baixa ?? '').trim() === FORA;
  return r.media_dia == null || fora;
}

function fonteComNota(r) {
  return r && r.assiduidade === 'presente' && r.media_dia != null;
}

const pares = [
  { fonte: '2026-06-09', destino: '2026-06-08', label: '09→08 (operacional→anterior)' },
  { fonte: '2026-06-15', destino: '2026-06-08', label: '15→08 (calendário→08)' },
  { fonte: '2026-06-15', destino: '2026-06-09', label: '15→09' },
  { fonte: '2026-06-08', destino: '2026-06-01', label: '08→01' },
];

for (const { fonte, destino, label } of pares) {
  const { data: rowsFonte } = await sb
    .from('avaliacoes_diarias')
    .select('colaborador_id, media_dia, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade')
    .eq('avaliador_id', DANIEL)
    .eq('data_referencia', fonte);

  const { data: rowsDestino } = await sb
    .from('avaliacoes_diarias')
    .select('id, colaborador_id, media_dia, assiduidade, justificativa_nota_baixa')
    .eq('avaliador_id', DANIEL)
    .eq('data_referencia', destino);

  const destMap = new Map((rowsDestino ?? []).map((r) => [r.colaborador_id, r]));
  const hits = [];
  for (const f of rowsFonte ?? []) {
    if (!fonteComNota(f)) continue;
    const d = destMap.get(f.colaborador_id);
    if (!destinoZerado(d)) continue;
    hits.push({ colab: f.colaborador_id, destino_id: d?.id ?? null, media_fonte: f.media_dia });
  }
  console.log(`\n${label}: fonte=${rowsFonte?.length ?? 0} destino=${rowsDestino?.length ?? 0} backfill=${hits.length}`);
  if (hits.length <= 10) hits.forEach((h) => console.log(' ', h));
}

// Tiago específico
const TIAGO = '51a8ce5e-93f2-48f9-b96d-9ef885d57cde';
const { data: tFonte } = await sb
  .from('avaliacoes_diarias')
  .select('*')
  .eq('colaborador_id', TIAGO)
  .eq('avaliador_id', DANIEL)
  .gte('data_referencia', '2026-06-08')
  .order('data_referencia', { ascending: false });
console.log('\nTiago Daniel desde 08/06:', tFonte?.map((r) => ({ sem: r.data_referencia, media: r.media_dia })));
