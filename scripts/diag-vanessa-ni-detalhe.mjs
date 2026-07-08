/**
 * Vanessa / Nova Iguaçu: quem vê quem, avaliações da semana passada.
 * Uso: node scripts/diag-vanessa-ni-detalhe.mjs
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

const semanaAtual = segundaSemanaSaoPaulo();
const semanaPassada = semanaAnterior(semanaAtual);

const { data: unidade } = await supabase.from('unidades').select('id').eq('slug', 'nova-iguacu').maybeSingle();
const uid = unidade?.id;

const { data: vanessa } = await supabase
  .from('colaboradores')
  .select('id, nome, role')
  .eq('unidade_id', uid)
  .ilike('nome', 'Vanessa%')
  .maybeSingle();

const vanessaId = vanessa?.id;

const { data: cols } = await supabase
  .from('colaboradores')
  .select('id, nome, setor, role, onboarding_completo')
  .eq('unidade_id', uid)
  .eq('role', 'colaborador')
  .order('nome');

const { data: lps } = await supabase
  .from('lideres_por_setor')
  .select('lider_id, setor, plantao_paridade, colaboradores:lider_id(nome)')
  .eq('unidade_id', uid)
  .eq('ativo', true);

let avalsVanessaComoAvaliado = [];
let avalsVanessaComoAvaliador = [];
if (vanessaId) {
  const r1 = await supabase
    .from('avaliacoes_lideranca')
    .select('avaliador_id')
    .eq('avaliado_id', vanessaId)
    .eq('semana_inicio', semanaPassada);
  avalsVanessaComoAvaliado = r1.data ?? [];

  const r2 = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id')
    .eq('avaliador_id', vanessaId)
    .eq('data_referencia', semanaPassada);
  avalsVanessaComoAvaliador = r2.data ?? [];
}

const avaliadoresVanessa = new Set(avalsVanessaComoAvaliado.map((r) => r.avaliador_id));
const avaliadosPorVanessa = new Set(avalsVanessaComoAvaliador.map((r) => r.colaborador_id));

const porColab = (cols ?? []).map((c) => {
  const setor = String(c.setor ?? '').trim();
  const liderIds = new Set();
  for (const row of lps ?? []) {
    if (row.setor === '*' || row.setor === setor) liderIds.add(row.lider_id);
  }
  return {
    nome: c.nome,
    setor: setor || '(vazio)',
    ve_vanessa_como_lider: vanessaId ? liderIds.has(vanessaId) : false,
    qtd_lideres_config: liderIds.size,
    avaliou_vanessa_semana_passada: avaliadoresVanessa.has(c.id),
    vanessa_avaliou_colab_semana_passada: avaliadosPorVanessa.has(c.id),
  };
});

const { data: nathalia } = await supabase
  .from('colaboradores')
  .select('id, nome')
  .eq('unidade_id', uid)
  .ilike('nome', 'Nathalia%')
  .maybeSingle();

let nathaliaStats = null;
if (nathalia?.id) {
  const r1 = await supabase
    .from('avaliacoes_diarias')
    .select('id', { count: 'exact', head: true })
    .eq('avaliador_id', nathalia.id)
    .eq('data_referencia', semanaPassada);
  const r2 = await supabase
    .from('avaliacoes_lideranca')
    .select('id', { count: 'exact', head: true })
    .eq('avaliado_id', nathalia.id)
    .eq('semana_inicio', semanaPassada);
  nathaliaStats = {
    nome: nathalia.nome,
    avaliou_equipe: r1.count ?? 0,
    recebeu_avaliacao_lideranca: r2.count ?? 0,
  };
}

console.log(
  JSON.stringify(
    {
      semana_passada_operacional: semanaPassada,
      vanessa: vanessa ? { id: vanessa.id, nome: vanessa.nome, role: vanessa.role } : null,
      resumo: {
        colaboradores_ni: cols?.length ?? 0,
        veem_vanessa_como_lider: porColab.filter((p) => p.ve_vanessa_como_lider).length,
        avaliaram_vanessa_lideranca: avalsVanessaComoAvaliado.length,
        vanessa_avaliou_equipe: avalsVanessaComoAvaliador.length,
        cols_sem_avaliacao_vanessa: porColab.filter(
          (p) => p.ve_vanessa_como_lider && !p.vanessa_avaliou_colab_semana_passada
        ).length,
      },
      nathalia: nathaliaStats,
      gerentes_asterisco: (lps ?? [])
        .filter((r) => r.setor === '*')
        .map((r) => {
          const c = Array.isArray(r.colaboradores) ? r.colaboradores[0] : r.colaboradores;
          return { nome: c?.nome, lider_id: r.lider_id, paridade: r.plantao_paridade };
        }),
      por_colaborador: porColab,
    },
    null,
    2
  )
);
