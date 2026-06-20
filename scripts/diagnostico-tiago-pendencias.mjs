/** Tiago Ventura — avaliações e pendência crítica. */
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

const FORA = 'Fora do plantão deste líder (outro líder avalia nesta semana).';

function assiduidadeDoBanco(stored, justificativa) {
  const s = String(stored ?? '').trim();
  const j = String(justificativa ?? '').trim();
  if (s === 'falta_justificada' && j === FORA) return 'fora_plantao';
  return s;
}

const { data: tiago } = await sb.from('colaboradores').select('id, nome, setor').ilike('nome', '%Tiago Ventura%').maybeSingle();
if (!tiago) {
  console.log('Tiago não encontrado');
  process.exit(1);
}

const { data: avs, error: errAv } = await sb
  .from('avaliacoes_diarias')
  .select(
    'id, data_referencia, avaliador_id, assiduidade, justificativa_nota_baixa, media_dia, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, edicao_utilizada, updated_at'
  )
  .eq('colaborador_id', tiago.id)
  .order('data_referencia', { ascending: false })
  .limit(20);

if (errAv) {
  console.error('Erro:', errAv.message);
  process.exit(1);
}

console.log('Tiago:', tiago.id, tiago.nome, tiago.setor);

const { data: keila } = await sb.from('colaboradores').select('id, nome, role, setor').ilike('nome', '%Keila%').limit(3);
console.log('Keila rows:', keila);

const { data: daniel } = await sb.from('colaboradores').select('id, nome, role, setor').ilike('nome', '%Daniel Brito%').maybeSingle();
console.log('Daniel:', daniel);
for (const r of avs ?? []) {
  const { data: av } = await sb.from('colaboradores').select('nome').eq('id', r.avaliador_id).maybeSingle();
  const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
  console.log({
    id: r.id,
    semana: r.data_referencia,
    avaliador: av?.nome,
    assid: a,
    raw: r.assiduidade,
    media: r.media_dia,
    ignorada: null,
    edicao: r.edicao_utilizada,
    updated: r.updated_at,
  });
}

const danielEvalId = '54730b25-dab4-4888-adbf-3ae1d34ce846';
const { data: danielRow } = await sb.from('avaliacoes_diarias').select('*').eq('id', danielEvalId).maybeSingle();
console.log('Daniel row completa:', danielRow);

const { data: keilaRow } = await sb
  .from('avaliacoes_diarias')
  .select('*')
  .eq('id', 'a93d1f7b-9626-4411-b4a4-7ae50795a42c')
  .maybeSingle();
console.log('Keila row completa:', keilaRow);

const { data: danielOutras } = await sb
  .from('avaliacoes_diarias')
  .select('data_referencia, assiduidade, media_dia, nota_vestimenta, nota_pontualidade')
  .eq('colaborador_id', tiago.id)
  .eq('avaliador_id', daniel.id)
  .neq('id', danielEvalId)
  .order('data_referencia', { ascending: false })
  .limit(5);
console.log('Daniel outras avaliações Tiago:', danielOutras);
