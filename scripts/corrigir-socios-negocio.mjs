/**
 * Corrige cadastro de sócios de negócio: role=socio, remove vínculos de liderança operacional.
 * Uso: npm run db:corrigir-socios-negocio -- --confirmar
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const SOCIOS_NEGOCIO_NOMES = [
  'Alan Albuquerque',
  'Alan',
  'Gabriela Fontes',
  'Gabriela',
  'Daniele Aparecida',
  'Daniele Fontes Barbosa',
  'Hilton Jorge',
  'Hilton',
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const confirmar = process.argv.includes('--confirmar');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const sb = createClient(url, key);

function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nomeCoincide(cadastro, busca) {
  const a = norm(cadastro);
  const b = norm(busca);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const partes = b.split(/\s+/).filter((p) => p.length > 2);
  if (partes.length >= 2) return partes.every((p) => a.includes(p));
  return false;
}

function ehSocioNegocio(nome, role) {
  const r = norm(role);
  if (r === 'socio') return true;
  return SOCIOS_NEGOCIO_NOMES.some((p) => nomeCoincide(nome, p));
}

const { data: todos, error } = await sb.from('colaboradores').select('id, nome, role');
if (error) throw error;

const alvos = (todos ?? []).filter((c) => ehSocioNegocio(c.nome, c.role));
if (alvos.length === 0) {
  console.log('Nenhum sócio de negócio encontrado por nome/role.');
  process.exit(0);
}

console.log('Sócios de negócio identificados:');
for (const c of alvos) {
  console.log(`  - ${c.nome} (role atual: ${c.role ?? '?'})`);
}

if (!confirmar) {
  console.log('\nDry-run. Rode com --confirmar para aplicar role=socio e desativar liderança.');
  process.exit(0);
}

const agora = new Date().toISOString();
for (const c of alvos) {
  const id = String(c.id);
  const { error: errUp } = await sb
    .from('colaboradores')
    .update({
      role: 'socio',
      lider_id: null,
      onboarding_completo: true,
      termo_aceite_em: agora,
      updated_at: agora,
    })
    .eq('id', id);
  if (errUp) {
    console.error(`Erro ao atualizar ${c.nome}:`, errUp.message);
    continue;
  }

  await sb
    .from('colaboradores_lideres')
    .update({ ativo: false, updated_at: agora })
    .eq('colaborador_id', id);

  await sb
    .from('lideres_por_setor')
    .update({ ativo: false, updated_at: agora })
    .eq('lider_id', id);

  console.log(`OK: ${c.nome} → socio (liderança operacional desativada)`);
}

console.log('Concluído.');
