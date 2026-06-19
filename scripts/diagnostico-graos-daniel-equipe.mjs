/** Equipe Daniel + graos + avaliacoes por semana. */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function segundaSemanaSaoPaulo(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  local.setDate(local.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

const semAtual = segundaSemanaSaoPaulo();
const d = new Date(semAtual);
d.setDate(d.getDate() - 7);
const semPassada = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const { data: daniel } = await sb.from('colaboradores').select('id, nome').ilike('nome', '%Daniel%Brito%').maybeSingle();
if (!daniel) { console.log('Daniel não encontrado'); process.exit(1); }

const { data: cfg } = await sb.from('lideres_por_setor').select('unidade_id, setor').eq('lider_id', daniel.id).eq('ativo', true);
const wild = (cfg ?? []).some((r) => r.setor === '*');

let equipeIds = new Set();
if (wild) {
  const { data: cols } = await sb.from('colaboradores').select('id, nome, setor').eq('role', 'colaborador');
  for (const c of cols ?? []) equipeIds.add(c.id);
} else {
  for (const row of cfg ?? []) {
    let q = sb.from('colaboradores').select('id, nome, setor').eq('unidade_id', row.unidade_id).eq('role', 'colaborador');
    if (row.setor !== '*') q = q.eq('setor', row.setor);
    const { data } = await q;
    for (const c of data ?? []) equipeIds.add(c.id);
  }
}

console.log(`Daniel: ${daniel.nome} | equipe ~${equipeIds.size} | sem atual ${semAtual} | sem passada ${semPassada}\n`);

for (const id of [...equipeIds].slice(0, 40)) {
  const { data: col } = await sb.from('colaboradores').select('nome').eq('id', id).single();
  const nome = col?.nome ?? id;

  const { data: movs } = await sb
    .from('graos_movimentos')
    .select('estado, graos, semana_inicio, missao')
    .eq('colaborador_id', id)
    .in('semana_inicio', [semAtual, semPassada])
    .gt('graos', 0);

  const pend = (movs ?? []).filter((m) => m.estado === 'pendente').reduce((s, m) => s + m.graos, 0);
  const conf = (movs ?? []).filter((m) => m.estado === 'confirmado').reduce((s, m) => s + m.graos, 0);

  const { data: avPass } = await sb.from('avaliacoes_diarias').select('assiduidade, avaliador_id').eq('colaborador_id', id).eq('data_referencia', semPassada).limit(1);
  const { data: avAtual } = await sb.from('avaliacoes_diarias').select('assiduidade, avaliador_id').eq('colaborador_id', id).eq('data_referencia', semAtual).limit(1);

  const avP = avPass?.[0];
  const avA = avAtual?.[0];
  const danielAvalPass = avP?.avaliador_id === daniel.id;
  const danielAvalAtual = avA?.avaliador_id === daniel.id;

  if (pend > 0 || conf > 0 || avP || avA) {
    console.log(`${nome}`);
    console.log(`  grãos ${semPassada}: conf=${conf} pend=${pend} (movs sem passada+atual)`);
    console.log(`  aval ${semPassada}: ${avP ? `${avP.assiduidade}${danielAvalPass ? ' (Daniel)' : ''}` : '—'}`);
    console.log(`  aval ${semAtual}: ${avA ? `${avA.assiduidade}${danielAvalAtual ? ' (Daniel)' : ''}` : '—'}`);
  }
}
