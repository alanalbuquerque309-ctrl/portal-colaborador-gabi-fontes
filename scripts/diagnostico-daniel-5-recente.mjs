/** Avaliações recentes da equipe Daniel (5). */
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

const { data: daniel } = await sb.from('colaboradores').select('id, nome').ilike('nome', '%Daniel Brito%').maybeSingle();

const alvos = [
  'Keila Garcia',
  'Leandro da Conceição Duarte',
  'Rodrigo Ferreira de Carvalho',
  'Rodrigo Maciel Cunha de Oliveira',
  'Tiago Ventura',
];

const semanas = ['2026-06-01', '2026-06-08', '2026-06-09', '2026-06-15', '2026-06-16'];

console.log(`Daniel: ${daniel?.nome}\n`);

for (const alvo of alvos) {
  const { data: col } = await sb
    .from('colaboradores')
    .select('id, nome, setor')
    .ilike('nome', `%${alvo.split(' ')[0]}%${alvo.split(' ').slice(-1)[0]}%`)
    .maybeSingle();
  if (!col) continue;
  console.log(`${col.nome} (${col.setor})`);
  for (const sem of semanas) {
    const { data: av } = await sb
      .from('avaliacoes_diarias')
      .select('assiduidade, avaliador_id, created_at')
      .eq('colaborador_id', col.id)
      .eq('data_referencia', sem)
      .maybeSingle();
    if (av) {
      const d = av.avaliador_id === daniel.id ? 'Daniel' : 'outro';
      console.log(`  ${sem}: ${av.assiduidade} (${d}) criado ${av.created_at?.slice(0, 16)}`);
    }
  }
  console.log('');
}
