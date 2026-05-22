/**
 * Diagnóstico: equipe visível para Daniel (avaliação semanal).
 * Uso: node scripts/diagnostico-equipe-daniel.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const SETOR_TODOS = '*';

function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nomeMatch(cadastro, busca) {
  const a = norm(cadastro);
  const b = norm(busca);
  if (!a || !b) return false;
  if (a === b || a.includes(b)) return true;
  const parts = b.split(/\s+/).filter((p) => p.length > 2);
  return parts.length >= 1 && parts.every((p) => a.includes(p));
}

async function listarPorSetorConfig(liderId) {
  const porId = new Map();
  const { data: cfg } = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor')
    .eq('lider_id', liderId)
    .eq('ativo', true);

  for (const row of cfg ?? []) {
    const uid = String(row.unidade_id);
    const setor = String(row.setor ?? '').trim();
    let q = supabase
      .from('colaboradores')
      .select('id, nome, role, setor, unidade_id, onboarding_completo')
      .eq('unidade_id', uid);
    if (setor !== SETOR_TODOS) q = q.eq('setor', setor);
    const { data } = await q;
    for (const c of data ?? []) {
      if (norm(c.role) !== 'colaborador') continue;
      if (String(c.id) === liderId) continue;
      porId.set(c.id, c);
    }
  }
  return [...porId.values()];
}

async function main() {
  const { data: unidades } = await supabase.from('unidades').select('id, slug, nome');
  const umap = Object.fromEntries((unidades ?? []).map((u) => [u.id, u.slug]));

  const buscas = ['Daniel', 'Rodrigo', 'Leandro', 'Keila', 'Tiago'];
  const { data: todos } = await supabase
    .from('colaboradores')
    .select('id, nome, role, setor, unidade_id, onboarding_completo');

  console.log('\n=== Cadastro (todos que batem no nome) ===');
  for (const b of buscas) {
    const found = (todos ?? []).filter((c) => nomeMatch(c.nome, b));
    if (!found.length) console.log(`  ${b}: (nenhum)`);
    for (const c of found) {
      console.log(
        `  ${c.nome} | role=${c.role} | setor=${c.setor ?? '(vazio)'} | unidade=${umap[c.unidade_id] ?? c.unidade_id} | onboarding=${c.onboarding_completo}`
      );
    }
  }

  const daniel = (todos ?? []).find(
    (c) =>
      nomeMatch(c.nome, 'Daniel Martins') ||
      (nomeMatch(c.nome, 'Daniel') && ['admin', 'socio', 'gerente', 'master'].includes(norm(c.role)))
  );
  if (!daniel) {
    console.error('\nDaniel não encontrado.');
    process.exit(1);
  }

  const { data: mesquita } = await supabase.from('unidades').select('id').eq('slug', 'mesquita').maybeSingle();
  const { data: cfgEstoque } = await supabase
    .from('lideres_por_setor')
    .select('id, ativo')
    .eq('lider_id', daniel.id)
    .eq('setor', 'Estoque')
    .eq('unidade_id', mesquita?.id ?? '')
    .maybeSingle();
  console.log(
    `  Daniel lider Estoque Mesquita (ativo): ${cfgEstoque ? (cfgEstoque.ativo ? 'sim' : 'NAO — reaplicar mapa') : 'nao configurado'}`
  );

  const { data: cfg } = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor')
    .eq('lider_id', daniel.id)
    .eq('ativo', true);

  const wild = (cfg ?? []).filter((r) => r.setor === SETOR_TODOS);
  const espec = (cfg ?? []).filter((r) => r.setor !== SETOR_TODOS);

  console.log(`\n=== Daniel (${daniel.nome}) ===`);
  console.log(`  unidade cadastro: ${umap[daniel.unidade_id]}`);
  console.log(`  lideres_por_setor: ${(cfg ?? []).length} (${wild.length} wildcard *, ${espec.length} por setor)`);

  const equipeSetor = await listarPorSetorConfig(daniel.id);
  const equipeOnboarding = equipeSetor.filter((c) => c.onboarding_completo);

  console.log(`\n=== Equipe por mapa de setores (sem filtro onboarding): ${equipeSetor.length} ===`);
  for (const m of equipeSetor.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))) {
    console.log(`  - ${m.nome} | ${m.setor ?? '?'} | ${umap[m.unidade_id]} | onboarding=${m.onboarding_completo}`);
  }

  console.log(`\n=== Com onboarding completo: ${equipeOnboarding.length} ===`);

  const { data: adm } = await supabase.from('unidades').select('id').eq('slug', 'administrativo').maybeSingle();
  if (adm?.id) {
    const { data: soAdm } = await supabase
      .from('colaboradores')
      .select('id, nome, setor, onboarding_completo')
      .eq('unidade_id', adm.id)
      .eq('role', 'colaborador')
      .eq('onboarding_completo', true);
    console.log(`\n=== Só unidade Administrativo (bug antigo): ${(soAdm ?? []).length} ===`);
    for (const c of soAdm ?? []) console.log(`  - ${c.nome} | ${c.setor ?? '?'}`);
  }

  console.log('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
