/**
 * Chama listarEquipeParaAvaliacaoSemanal como a API avaliacao-master.
 * Uso: npx tsx scripts/test-equipe-daniel-lib.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const { createAdminClient } = await import('../src/lib/supabase/admin.ts');
const { listarEquipeParaAvaliacaoSemanal } = await import('../src/lib/colaborador-lideres.ts');

const supabase = createAdminClient();
const { data: daniel } = await supabase
  .from('colaboradores')
  .select('id, nome, unidade_id')
  .ilike('nome', '%Daniel Brito%')
  .maybeSingle();

if (!daniel?.id) {
  console.error('Daniel Brito não encontrado');
  process.exit(1);
}

const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, daniel.id, daniel.unidade_id);
console.log(`Daniel (${daniel.nome}): ${equipe.length} na equipe`);
for (const m of equipe) {
  console.log(`  - ${m.nome} | ${m.setor ?? '?'} | onboarding=${m.onboarding_completo}`);
}
