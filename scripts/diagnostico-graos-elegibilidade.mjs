/** Diagnóstico: pendentes vs avaliação vs elegibilidade. */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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

const semanaAtual = segundaSemanaSaoPaulo();
console.log('Semana atual SP:', semanaAtual);

const { data: pendentes } = await sb
  .from('graos_movimentos')
  .select('colaborador_id, semana_inicio, graos, missao, colaboradores(nome)')
  .eq('estado', 'pendente')
  .gt('graos', 0)
  .order('semana_inicio');

const porColab = new Map();
for (const p of pendentes ?? []) {
  const id = p.colaborador_id;
  if (!porColab.has(id)) porColab.set(id, { nome: p.colaboradores?.nome, semanas: new Set(), total: 0 });
  const x = porColab.get(id);
  x.semanas.add(p.semana_inicio);
  x.total += Number(p.graos) || 0;
}

console.log(`\nColaboradores com pendentes: ${porColab.size}\n`);

for (const [id, info] of porColab) {
  console.log(`--- ${info.nome}`);
  console.log(`  pendentes: ${info.total} grãos em semanas: ${[...info.semanas].join(', ')}`);
  for (const sem of info.semanas) {
    const { data: av } = await sb
      .from('avaliacoes_diarias')
      .select('id, assiduidade, avaliador_id, data_referencia, colaboradores!avaliador_id(nome)')
      .eq('colaborador_id', id)
      .eq('data_referencia', sem)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (av?.length) {
      const a = av[0];
      console.log(`  avaliação ${sem}: assiduidade=${a.assiduidade} por ${a.colaboradores?.nome ?? a.avaliador_id}`);
    } else {
      console.log(`  avaliação ${sem}: NENHUMA`);
    }
  }
}
