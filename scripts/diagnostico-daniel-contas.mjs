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

const { data: daniels } = await sb
  .from('colaboradores')
  .select('id, nome, role, setor, unidade_id, telefone, email')
  .or('nome.ilike.%Daniel%,nome.ilike.%Daniele%')
  .order('nome');

console.log('Contas com Daniel no nome:');
for (const c of daniels ?? []) {
  console.log(`  - ${c.nome} | role=${c.role} | setor=${c.setor} | id=${c.id}`);
}

const { data: cfg } = await sb.from('lideres_por_setor').select('lider_id, ativo').eq('ativo', true);
const liderIds = new Set((cfg ?? []).map((r) => r.lider_id));
for (const c of daniels ?? []) {
  const linhas = (cfg ?? []).filter((r) => r.lider_id === c.id).length;
  console.log(`  mapa lideranca ativo: ${c.nome} -> ${linhas} linhas`);
}
