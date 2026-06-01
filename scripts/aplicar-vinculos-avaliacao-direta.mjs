/**
 * Materializa colaboradores_lideres das regras em src/lib/config-avaliacao-direta.ts
 * Uso: npm run db:avaliacao-direta
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const REGRAS = [
  {
    avaliadores_nomes: ['Gabriela Fontes', 'Gabriela'],
    colaboradores_nomes: ['Thaís Mathias', 'Thais Mathias', 'Lucas Gomes'],
  },
  {
    avaliadores_nomes: ['Keila Campos', 'Keila'],
    colaboradores_nomes: ['Thaís Mathias', 'Thais Mathias', 'Lucas Gomes'],
  },
  {
    avaliadores_nomes: ['Daniel Martins', 'Daniel Brito', 'Daniel'],
    colaboradores_nomes: ['Keila Campos', 'Keila'],
  },
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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

function idsPorNomes(todos, padroes) {
  const ids = [];
  for (const c of todos) {
    if (padroes.some((p) => nomeCoincide(c.nome, p))) ids.push(c.id);
  }
  return ids;
}

const { data: todos, error: errList } = await sb.from('colaboradores').select('id, nome');
if (errList) throw errList;

let vinculos = 0;
const agora = new Date().toISOString();

for (const regra of REGRAS) {
  const avaliadores = idsPorNomes(todos, regra.avaliadores_nomes);
  const alvos = idsPorNomes(todos, regra.colaboradores_nomes);
  console.log(
    `Regra: ${regra.avaliadores_nomes[0]} → ${regra.colaboradores_nomes.join(', ')} (${avaliadores.length}×${alvos.length})`
  );
  for (const colaborador_id of alvos) {
    for (const lider_id of avaliadores) {
      if (colaborador_id === lider_id) continue;
      const { error } = await sb.from('colaboradores_lideres').upsert(
        { colaborador_id, lider_id, ativo: true, updated_at: agora },
        { onConflict: 'colaborador_id,lider_id' }
      );
      if (error) throw error;
      vinculos += 1;
    }
  }
}

console.log(`OK: ${vinculos} vínculos (avaliação direta).`);
