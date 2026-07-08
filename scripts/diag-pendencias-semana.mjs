/**
 * Diagnóstico local: pendências vs avaliações gravadas (semana passada SP).
 * Uso: node scripts/diag-pendencias-semana.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

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

function semanaAnteriorSaoPaulo(ref = new Date()) {
  const cur = segundaSemanaSaoPaulo(ref);
  const [y, m, d] = cur.split('-').map((x) => parseInt(x, 10));
  const local = new Date(y, (m || 1) - 1, d || 1);
  local.setDate(local.getDate() - 7);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

const JUST_FORA = 'Fora do plantão deste líder';
const JUST_FERIAS = 'Colaborador de férias nesta semana';

function fechaLider(row) {
  if (row.ignorada === true) return false;
  const j = String(row.justificativa_nota_baixa ?? '');
  if (j === JUST_FORA) return false;
  if (row.assiduidade === 'falta_injustificada') return true;
  if (j.includes('férias') || j.includes('ferias')) return true;
  return row.media_dia != null && !Number.isNaN(Number(row.media_dia));
}

const dataRef = semanaAnteriorSaoPaulo();
console.log('Semana monitorada (segunda):', dataRef);

const { data: cols } = await supabase
  .from('colaboradores')
  .select('id, nome, role, onboarding_completo')
  .eq('role', 'colaborador')
  .eq('onboarding_completo', true);

const colabIds = (cols ?? []).map((c) => String(c.id));
console.log('Colaboradores ativos (onboarding ok):', colabIds.length);

const { data: avals, error } = await supabase
  .from('avaliacoes_diarias')
  .select('colaborador_id, avaliador_id, assiduidade, media_dia, justificativa_nota_baixa, ignorada')
  .eq('data_referencia', dataRef);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const porColab = new Map();
for (const a of avals ?? []) {
  const cid = String(a.colaborador_id);
  if (!porColab.has(cid)) porColab.set(cid, []);
  porColab.get(cid).push(a);
}

let comAlgumaLinha = 0;
let comFechamentoLider = 0;
let soForaPlantao = 0;
let semLinha = 0;

for (const id of colabIds) {
  const rows = porColab.get(id) ?? [];
  if (rows.length === 0) {
    semLinha++;
    continue;
  }
  comAlgumaLinha++;
  const fecha = rows.some(fechaLider);
  if (fecha) comFechamentoLider++;
  else if (rows.every((r) => String(r.justificativa_nota_baixa ?? '') === JUST_FORA)) soForaPlantao++;
}

console.log({
  avaliacoes_linhas_total: (avals ?? []).length,
  colabs_com_alguma_linha: comAlgumaLinha,
  colabs_com_nota_lider_fechada: comFechamentoLider,
  colabs_so_fora_plantao: soForaPlantao,
  colabs_sem_nenhuma_linha: semLinha,
  colabs_ainda_pendentes_lider: colabIds.length - comFechamentoLider,
});

const { data: lideres } = await supabase
  .from('colaboradores')
  .select('id, nome, role')
  .in('role', ['gerente', 'master', 'admin']);

for (const lid of lideres ?? []) {
  const lidId = String(lid.id);
  const { data: feitas } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id')
    .eq('avaliador_id', lidId)
    .eq('data_referencia', dataRef);
  const qtd = new Set((feitas ?? []).map((r) => String(r.colaborador_id))).size;
  if (qtd > 0) console.log(`  ${lid.nome}: ${qtd} avaliações enviadas`);
}
