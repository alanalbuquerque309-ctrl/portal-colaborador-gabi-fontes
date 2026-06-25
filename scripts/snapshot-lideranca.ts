/**
 * Fase 0 — Baseline de liderança (READ-ONLY, não altera nada).
 *
 * Para cada líder ativo hoje, grava a equipe retornada pela MESMA função de
 * runtime usada no portal (`listarEquipeParaAvaliacaoSemanal`), além de um
 * dump de `lideres_por_setor` e `colaboradores_lideres` ativos.
 *
 * Serve de baseline de regressão: depois de cada fase, rodar de novo e
 * comparar os `equipe_ids` por líder. Diff != 0 => trava a fase.
 *
 * Uso: npm run lideranca:snapshot
 * Saída: scripts/_snapshots/lideranca-<timestamp>.json (+ lideranca-base.json na 1ª vez)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAdminClient } from '../src/lib/supabase/admin';
import { listarEquipeParaAvaliacaoSemanal } from '../src/lib/colaborador-lideres';
import { listarIdsLideresAtivos } from '../src/lib/lider-inspirador';

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

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function lerLideresPorSetor(supabase: SupabaseAdmin) {
  const comPlantao = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor, lider_id, ativo, plantao_paridade, plantao_paridade_mes_ref')
    .eq('ativo', true);
  if (!comPlantao.error) return comPlantao.data ?? [];

  const base = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor, lider_id, ativo')
    .eq('ativo', true);
  if (base.error) throw new Error(base.error.message);
  return base.data ?? [];
}

async function main() {
  loadEnv();
  const supabase = createAdminClient();

  const liderIds = await listarIdsLideresAtivos(supabase);

  const { data: cols, error: errCols } = await supabase
    .from('colaboradores')
    .select('id, nome, role, unidade_id')
    .in('id', liderIds.length > 0 ? liderIds : ['00000000-0000-0000-0000-000000000000']);
  if (errCols) throw new Error(errCols.message);
  const byId = new Map((cols ?? []).map((c) => [String(c.id), c]));

  const lideres: Array<Record<string, unknown>> = [];
  for (const id of liderIds) {
    const c = byId.get(id);
    const unidadeId = c?.unidade_id ? String(c.unidade_id) : '';
    let equipeIds: string[] = [];
    let erro: string | null = null;
    try {
      const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, id, unidadeId);
      equipeIds = equipe.map((m) => String(m.id)).sort();
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
    lideres.push({
      lider_id: id,
      nome: c?.nome ?? null,
      role: c?.role ?? null,
      unidade_id: unidadeId || null,
      equipe_n: equipeIds.length,
      equipe_ids: equipeIds,
      erro,
    });
  }
  lideres.sort((a, b) => String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR'));

  const lps = await lerLideresPorSetor(supabase);
  const { data: cl } = await supabase
    .from('colaboradores_lideres')
    .select('colaborador_id, lider_id, ativo')
    .eq('ativo', true);

  const snapshot = {
    gerado_em: new Date().toISOString(),
    total_lideres: lideres.length,
    lideres,
    lideres_por_setor_ativos: lps,
    colaboradores_lideres_ativos: cl ?? [],
  };

  const dir = path.join(__dirname, '_snapshots');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const arquivo = path.join(dir, `lideranca-${stamp}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(snapshot, null, 2), 'utf8');

  const base = path.join(dir, 'lideranca-base.json');
  let baseCriada = false;
  if (!fs.existsSync(base)) {
    fs.writeFileSync(base, JSON.stringify(snapshot, null, 2), 'utf8');
    baseCriada = true;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        arquivo: path.relative(root, arquivo),
        baseline: baseCriada ? path.relative(root, base) : 'já existia (preservada)',
        total_lideres: lideres.length,
        lideres_com_erro: lideres.filter((l) => l.erro).map((l) => ({ nome: l.nome, erro: l.erro })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('[lideranca:snapshot] ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
});
