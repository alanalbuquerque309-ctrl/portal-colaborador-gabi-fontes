import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[t.slice(0, i).trim()] = v;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

for (const slug of ['mesquita', 'nova-iguacu', 'barra']) {
  const { data: u } = await supabase.from('unidades').select('id').eq('slug', slug).single();
  const { data: lps } = await supabase
    .from('lideres_por_setor')
    .select('setor, plantao_paridade, colaboradores:lider_id(nome)')
    .eq('unidade_id', u.id)
    .eq('setor', '*')
    .eq('ativo', true);
  console.log(
    slug,
    (lps ?? []).map((r) => ({
      nome: r.colaboradores?.nome,
      paridade: r.plantao_paridade,
    }))
  );
}
