/** Copia avaliações Daniel da semana 08/06 → 01/06 (destino vazio). */
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

const APPLY = process.argv.includes('--apply');
const SO_TIAGO = process.argv.includes('--tiago');
const DANIEL = '4a7dd5c2-4a59-437d-8774-361234a2400c';
const TIAGO = '51a8ce5e-93f2-48f9-b96d-9ef885d57cde';
const FONTE = '2026-06-08';
const DESTINO = '2026-06-01';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: fonteRows, error: errF } = await sb
  .from('avaliacoes_diarias')
  .select(
    'colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, media_dia, justificativa_nota_baixa'
  )
  .eq('avaliador_id', DANIEL)
  .eq('data_referencia', FONTE)
  .eq('assiduidade', 'presente')
  .not('media_dia', 'is', null);

if (errF) {
  console.error(errF.message);
  process.exit(1);
}

const { data: destExist } = await sb
  .from('avaliacoes_diarias')
  .select('colaborador_id')
  .eq('avaliador_id', DANIEL)
  .eq('data_referencia', DESTINO);

const jaTem = new Set((destExist ?? []).map((r) => r.colaborador_id));

const ids = [...new Set((fonteRows ?? []).map((r) => r.colaborador_id))];
const { data: nomes } = await sb.from('colaboradores').select('id, nome').in('id', ids);
const nomeMap = Object.fromEntries((nomes ?? []).map((n) => [n.id, n.nome]));

const inserts = [];
for (const f of fonteRows ?? []) {
  if (SO_TIAGO && f.colaborador_id !== TIAGO) continue;
  if (jaTem.has(f.colaborador_id)) {
    console.log('Pular (já existe):', nomeMap[f.colaborador_id]);
    continue;
  }
  inserts.push({
    colaborador_id: f.colaborador_id,
    avaliador_id: DANIEL,
    data_referencia: DESTINO,
    assiduidade: f.assiduidade,
    nota_vestimenta: f.nota_vestimenta,
    nota_pontualidade: f.nota_pontualidade,
    nota_trabalho_equipe: f.nota_trabalho_equipe,
    nota_desempenho_tarefas: f.nota_desempenho_tarefas,
    nota_proatividade: f.nota_proatividade,
    media_dia: f.media_dia,
    justificativa_nota_baixa: f.justificativa_nota_baixa,
    edicao_utilizada: false,
  });
  console.log('Inserir:', nomeMap[f.colaborador_id], 'media', f.media_dia, DESTINO, '←', FONTE);
}

if (inserts.length === 0) {
  console.log('Nada a inserir.');
  process.exit(0);
}

if (!APPLY) {
  console.log(`\nDry-run: ${inserts.length} registro(s). Use --apply para gravar.`);
  process.exit(0);
}

const { error: errIns } = await sb.from('avaliacoes_diarias').insert(inserts);
if (errIns) {
  console.error('Erro insert:', errIns.message);
  process.exit(1);
}
console.log(`Gravado: ${inserts.length} avaliação(ões) em ${DESTINO}.`);
