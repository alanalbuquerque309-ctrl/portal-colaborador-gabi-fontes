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

const { data: daniel } = await sb
  .from('colaboradores')
  .select('id, nome, role, setor, unidade_id')
  .ilike('nome', '%Daniel Brito%')
  .maybeSingle();

console.log('Daniel cadastro:', daniel);
if (!daniel) {
  console.error('Daniel Brito não encontrado');
  process.exit(1);
}

const { data: cfg } = await sb
  .from('lideres_por_setor')
  .select('unidade_id, setor, ativo')
  .eq('lider_id', daniel.id);

const ativos = (cfg ?? []).filter((r) => r.ativo);
const inativos = (cfg ?? []).filter((r) => !r.ativo);
console.log(`lideres_por_setor: ${(cfg ?? []).length} linhas, ${ativos.length} ativas, ${inativos.length} inativas`);
const wildAtivos = ativos.filter((r) => r.setor === '*');
const wildInativos = (cfg ?? []).filter((r) => r.setor === '*' && !r.ativo);
console.log(`  wildcard * ativos: ${wildAtivos.map((r) => um[r.unidade_id]).join(', ') || '(nenhum)'}`);
if (wildInativos.length) {
  console.log(`  wildcard * INATIVOS: ${wildInativos.map((r) => um[r.unidade_id]).join(', ')}`);
}
console.log(`  por setor ativos: ${ativos.filter((r) => r.setor !== '*').length}`);

const SETORES_DANIEL = ['CD', 'Estoque', 'Motorista', 'Administração', 'RH'];
const porId = new Map();

for (const r of ativos) {
  let q = sb
    .from('colaboradores')
    .select('id, nome, setor, role, onboarding_completo')
    .eq('unidade_id', r.unidade_id);
  if (r.setor !== '*') q = q.eq('setor', r.setor);
  const { data } = await q;
  for (const c of data ?? []) {
    if (String(c.role) !== 'colaborador') continue;
    if (String(c.id) === daniel.id) continue;
    if (r.setor === '*' && ['Fábrica de doces', 'Fábrica de preparos'].includes(String(c.setor))) continue;
    porId.set(c.id, { ...c, unidade: um[r.unidade_id], lideranca: r.setor });
  }
}

console.log(`\nEquipe simulada (colaborador): ${porId.size}`);
for (const m of [...porId.values()].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))) {
  console.log(`  - ${m.nome} | ${m.setor} | ${m.unidade} | onboarding=${m.onboarding_completo}`);
}

const { data: backoffice } = await sb
  .from('colaboradores')
  .select('id, nome, setor, role, onboarding_completo, unidade_id')
  .in('setor', SETORES_DANIEL)
  .eq('role', 'colaborador')
  .order('nome');

const { listarEquipeParaAvaliacaoSemanal } = await import('../src/lib/colaborador-lideres.ts');
const equipeApi = await listarEquipeParaAvaliacaoSemanal(sb, daniel.id, daniel.unidade_id);
console.log(`\nlistarEquipeParaAvaliacaoSemanal (como API): ${equipeApi.length}`);
for (const m of equipeApi) {
  console.log(`  - ${m.nome} | ${m.setor ?? '?'}`);
}

console.log(`\nTodos colaboradores nos setores Daniel (${SETORES_DANIEL.join(', ')}): ${(backoffice ?? []).length}`);
for (const c of backoffice ?? []) {
  console.log(`  - ${c.nome} | ${c.setor} | ${um[c.unidade_id]} | onboarding=${c.onboarding_completo}`);
}
