/** Confere equipe Daniel (5) + avaliações da semana passada padrão. */
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

function segundaSemanaPassadaSP() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  local.setDate(local.getDate() + (dow === 0 ? -6 : 1 - dow) - 7);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

const semRef = segundaSemanaPassadaSP();

const { data: daniel } = await sb
  .from('colaboradores')
  .select('id, nome')
  .ilike('nome', '%Daniel Brito%')
  .maybeSingle();
if (!daniel) {
  console.error('Daniel não encontrado');
  process.exit(1);
}

const alvos = [
  'Keila Garcia',
  'Leandro da Conceição Duarte',
  'Rodrigo Ferreira de Carvalho',
  'Rodrigo Maciel Cunha de Oliveira',
  'Tiago Ventura',
];

console.log(`Daniel: ${daniel.nome}`);
console.log(`Semana padrão (segunda passada SP): ${semRef}\n`);

let ok = 0;
for (const alvo of alvos) {
  const { data: col } = await sb
    .from('colaboradores')
    .select('id, nome, setor, cargo, role')
    .ilike('nome', `%${alvo.split(' ')[0]}%${alvo.split(' ').slice(-1)[0]}%`)
    .maybeSingle();
  if (!col) {
    console.log(`- ${alvo}: cadastro não encontrado`);
    continue;
  }
  const { data: av } = await sb
    .from('avaliacoes_diarias')
    .select('assiduidade, avaliador_id, media_dia')
    .eq('colaborador_id', col.id)
    .eq('data_referencia', semRef)
    .maybeSingle();
  const fechou = av != null;
  if (fechou) ok += 1;
  const byDaniel = av?.avaliador_id === daniel.id;
  console.log(
    `- ${col.nome} | ${col.setor ?? '?'} | ${fechou ? av.assiduidade + (byDaniel ? ' (Daniel)' : ' (outro avaliador)') : 'PENDENTE'}`
  );
}

console.log(`\nResumo: ${ok}/${alvos.length} concluído(s) na semana ${semRef}`);
