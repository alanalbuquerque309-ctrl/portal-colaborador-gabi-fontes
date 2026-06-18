/** Diagnóstico: perfil Rodrigo vs treino da quinta (líder x colaborador). */
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

const { data: unidades } = await sb.from('unidades').select('id, slug, nome');
const umap = Object.fromEntries((unidades ?? []).map((u) => [u.id, u.slug]));

const { data: rodrigos } = await sb
  .from('colaboradores')
  .select('id, nome, role, cargo, setor, unidade_id, onboarding_completo')
  .ilike('nome', '%Rodrigo%')
  .order('nome');

console.log('=== Rodrigos no cadastro ===');
for (const c of rodrigos ?? []) {
  const { data: liderCfg } = await sb
    .from('lideres_por_setor')
    .select('setor, ativo')
    .eq('lider_id', c.id)
    .eq('ativo', true);
  const role = String(c.role ?? '').toLowerCase();
  const perfilQuinta =
    role === 'gerente' || role === 'master' || role === 'admin'
      ? 'LIDER (video em /portal/avaliacao-master)'
      : role === 'colaborador'
        ? 'COLABORADOR (video em /portal/graos, quinta-feira)'
        : `OUTRO (${role})`;
  console.log(`\n${c.nome}`);
  console.log(`  role=${c.role} | cargo=${c.cargo ?? '—'} | setor=${c.setor ?? '—'} | unidade=${umap[c.unidade_id] ?? c.unidade_id}`);
  console.log(`  onboarding=${c.onboarding_completo}`);
  console.log(`  lideres_por_setor (como lider): ${(liderCfg ?? []).length ? liderCfg.map((x) => x.setor).join(', ') : 'nenhum'}`);
  console.log(`  treino quinta esperado: ${perfilQuinta}`);
  console.log(
    `  acessa avaliacao-master: ${['gerente', 'master', 'admin'].includes(role) ? 'SIM' : 'NAO (role nao e gerente/master/admin)'}`
  );
}

const { data: lideranca } = await sb
  .from('colaboradores')
  .select('nome, role, cargo, setor, unidade_id')
  .in('role', ['gerente', 'master', 'admin'])
  .order('nome');

console.log('\n=== Toda lideranca (gerente/master/admin) ===');
for (const c of lideranca ?? []) {
  console.log(`  ${c.nome} | role=${c.role} | ${c.setor ?? '—'} | ${umap[c.unidade_id] ?? '?'}`);
}
if (!(lideranca ?? []).length) console.log('  (nenhum cadastro com role gerente/master/admin)');

console.log('\n=== Env local (quinta) ===');
console.log('  QUINTA_YOUTUBE_URL colaborador:', process.env.NEXT_PUBLIC_QUINTA_YOUTUBE_URL ? 'definida' : 'VAZIA');
console.log('  QUINTA_YOUTUBE_URL lideres:', process.env.NEXT_PUBLIC_QUINTA_YOUTUBE_URL_LIDERES ? 'definida' : 'VAZIA');
console.log('\nNota: vars NEXT_PUBLIC_* na Vercel precisam existir no deploy; sem URL = sem embed de video.');
