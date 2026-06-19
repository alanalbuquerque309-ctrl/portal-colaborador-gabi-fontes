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
const { data: d } = await sb.from('colaboradores').select('id').ilike('nome', '%Daniel Brito%').single();
const { data: avs } = await sb
  .from('avaliacoes_diarias')
  .select('data_referencia, assiduidade, colaborador_id, created_at')
  .eq('avaliador_id', d.id)
  .gte('data_referencia', '2026-06-01')
  .order('created_at', { ascending: false });

const ids = [...new Set((avs ?? []).map((a) => a.colaborador_id))];
const { data: cols } = await sb.from('colaboradores').select('id, nome, setor').in('id', ids);
const nm = Object.fromEntries((cols ?? []).map((c) => [c.id, c]));

console.log('Total aval Daniel jun:', avs?.length);
for (const a of avs ?? []) {
  const c = nm[a.colaborador_id];
  console.log(a.data_referencia, c?.nome ?? a.colaborador_id, a.assiduidade, a.created_at?.slice(0, 16));
}
