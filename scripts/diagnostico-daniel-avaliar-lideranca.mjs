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
const { data: daniel } = await sb.from('colaboradores').select('id, nome, unidade_id').ilike('nome', '%Daniel Brito%').maybeSingle();

const { listarEquipeDoLider } = await import('../src/lib/colaborador-lideres.ts');
const equipe = await listarEquipeDoLider(sb, daniel.id, daniel.unidade_id);

const CARGOS = ['estoque', 'motorista', 'aux administrativo', 'auxiliar administrativo', 'aux adminstrativo'];
const norm = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const elegivel = (cargo) => {
  const c = norm(cargo);
  return CARGOS.some((p) => c.includes(p));
};

console.log('Equipe listarEquipeDoLider (Daniel, unidade administrativo):', equipe.length);
for (const m of equipe) {
  const ok = m.role === 'colaborador' && elegivel(m.cargo);
  console.log(`  - ${m.nome} | cargo="${m.cargo ?? ''}" | setor=${m.setor} | role=${m.role} | elegivel_avaliar_lideranca=${ok}`);
}

const filtrados = equipe.filter((c) => c.role === 'colaborador').filter((c) => elegivel(c.cargo));
console.log(`\nSubordinados em "Avaliar liderança" (admin): ${filtrados.length}`);
if (filtrados.length === 0) {
  console.log('CAUSA: filtro por CARGO (estoque/motorista/aux administrativo), não por setor.');
}
