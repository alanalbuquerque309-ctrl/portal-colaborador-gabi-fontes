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

const { data: u } = await sb.from('unidades').select('id, slug');
const um = Object.fromEntries((u ?? []).map((x) => [x.id, x.slug]));

for (const setor of ['Motorista', 'RH', 'Administração']) {
  const { data } = await sb
    .from('colaboradores')
    .select('nome, role, setor, unidade_id, onboarding_completo')
    .eq('setor', setor)
    .order('nome');
  console.log(`\n=== setor ${setor} (${(data ?? []).length}) ===`);
  for (const c of data ?? []) {
    console.log(
      `  ${c.nome} | role=${c.role} | ${um[c.unidade_id]} | onboarding=${c.onboarding_completo}`
    );
  }
}
