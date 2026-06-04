/**
 * Contagem rápida para pendentes da semana (sem buildMapaAvaliadoresEsperados).
 * Uso: node scripts/diagnostico-pendentes-semana.mjs [YYYY-MM-DD]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

function loadEnvFile(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  }
  return out;
}

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

function semanaAnterior(segundaIso) {
  const [y, m, d] = segundaIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 7);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

const FORA_PLANTAO = 'Fora do plantão deste líder (outro líder avalia nesta semana).';

function assiduidadeDoBanco(stored, justificativa) {
  const s = String(stored ?? '').trim();
  const j = String(justificativa ?? '').trim();
  if (s === 'falta_justificada' && j === FORA_PLANTAO) return 'fora_plantao';
  if (s === 'presente' || s === 'falta_injustificada' || s === 'falta_justificada') return s;
  return 'presente';
}

function fechaLider(row, rhIds) {
  if (rhIds.has(row.avaliador_id) || String(row.avaliador_role ?? '').toLowerCase() === 'rh') return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return false;
  if (a === 'falta_injustificada') return true;
  return row.media_dia != null && !Number.isNaN(Number(row.media_dia));
}

function fechaRh(row, rhIds) {
  if (!rhIds.has(row.avaliador_id) && String(row.avaliador_role ?? '').toLowerCase() !== 'rh') return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'folga' || a === 'outra_escala' || a === 'fora_plantao') return true;
  return row.media_dia != null && !Number.isNaN(Number(row.media_dia));
}

const env = { ...loadEnvFile(portalRoot), ...process.env };
const url = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const key = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
if (!url || !key) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const dataRef = process.argv[2]?.trim() || semanaAnterior(segundaSemanaSaoPaulo());
const sb = createClient(url, key);

const { data: cols, error: errC } = await sb
  .from('colaboradores')
  .select('id, nome, role')
  .eq('role', 'colaborador');
if (errC) {
  console.error(errC.message);
  process.exit(1);
}

const colabIds = new Set((cols ?? []).map((c) => c.id));

const { data: avs, error: errA } = await sb
  .from('avaliacoes_diarias')
  .select('colaborador_id, avaliador_id, assiduidade, media_dia, justificativa_nota_baixa')
  .eq('data_referencia', dataRef)
  .in('colaborador_id', Array.from(colabIds));
if (errA) {
  console.error(errA.message);
  process.exit(1);
}

const { data: roles } = await sb.from('colaboradores').select('id, role');
const rhIds = new Set(
  (roles ?? [])
    .filter((r) => String(r.role ?? '').toLowerCase() === 'rh')
    .map((r) => r.id)
);

const porColab = new Map();
for (const r of avs ?? []) {
  if (!colabIds.has(r.colaborador_id)) continue;
  const list = porColab.get(r.colaborador_id) ?? [];
  list.push({ ...r, avaliador_role: roles?.find((x) => x.id === r.avaliador_id)?.role ?? null });
  porColab.set(r.colaborador_id, list);
}

let semLider = 0;
let semRh = 0;
let completos = 0;
let soForaPlantao = 0;

for (const id of colabIds) {
  const rows = porColab.get(id) ?? [];
  const temLider = rows.some((r) => fechaLider(r, rhIds));
  const temRh = rows.some((r) => fechaRh(r, rhIds));
  const temAlguma = rows.length > 0;
  const soFora = temAlguma && !temLider && rows.every((r) => {
    const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
    return a === 'fora_plantao' || rhIds.has(r.avaliador_id);
  });

  if (!temLider) semLider++;
  if (!temRh) semRh++;
  if (temLider && temRh) completos++;
  if (soFora) soForaPlantao++;
}

console.log('');
console.log('=== Pendentes (aprox.) — colaboradores role=colaborador ===');
console.log(`Semana (segunda): ${dataRef}`);
console.log(`Total colaboradores: ${colabIds.size}`);
console.log(`Sem avaliação de líder válida: ${semLider}`);
console.log(`Sem Visita RH válida: ${semRh}`);
console.log(`Com líder + RH na semana: ${completos}`);
console.log(`Só fora plantão / RH sem nota líder: ${soForaPlantao}`);
console.log(`Pendente (sem líder OU sem RH): ${Array.from(colabIds).filter((id) => {
  const rows = porColab.get(id) ?? [];
  const temLider = rows.some((r) => fechaLider(r, rhIds));
  const temRh = rows.some((r) => fechaRh(r, rhIds));
  return !temLider || !temRh;
}).length}`);
console.log('');
