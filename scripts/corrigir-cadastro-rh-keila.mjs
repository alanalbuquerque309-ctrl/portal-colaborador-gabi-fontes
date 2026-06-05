/** Ajusta Keila (RH) para role rh e setor RH — acesso admin limitado no portal. */
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

const { data: candidatos, error: errList } = await sb
  .from('colaboradores')
  .select('id, nome, setor, role')
  .ilike('nome', '%keila%');

if (errList) throw errList;
if (!candidatos?.length) {
  console.error('Nenhuma colaboradora Keila encontrada.');
  process.exit(1);
}

const alvo = candidatos.find((c) => /keila/i.test(c.nome ?? '')) ?? candidatos[0];
const { data, error } = await sb
  .from('colaboradores')
  .update({ setor: 'RH', role: 'rh' })
  .eq('id', alvo.id)
  .select('id, nome, setor, role');

if (error) throw error;
console.log('Atualizado:', data);
