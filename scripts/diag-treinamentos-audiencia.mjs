/**
 * Diagnóstico: treinamentos vigentes, audiência e confirmações.
 * Uso: node scripts/diag-treinamentos-audiencia.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

function partesSaoPaulo(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return { y, mo, day, wd, iso: `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

function inicioCicloTreinoQuintaIsoSp(ref = new Date()) {
  const { y, mo, day } = partesSaoPaulo(ref);
  const local = new Date(y, mo - 1, day);
  const dow = local.getDay();
  let daysBack = 0;
  if (dow >= 4) daysBack = dow - 4;
  else if (dow === 0) daysBack = 3;
  else daysBack = dow + 3;
  local.setDate(local.getDate() - daysBack);
  const ys = local.getFullYear();
  const ms = String(local.getMonth() + 1).padStart(2, '0');
  const ds = String(local.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

function roleRecebeLideranca(role) {
  const r = String(role ?? '').trim().toLowerCase();
  return r === 'gerente' || r === 'master' || r === 'socio';
}

function recebePublico(colab, publico) {
  if (publico === 'lideranca') return roleRecebeLideranca(colab.role);
  if (publico === 'todos') return true;
  return false;
}

const ciclo = inicioCicloTreinoQuintaIsoSp();
const cicloUtc = `${ciclo}T03:00:00.000Z`;
console.log('Hoje SP:', partesSaoPaulo().iso, partesSaoPaulo().wd);
console.log('Ciclo quinta vigente desde:', ciclo, 'UTC:', cicloUtc);
console.log('---');

const { data: treinos, error: errT } = await supabase
  .from('treinamentos')
  .select('id, titulo, publico_alvo, tipo_conteudo, exige_confirmacao, ativo, created_at')
  .order('created_at', { ascending: false });

if (errT) {
  console.error('Erro treinamentos:', errT.message);
  process.exit(1);
}

console.log('TREINAMENTOS NO BANCO:');
for (const t of treinos ?? []) {
  const vigente = String(t.created_at) >= cicloUtc;
  console.log(`  [${t.ativo ? 'ativo' : 'inativo'}] ${t.titulo}`);
  console.log(`    id: ${t.id}`);
  console.log(`    publico: ${t.publico_alvo} | tipo: ${t.tipo_conteudo} | exige_conf: ${t.exige_confirmacao}`);
  console.log(`    created_at: ${t.created_at} | vigente_ciclo: ${vigente}`);
}

console.log('---');

const { data: avisos } = await supabase
  .from('avisos')
  .select('id, titulo, publico_alvo, ativo, data_publicacao, exige_confirmacao')
  .eq('ativo', true)
  .order('data_publicacao', { ascending: false })
  .limit(10);

console.log('AVISOS ATIVOS (últimos 10):');
for (const a of avisos ?? []) {
  console.log(`  ${a.titulo} | publico: ${a.publico_alvo} | pub: ${a.data_publicacao}`);
}

console.log('---');

const { data: colabs } = await supabase
  .from('colaboradores')
  .select('id, nome, role, setor, unidades(slug)')
  .neq('role', 'admin')
  .order('nome');

for (const t of treinos ?? []) {
  if (!t.ativo) continue;
  const publico = t.publico_alvo || 'todos';
  const esperados = (colabs ?? []).filter((c) => {
    const un = c.unidades;
    const u = Array.isArray(un) ? un[0] : un;
    return recebePublico({ role: c.role, unidade_slug: u?.slug }, publico);
  });

  const ids = esperados.map((c) => c.id);
  const { data: vis } = await supabase
    .from('treinamento_visualizacoes')
    .select('colaborador_id')
    .eq('treinamento_id', t.id)
    .in('colaborador_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

  const { data: conf } = await supabase
    .from('treinamento_confirmacoes')
    .select('colaborador_id')
    .eq('treinamento_id', t.id)
    .in('colaborador_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

  const visSet = new Set((vis ?? []).map((r) => r.colaborador_id));
  const confSet = new Set((conf ?? []).map((r) => r.colaborador_id));

  const confNomes = esperados.filter((c) => confSet.has(c.id)).map((c) => c.nome);
  const visNomes = esperados
    .filter((c) => visSet.has(c.id) && !confSet.has(c.id))
    .map((c) => c.nome);

  console.log(`AUDIÊNCIA: ${t.titulo} (${publico})`);
  console.log(`  Esperados: ${esperados.length}`);
  console.log(`  Confirmaram (${confNomes.length}): ${confNomes.join(', ') || '—'}`);
  console.log(`  Só visualizaram (${visNomes.length}): ${visNomes.join(', ') || '—'}`);
  console.log(`  Não fizeram: ${esperados.length - confNomes.length - visNomes.length}`);
}

console.log('---');
console.log('PAPEL DOS QUE CONFIRMARAM:');
const { data: confAll } = await supabase
  .from('treinamento_confirmacoes')
  .select('treinamento_id, confirmado_em, colaboradores(nome, role)');
for (const row of confAll ?? []) {
  const c = row.colaboradores;
  const col = Array.isArray(c) ? c[0] : c;
  const titulo = (treinos ?? []).find((t) => t.id === row.treinamento_id)?.titulo ?? row.treinamento_id;
  console.log(`  ${col?.nome} (${col?.role}) → ${titulo}`);
}

console.log('---');
console.log('AVISOS — visibilidade esta semana civil:');
function segundaSemanaSaoPaulo(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}
const semanaAtual = segundaSemanaSaoPaulo();
console.log('  Semana civil atual (segunda):', semanaAtual);
for (const a of avisos ?? []) {
  const d = new Date(a.data_publicacao);
  const semanaAviso = segundaSemanaSaoPaulo(d);
  const visivel = semanaAviso === semanaAtual;
  console.log(`  ${visivel ? 'VISÍVEL' : 'OCULTO'} | ${a.titulo} | ${a.publico_alvo} | exige_conf: ${a.exige_confirmacao} | semana aviso: ${semanaAviso}`);
}

console.log('---');
console.log('PAINEL GESTÃO (mesma regra do portal — sócios fora de «todos»):');
for (const t of treinos ?? []) {
  if (!t.ativo) continue;
  const publico = t.publico_alvo || 'todos';
  const esperados = (colabs ?? []).filter((c) => {
    const r = String(c.role ?? '').toLowerCase();
    if (r === 'admin') return false;
    if (publico !== 'lideranca' && r === 'socio') return false;
    const un = c.unidades;
    const u = Array.isArray(un) ? un[0] : un;
    return recebePublico({ role: c.role, unidade_slug: u?.slug }, publico);
  });
  const ids = esperados.map((c) => c.id);
  const { data: vis } = await supabase
    .from('treinamento_visualizacoes')
    .select('colaborador_id')
    .eq('treinamento_id', t.id)
    .in('colaborador_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const { data: conf } = await supabase
    .from('treinamento_confirmacoes')
    .select('colaborador_id')
    .eq('treinamento_id', t.id)
    .in('colaborador_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const visSet = new Set((vis ?? []).map((r) => r.colaborador_id));
  const confSet = new Set((conf ?? []).map((r) => r.colaborador_id));
  const confN = esperados.filter((c) => confSet.has(c.id)).length;
  const visN = esperados.filter((c) => visSet.has(c.id) && !confSet.has(c.id)).length;
  console.log(`  ${t.titulo}: ${confN}/${esperados.length} concluíram | ${visN} só visualizaram | ${esperados.length - confN - visN} não fizeram`);
}

console.log('---');
console.log('AMOSTRA QUEM VÊ CADA TREINO:');
const amostra = (colabs ?? []).filter((c) => {
  const r = String(c.role).toLowerCase();
  return r === 'colaborador' || r === 'gerente' || r === 'master';
});
const colabSample = amostra.filter((c) => String(c.role).toLowerCase() === 'colaborador').slice(0, 3);
const liderSample = amostra.filter((c) => roleRecebeLideranca(c.role)).slice(0, 3);

for (const c of [...colabSample, ...liderSample]) {
  const un = c.unidades;
  const u = Array.isArray(un) ? un[0] : un;
  const vê = (treinos ?? [])
    .filter((t) => t.ativo && recebePublico({ role: c.role, unidade_slug: u?.slug }, t.publico_alvo || 'todos'))
    .map((t) => t.titulo);
  console.log(`  ${c.nome} (${c.role}): ${vê.join(' | ') || 'nenhum'}`);
}
