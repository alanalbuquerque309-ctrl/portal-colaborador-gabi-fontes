/**
 * Simula código em produção (a33bc15) vs correção local: por que lista vazia?
 */
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
const { data: u } = await sb.from('unidades').select('id, slug, nome');
const um = Object.fromEntries((u ?? []).map((x) => [x.id, x.slug]));

const { data: daniel } = await sb
  .from('colaboradores')
  .select('id, nome, role, setor, unidade_id')
  .ilike('nome', '%Daniel Brito%')
  .maybeSingle();

if (!daniel) {
  console.error('Daniel Brito não encontrado');
  process.exit(1);
}

const { data: cfg } = await sb
  .from('lideres_por_setor')
  .select('unidade_id, setor, ativo')
  .eq('lider_id', daniel.id);

const ativos = (cfg ?? []).filter((r) => r.ativo);
const semWildcard = ativos.filter((r) => r.setor !== '*');
const wildcards = ativos.filter((r) => r.setor === '*');

console.log('=== Mapa Daniel ===');
console.log(`Ativos: ${ativos.length} (${wildcards.length} wildcard, ${semWildcard.length} por setor)`);

// Simulação PRODUÇÃO: busca só na unidade_id da linha do mapa
const porIdProd = new Map();
for (const r of semWildcard) {
  const { data } = await sb
    .from('colaboradores')
    .select('id, nome, setor, role')
    .eq('unidade_id', r.unidade_id)
    .eq('setor', r.setor)
    .eq('role', 'colaborador');
  for (const c of data ?? []) {
    if (c.id === daniel.id) continue;
    porIdProd.set(c.id, { ...c, unidade: um[r.unidade_id], via: `${um[r.unidade_id]}+${r.setor}` });
  }
}

console.log(`\n=== Só linhas por setor (lógica ANTIGA em produção) ===`);
console.log(`Colaboradores encontrados: ${porIdProd.size}`);
if (porIdProd.size === 0) {
  console.log('  (vazio — setores CD/Estoque/etc. nas lojas, mas cadastro está em Administrativo)');
} else {
  for (const m of [...porIdProd.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
    console.log(`  - ${m.nome} | ${m.setor} | ${m.via}`);
  }
}

// Wildcard administrativo isolado
let wildCount = 0;
for (const r of wildcards) {
  const { data } = await sb
    .from('colaboradores')
    .select('id, nome, setor, role')
    .eq('unidade_id', r.unidade_id)
    .eq('role', 'colaborador');
  for (const c of data ?? []) {
    if (['Fábrica de doces', 'Fábrica de preparos'].includes(String(c.setor))) continue;
    wildCount++;
  }
}
console.log(`\n=== Wildcard * (${wildcards.map((r) => um[r.unidade_id]).join(', ') || 'nenhum'}) ===`);
console.log(`Colaboradores (exc. fábrica): ${wildCount}`);

// Inativos wildcard
const wildInativos = (cfg ?? []).filter((r) => r.setor === '*' && !r.ativo);
if (wildInativos.length) {
  console.log(`\n⚠ Wildcards INATIVOS: ${wildInativos.map((r) => um[r.unidade_id]).join(', ')}`);
}

console.log('\n=== Por linha do mapa (contagem real) ===');
for (const r of semWildcard) {
  const { count } = await sb
    .from('colaboradores')
    .select('id', { count: 'exact', head: true })
    .eq('unidade_id', r.unidade_id)
    .eq('setor', r.setor)
    .eq('role', 'colaborador');
  const flag = count === 0 ? ' ← vazio' : '';
  console.log(`  ${um[r.unidade_id]}+${r.setor}: ${count}${flag}`);
}

// Cenário: só linhas de LOJA (sem administrativo) — como se mapa não tivesse vínculo na matriz
const semAdmin = semWildcard.filter((r) => um[r.unidade_id] !== 'administrativo');
const porIdSoLoja = new Map();
for (const r of semAdmin) {
  const { data } = await sb
    .from('colaboradores')
    .select('id, nome, setor')
    .eq('unidade_id', r.unidade_id)
    .eq('setor', r.setor)
    .eq('role', 'colaborador');
  for (const c of data ?? []) porIdSoLoja.set(c.id, c);
}
console.log(`\n=== Se IGNORAR linhas administrativo+setor (${semAdmin.length} linhas loja) ===`);
console.log(`Colaboradores: ${porIdSoLoja.size} (esperado 0 se backoffice só na matriz)`);

// operacao_apto existe?
const { error: errApto } = await sb.from('colaboradores').select('operacao_apto').limit(1);
console.log(`\n=== Coluna operacao_apto no Supabase ===`);
console.log(errApto ? `ERRO: ${errApto.message}` : 'OK');

const { listarEquipeParaAvaliacaoSemanal } = await import('../src/lib/colaborador-lideres.ts');
const equipeAtual = await listarEquipeParaAvaliacaoSemanal(sb, daniel.id, daniel.unidade_id);
console.log(`\n=== API atual (com correção local) ===`);
console.log(`Total: ${equipeAtual.length}`);
for (const m of equipeAtual) {
  console.log(`  - ${m.nome} | ${m.setor ?? '?'}`);
}
