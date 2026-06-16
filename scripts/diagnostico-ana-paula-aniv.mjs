import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(portalRoot, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key);
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const [, mesStr, diaStr] = hoje.split('-');
const mes = Number(mesStr);
const dia = Number(diaStr);

function anivHoje(nasc) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nasc ?? '').slice(0, 10));
  if (!m) return false;
  return Number(m[2]) === mes && Number(m[3]) === dia;
}

function anivMes(nasc) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nasc ?? '').slice(0, 10));
  if (!m) return false;
  return Number(m[2]) === mes;
}

const { data: anaRows, error: errAna } = await sb
  .from('colaboradores')
  .select('id, nome, data_nascimento, data_admissao, role, updated_at, unidades(nome, slug)')
  .ilike('nome', '%Ana Paula%');

if (errAna) {
  console.error(errAna.message);
  process.exit(1);
}

console.log('=== Ana Paula — aniversário ===');
console.log('Hoje (BR):', hoje);
console.log('Registros encontrados:', anaRows?.length ?? 0);
for (const c of anaRows ?? []) {
  const u = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
  console.log({
    id: c.id,
    nome: c.nome,
    role: c.role,
    data_nascimento: c.data_nascimento,
    data_admissao: c.data_admissao,
    unidade: u?.nome,
    slug: u?.slug,
    aniversario_hoje: anivHoje(c.data_nascimento),
    aniversario_mes: anivMes(c.data_nascimento),
    updated_at: c.updated_at,
  });
}

const { data: todos, error: errTodos } = await sb
  .from('colaboradores')
  .select('nome, data_nascimento, unidades(nome)')
  .not('data_nascimento', 'is', null);

if (errTodos) {
  console.error(errTodos.message);
  process.exit(1);
}

const doDia = (todos ?? []).filter((c) => anivHoje(c.data_nascimento));
console.log('\n=== Todos aniversariantes de hoje ===');
console.log('Total:', doDia.length);
for (const c of doDia) {
  const u = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
  console.log(` - ${c.nome} | ${u?.nome ?? '?'} | nasc ${String(c.data_nascimento).slice(0, 10)}`);
}

const doMes = (todos ?? []).filter((c) => anivMes(c.data_nascimento));
console.log('\n=== Total aniversariantes em junho ===', doMes.length);
for (const c of doMes) {
  const u = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
  console.log(` - ${c.nome} | ${u?.nome ?? '?'} | nasc ${String(c.data_nascimento).slice(0, 10)}`);
}

const { data: barra } = await sb.from('unidades').select('id').eq('slug', 'barra').maybeSingle();
if (barra?.id) {
  const { data: barraCols } = await sb
    .from('colaboradores')
    .select('nome, data_nascimento')
    .eq('unidade_id', barra.id)
    .order('nome');
  console.log('\n=== Barra — todos colaboradores ===');
  for (const c of barraCols ?? []) {
    console.log(` - ${c.nome} | nasc ${c.data_nascimento ?? 'NULL'}`);
  }
}

const { data: paula } = await sb
  .from('colaboradores')
  .select('nome, data_nascimento, unidades(nome)')
  .or('nome.ilike.%Paula%,nome.ilike.%Ana %');
console.log('\n=== Nomes com Paula ou Ana ===');
for (const c of paula ?? []) {
  const u = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
  console.log(` - ${c.nome} | ${u?.nome ?? '?'} | nasc ${c.data_nascimento ?? 'NULL'}`);
}
