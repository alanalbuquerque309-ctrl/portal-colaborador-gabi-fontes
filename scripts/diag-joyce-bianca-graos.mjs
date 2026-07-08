/**
 * Joyce / Jéssica / Jeane / Luciana + Bianca / Keila — avaliações vs Grãos.
 * Uso: node scripts/diag-joyce-bianca-graos.mjs
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function semanaAnterior(seg) {
  const [y, m, d] = seg.split('-').map((x) => parseInt(x, 10));
  const local = new Date(y, (m || 1) - 1, d || 1);
  local.setDate(local.getDate() - 7);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

const semanaGraos = segundaSemanaSaoPaulo();
const semanaOperacional = semanaAnterior(semanaGraos);
const semanasBusca = Array.from(new Set([semanaOperacional, semanaGraos]));

const nomesAlvo = ['jessica', 'jeane', 'luciana', 'bianca', 'joyce', 'keila'];

const { data: pessoas } = await supabase
  .from('colaboradores')
  .select('id, nome, role, setor, unidade_id, unidades(slug)')
  .or(
    nomesAlvo.map((n) => `nome.ilike.%${n}%`).join(',')
  );

async function avalsColaborador(cid) {
  const out = {};
  for (const sem of semanasBusca) {
    const { data } = await supabase
      .from('avaliacoes_diarias')
      .select('id, avaliador_id, data_referencia, assiduidade, media_dia, colaboradores:avaliador_id(nome, role)')
      .eq('colaborador_id', cid)
      .eq('data_referencia', sem);
    out[sem] = (data ?? []).map((r) => {
      const av = Array.isArray(r.colaboradores) ? r.colaboradores[0] : r.colaboradores;
      return {
        avaliador: av?.nome,
        role: av?.role,
        assiduidade: r.assiduidade,
        media: r.media_dia,
      };
    });
  }
  return out;
}

const resultado = {
  semana_graos_ui: semanaGraos,
  semana_operacional_avaliacao: semanaOperacional,
  semanas_buscadas: semanasBusca,
  pessoas: [],
};

for (const p of pessoas ?? []) {
  const un = Array.isArray(p.unidades) ? p.unidades[0] : p.unidades;
  const item = {
    nome: p.nome,
    role: p.role,
    setor: p.setor,
    unidade: un?.slug,
  };
  if (p.role === 'colaborador') {
    item.avaliacoes_recebidas = await avalsColaborador(p.id);
    const { data: graos } = await supabase
      .from('graos_movimentos')
      .select('missao, estado, graos, semana_inicio')
      .eq('colaborador_id', p.id)
      .eq('semana_inicio', semanaGraos)
      .neq('estado', 'cancelado');
    item.graos_semana = graos ?? [];
  }
  if (String(p.nome).toLowerCase().includes('joyce') || String(p.nome).toLowerCase().includes('keila')) {
    const { data: enviadas } = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, data_referencia, assiduidade, colaboradores:colaborador_id(nome)')
      .eq('avaliador_id', p.id)
      .in('data_referencia', semanasBusca);
    item.avaliacoes_enviadas = (enviadas ?? []).map((r) => {
      const c = Array.isArray(r.colaboradores) ? r.colaboradores[0] : r.colaboradores;
      return { colaborador: c?.nome, data_referencia: r.data_referencia, assiduidade: r.assiduidade };
    });
  }
  resultado.pessoas.push(item);
}

console.log(JSON.stringify(resultado, null, 2));
