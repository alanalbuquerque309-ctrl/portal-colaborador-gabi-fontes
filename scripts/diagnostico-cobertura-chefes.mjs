/** Contagem: todo colaborador vê o par certo de gerentes? */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv() {
  const p = path.join(root, '.env.local');
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
}
function norm(s) {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function roleNorm(role) {
  const r = norm(role);
  if (['admin', 'administrador'].includes(r)) return 'admin';
  if (['gerente', 'chefe', 'chefia', 'lider', 'lideranca', 'master'].includes(r)) return 'gerente';
  if (r === 'rh') return 'rh';
  if (r === 'socio') return 'socio';
  return r || 'colaborador';
}

const ESPERADO = {
  mesquita: ['Joyce Azevedo da Cruz', 'Silvia Antunes Ferreira'],
  barra: ['Lucas Diniz Gomes', 'Matheus Morais Rocha'],
  'nova-iguacu': ['Nathalia Pereira Luna Alves', 'Vanessa Barbosa da Silva Machado'],
  fabrica: ['Luís Henrique de Albuquerque', 'Sabrina Pereira Moreira'],
  administrativo: ['Daniel Brito Martins'],
};
const FABRICA_SETOR = {
  'fabrica de preparos': ['Joyce Azevedo da Cruz', 'Silvia Antunes Ferreira'],
  'fabrica de doces': ['Luís Henrique de Albuquerque', 'Sabrina Pereira Moreira'],
};
const BACKOFFICE = ['administracao', 'escritorio', 'cd', 'estoque', 'motorista', 'rh'];

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: unidades } = await sb.from('unidades').select('id, slug');
  const slugPorId = new Map((unidades ?? []).map((u) => [String(u.id), String(u.slug)]));
  const idPorSlug = new Map((unidades ?? []).map((u) => [String(u.slug), String(u.id)]));
  const fabricaId = idPorSlug.get('fabrica');
  const { data: cols } = await sb.from('colaboradores').select('id, nome, role, cargo, unidade_id, setor');
  const { data: lps } = await sb.from('lideres_por_setor').select('unidade_id, setor, lider_id, ativo');
  const ativos = (lps ?? []).filter((r) => r.ativo);
  const byId = new Map((cols ?? []).map((c) => [String(c.id), c]));

  function chefes(c) {
    const uid = String(c.unidade_id ?? '');
    const nSetor = norm(c.setor);
    const fabrica = nSetor === 'fabrica de preparos' || nSetor === 'fabrica de doces';
    const uidL = fabrica && fabricaId ? fabricaId : uid;
    const ids = new Set();
    for (const v of ativos) {
      const vUid = String(v.unidade_id);
      const vSetor = String(v.setor ?? '').trim();
      if (fabrica) {
        if (vUid === uidL && norm(vSetor) === nSetor) ids.add(String(v.lider_id));
      } else if (vUid === uid && (vSetor === '*' || norm(vSetor) === nSetor || (nSetor === 'estoque' && norm(vSetor) === 'cd'))) {
        ids.add(String(v.lider_id));
      }
    }
    const nomes = [];
    for (const id of ids) {
      if (id === String(c.id)) continue;
      const lider = byId.get(id);
      if (!lider) continue;
      if (roleNorm(lider.role) === 'admin' && !BACKOFFICE.includes(nSetor)) continue;
      nomes.push(String(lider.nome));
    }
    return nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  const divergencias = [];
  const ok = [];
  for (const c of cols ?? []) {
    if (roleNorm(c.role) !== 'colaborador') continue;
    const slug = slugPorId.get(String(c.unidade_id ?? '')) ?? '';
    const nSetor = norm(c.setor);
    let esperado = FABRICA_SETOR[nSetor] ?? ESPERADO[slug] ?? [];
    if (slug === 'administrativo' && nSetor === 'marketing') esperado = [];
    const visto = chefes(c);
    const same = esperado.length === visto.length && esperado.every((n) => visto.includes(n));
    const row = { nome: c.nome, unidade: slug, setor: c.setor, esperado, visto };
    if (same) ok.push(row);
    else divergencias.push(row);
  }

  console.log(JSON.stringify({
    colaboradores: ok.length + divergencias.length,
    bate_com_par_esperado: ok.length,
    divergencias,
    fabrica_preparos: (cols ?? [])
      .filter((c) => norm(c.setor) === 'fabrica de preparos')
      .map((c) => ({ nome: c.nome, role: c.role, unidade: slugPorId.get(String(c.unidade_id)), chefes: chefes(c) })),
  }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
