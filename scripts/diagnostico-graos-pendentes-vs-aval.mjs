/** Pendentes com avaliação elegível na mesma semana mas não confirmados. */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const sb = createClient(
  loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..')).NEXT_PUBLIC_SUPABASE_URL,
  loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..')).SUPABASE_SERVICE_ROLE_KEY
);

function assiduidadeDoBanco(a, j) {
  if (a === 'falta_justificada' || j === 'falta_justificada') return 'falta_justificada';
  if (a === 'falta_injustificada' || j === 'falta_injustificada') return 'falta_injustificada';
  if (a === 'ferias') return 'ferias';
  if (a === 'fora_plantao') return 'fora_plantao';
  return a || 'presente';
}

function elegivel(row) {
  if (!row) return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a !== 'presente') return false;
  for (const k of ['nota_pontualidade', 'nota_vestimenta', 'nota_trabalho_equipe', 'nota_desempenho_tarefas', 'nota_proatividade']) {
    const n = row[k];
    if (n != null && Number(n) <= 2) return false;
  }
  return true;
}

const { data: pendentes } = await sb
  .from('graos_movimentos')
  .select('colaborador_id, semana_inicio, colaboradores(nome)')
  .eq('estado', 'pendente')
  .gt('graos', 0);

const pares = new Map();
for (const p of pendentes ?? []) {
  const k = `${p.colaborador_id}:${p.semana_inicio}`;
  pares.set(k, p.colaboradores?.nome);
}

console.log(`Semanas com pendentes: ${pares.size}\n`);
let podeConfirmar = 0;
let semAval = 0;
let inelegivel = 0;

for (const [k, nome] of pares) {
  const [cid, sem] = k.split(':');
  const { data: av } = await sb
    .from('avaliacoes_diarias')
    .select('assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_vestimenta, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade')
    .eq('colaborador_id', cid)
    .eq('data_referencia', sem)
    .order('updated_at', { ascending: false })
    .limit(1);
  const row = av?.[0];
  if (!row) {
    semAval++;
    console.log(`SEM AVAL: ${nome} | sem ${sem}`);
  } else if (elegivel(row)) {
    podeConfirmar++;
    console.log(`CONFIRMAR: ${nome} | sem ${sem} | ${row.assiduidade}`);
  } else {
    inelegivel++;
    console.log(`INELEG: ${nome} | sem ${sem} | ${assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa)}`);
  }
}

console.log(`\nResumo: confirmar=${podeConfirmar} sem_aval=${semAval} inelegivel=${inelegivel}`);
