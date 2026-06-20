/** Tiago — Daniel em todas as semanas recentes. */
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
const TIAGO = '51a8ce5e-93f2-48f9-b96d-9ef885d57cde';
const DANIEL = '4a7dd5c2-4a59-437d-8774-361234a2400c';

const { data: avs } = await sb
  .from('avaliacoes_diarias')
  .select('id, data_referencia, avaliador_id, assiduidade, media_dia, nota_vestimenta, updated_at')
  .eq('colaborador_id', TIAGO)
  .order('data_referencia', { ascending: false })
  .limit(30);

const { data: nomes } = await sb.from('colaboradores').select('id, nome').in('id', [...new Set((avs??[]).map(a=>a.avaliador_id))]);
const nomeMap = Object.fromEntries((nomes??[]).map(n=>[n.id, n.nome]));

console.log('Tiago — histórico:');
for (const r of avs ?? []) {
  console.log(r.data_referencia, nomeMap[r.avaliador_id], r.assiduidade, 'media', r.media_dia);
}
