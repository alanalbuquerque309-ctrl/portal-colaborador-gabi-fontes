/**
 * Corrige avaliação errada «fora do plantão» de Daniel → Tiago Ventura (semana 08–14/jun/2026).
 * Uso: node scripts/corrigir-daniel-tiago-semana.mjs [--apply]
 */
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
const AVALIACAO_ID = '54730b25-dab4-4888-adbf-3ae1d34ce846';
const COLABORADOR_ID = '51a8ce5e-93f2-48f9-b96d-9ef885d57cde';
const SEMANA = '2026-06-08';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: antes, error: errAntes } = await sb
  .from('avaliacoes_diarias')
  .select('id, assiduidade, justificativa_nota_baixa, media_dia, edicao_utilizada')
  .eq('id', AVALIACAO_ID)
  .maybeSingle();

if (errAntes || !antes) {
  console.error('Avaliação não encontrada:', errAntes?.message ?? AVALIACAO_ID);
  process.exit(1);
}

console.log('Antes:', antes);

const payload = {
  assiduidade: 'presente',
  justificativa_nota_baixa: null,
  nota_vestimenta: 5,
  nota_pontualidade: 5,
  nota_trabalho_equipe: 5,
  nota_desempenho_tarefas: 5,
  nota_proatividade: 5,
  media_dia: 5,
  edicao_utilizada: true,
  updated_at: new Date().toISOString(),
};

if (!APPLY) {
  console.log('Dry-run. Payload:', payload);
  console.log('Execute com --apply para gravar.');
  process.exit(0);
}

const { data: depois, error: errUpd } = await sb
  .from('avaliacoes_diarias')
  .update(payload)
  .eq('id', AVALIACAO_ID)
  .select('id, assiduidade, media_dia, edicao_utilizada')
  .maybeSingle();

if (errUpd) {
  console.error('Erro ao atualizar:', errUpd.message);
  process.exit(1);
}

console.log('Depois:', depois);
console.log('Tiago Ventura semana', SEMANA, '— avaliação de Daniel corrigida (presente, média 5).');
