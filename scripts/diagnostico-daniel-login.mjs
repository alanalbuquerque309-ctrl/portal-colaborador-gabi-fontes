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

const { data: daniel } = await sb
  .from('colaboradores')
  .select('id, nome, role, telefone, telefone_login, email, cpf')
  .ilike('nome', '%Daniel Brito%')
  .maybeSingle();

console.log('Daniel Brito cadastro login:', daniel);

// Simula API com ID errado (cookie antigo?)
const { listarEquipeParaAvaliacaoSemanal } = await import('../src/lib/colaborador-lideres.ts');

for (const nome of ['Daniele Aparecida', 'Daniele Vieira']) {
  const { data: c } = await sb.from('colaboradores').select('id, nome, role, unidade_id').ilike('nome', `%${nome}%`).maybeSingle();
  if (!c) continue;
  const eq = await listarEquipeParaAvaliacaoSemanal(sb, c.id, c.unidade_id);
  console.log(`\nEquipe se logar como ${c.nome}: ${eq.length}`);
}

if (daniel) {
  const eq = await listarEquipeParaAvaliacaoSemanal(sb, daniel.id, '00000000-0000-0000-0000-000000000000');
  console.log(`\nEquipe Daniel com unidade_id errado no cookie: ${eq.length}`);
}
