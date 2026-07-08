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

const { data: u } = await supabase.from('unidades').select('id').eq('slug', 'nova-iguacu').single();
const { data: lps } = await supabase
  .from('lideres_por_setor')
  .select('setor, lider_id, plantao_paridade, plantao_paridade_mes_ref, colaboradores:lider_id(nome, role)')
  .eq('unidade_id', u.id)
  .eq('ativo', true);

const byLider = new Map();
for (const row of lps ?? []) {
  const nome = row.colaboradores?.nome ?? '?';
  const key = `${nome}|${row.lider_id}`;
  if (!byLider.has(key)) byLider.set(key, { nome, lider_id: row.lider_id, setores: [] });
  byLider.get(key).setores.push({ setor: row.setor, paridade: row.plantao_paridade });
}

console.log(JSON.stringify({ nova_iguacu_id: u.id, lideres: [...byLider.values()] }, null, 2));
