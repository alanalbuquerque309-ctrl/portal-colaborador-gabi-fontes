/**
 * Diagnóstico: equipe Mesquita visível para Joyce e Silvia (avaliação semanal).
 * Uso (na pasta do Portal, com .env.local):
 *   node scripts/diagnostico-equipe-mesquita.mjs
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
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
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
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const parts = b.split(/\s+/).filter((p) => p.length > 2);
  return parts.length >= 2 && parts.every((p) => a.includes(p));
}

async function listarEquipeSimulada(liderId, unidadeFiltroSessao) {
  const porId = new Map();
  const { data: cfg } = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor')
    .eq('lider_id', liderId)
    .eq('ativo', true);

  for (const row of cfg ?? []) {
    const uid = String(row.unidade_id);
    const setor = String(row.setor ?? '').trim();
    let q = supabase.from('colaboradores').select('id, nome, role, setor').eq('unidade_id', uid);
    if (setor !== SETOR_TODOS) q = q.eq('setor', setor);
    const { data } = await q;
    for (const c of data ?? []) {
      if (norm(c.role) !== 'colaborador') continue;
      if (String(c.id) === liderId) continue;
      porId.set(c.id, c);
    }
  }

  return [...porId.values()].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

async function main() {
  const { data: uMes } = await supabase.from('unidades').select('id, nome').eq('slug', 'mesquita').maybeSingle();
  if (!uMes?.id) {
    console.error('Unidade mesquita não encontrada.');
    process.exit(1);
  }

  const { data: todos } = await supabase
    .from('colaboradores')
    .select('id, nome, role, setor, unidade_id')
    .eq('unidade_id', uMes.id)
    .order('nome');

  const colaboradoresMesquita = (todos ?? []).filter((c) => norm(c.role) === 'colaborador');
  const gerentes = (todos ?? []).filter((c) => ['gerente', 'master', 'admin'].includes(norm(c.role)));

  console.log('\n=== Mesquita: colaboradores (role colaborador) ===');
  console.log(`Total: ${colaboradoresMesquita.length}`);
  for (const c of colaboradoresMesquita) {
    console.log(`  - ${c.nome} | setor: ${c.setor ?? '(vazio)'}`);
  }

  console.log('\n=== Mesquita: possíveis líderes (gerente/admin) ===');
  for (const g of gerentes) console.log(`  - ${g.nome} | role: ${g.role} | setor: ${g.setor ?? '—'}`);

  const { data: cfgMes } = await supabase
    .from('lideres_por_setor')
    .select('setor, lider_id, colaboradores(nome, role, unidade_id)')
    .eq('unidade_id', uMes.id)
    .eq('ativo', true);

  console.log('\n=== lideres_por_setor (Mesquita, ativo) ===');
  if (!cfgMes?.length) {
    console.log('  (vazio) → corra Admin → Aplicar mapa operacional');
  } else {
    for (const r of cfgMes) {
      const l = Array.isArray(r.colaboradores) ? r.colaboradores[0] : r.colaboradores;
      console.log(`  - setor "${r.setor}" → ${l?.nome ?? r.lider_id}`);
    }
  }

  for (const busca of ['Joyce', 'Silvia']) {
    const lid = (todos ?? []).find((c) => nomeMatch(c.nome, busca));
    if (!lid) {
      console.log(`\n=== ${busca}: NÃO encontrada em colaboradores Mesquita ===`);
      const { data: any } = await supabase.from('colaboradores').select('id, nome, role, unidade_id');
      const alt = (any ?? []).find((c) => nomeMatch(c.nome, busca));
      if (alt) {
        const { data: u } = await supabase.from('unidades').select('slug').eq('id', alt.unidade_id).maybeSingle();
        console.log(`  Encontrada noutra unidade (${u?.slug ?? alt.unidade_id}): ${alt.nome}, role=${alt.role}`);
      }
      continue;
    }

    const equipe = await listarEquipeSimulada(lid.id, lid.unidade_id);
    console.log(`\n=== Equipe para avaliar — ${lid.nome} (role ${lid.role}) ===`);
    console.log(`Membros listados: ${equipe.length}`);
    for (const m of equipe) console.log(`  - ${m.nome} (${m.setor ?? 'sem setor'})`);

    const faltando = colaboradoresMesquita.filter((c) => !equipe.some((e) => e.id === c.id));
    if (faltando.length) {
      console.log('  FALTANDO na equipe:');
      for (const c of faltando) console.log(`    ! ${c.nome} | setor: ${c.setor ?? '(vazio)'}`);
    } else if (colaboradoresMesquita.length) {
      console.log('  OK: todos os colaboradores Mesquita aparecem.');
    }
  }

  console.log('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
