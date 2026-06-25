/**
 * Fase 1 — Auditoria banco vs nome (READ-ONLY, não altera nada).
 *
 * Para cada líder ativo, compara as unidades em que ele vê a loja inteira
 * derivadas de duas fontes:
 *   (a) BANCO: linhas `lideres_por_setor` com setor '*' (a função/vaga).
 *   (b) NOME : regras `config-lideranca-operacional` casadas por nome
 *              (mais coberturas temporárias), que é o fallback de runtime.
 *
 * `faltando_no_banco` = unidades que hoje só funcionam por causa do nome.
 * Enquanto essa lista não estiver vazia, NÃO cortar o fallback por nome
 * (Fase 3): primeiro preencher a linha '*' no banco para esses líderes.
 *
 * Uso: npm run lideranca:auditar
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAdminClient } from '../src/lib/supabase/admin';
import { listarIdsLideresAtivos } from '../src/lib/lider-inspirador';
import { listarSetoresLideradosPor } from '../src/lib/lideres-por-setor';
import { REGRAS_LIDERANCA_OPERACIONAL } from '../src/lib/config-lideranca-operacional';
import { REGRAS_UNIDADE_EXTRA_TEMPORARIA } from '../src/lib/config-avaliacao-unidade-extra';
import { nomeCoincide } from '../src/lib/avaliacao-direta';
import { SETOR_TODOS_NA_UNIDADE } from '../src/lib/lideranca-constants';

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

function slugsUnidadeCompletaPorNome(nome: string): string[] {
  const slugs = new Set<string>();
  for (const regra of REGRAS_LIDERANCA_OPERACIONAL) {
    if (regra.tipo !== 'unidade_todos') continue;
    if (regra.lideres_nomes.some((n) => nomeCoincide(nome, n))) slugs.add(regra.unidade_slug);
  }
  for (const regra of REGRAS_UNIDADE_EXTRA_TEMPORARIA) {
    if (regra.lideres_nomes.some((n) => nomeCoincide(nome, n))) slugs.add(regra.unidade_slug);
  }
  return Array.from(slugs);
}

async function main() {
  loadEnv();
  const supabase = createAdminClient();

  const { data: unidades, error: errU } = await supabase.from('unidades').select('id, slug');
  if (errU) throw new Error(errU.message);
  const idPorSlug = new Map((unidades ?? []).map((u) => [String(u.slug), String(u.id)]));
  const slugPorId = new Map((unidades ?? []).map((u) => [String(u.id), String(u.slug)]));

  const liderIds = await listarIdsLideresAtivos(supabase);
  const { data: cols, error: errC } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .in('id', liderIds.length > 0 ? liderIds : ['00000000-0000-0000-0000-000000000000']);
  if (errC) throw new Error(errC.message);
  const byId = new Map((cols ?? []).map((c) => [String(c.id), c]));

  const divergencias: Array<Record<string, unknown>> = [];
  const ok: Array<Record<string, unknown>> = [];

  for (const id of liderIds) {
    const c = byId.get(id);
    const nome = String(c?.nome ?? '');

    const setores = await listarSetoresLideradosPor(supabase, id);
    const bancoUnidades = new Set(
      setores.filter((s) => s.setor === SETOR_TODOS_NA_UNIDADE).map((s) => String(s.unidade_id))
    );

    const nomeSlugs = slugsUnidadeCompletaPorNome(nome);
    const nomeUnidades = new Set(
      nomeSlugs.map((slug) => idPorSlug.get(slug)).filter((x): x is string => Boolean(x))
    );

    const faltandoNoBanco = Array.from(nomeUnidades)
      .filter((uid) => !bancoUnidades.has(uid))
      .map((uid) => slugPorId.get(uid) ?? uid);

    const registro = {
      lider_id: id,
      nome,
      role: c?.role ?? null,
      banco_unidades_asterisco: Array.from(bancoUnidades).map((uid) => slugPorId.get(uid) ?? uid),
      nome_unidades: nomeSlugs,
      faltando_no_banco: faltandoNoBanco,
    };

    if (faltandoNoBanco.length > 0) divergencias.push(registro);
    else ok.push(registro);
  }

  const relatorio = {
    gerado_em: new Date().toISOString(),
    total_lideres: liderIds.length,
    sem_divergencia: ok.length,
    com_divergencia: divergencias.length,
    gate_fase1_liberado: divergencias.length === 0,
    divergencias,
  };

  const dir = path.join(__dirname, '_snapshots');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const arquivo = path.join(dir, `auditoria-${stamp}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(relatorio, null, 2), 'utf8');

  console.log(JSON.stringify({ ...relatorio, arquivo: path.relative(root, arquivo) }, null, 2));
}

main().catch((e) => {
  console.error('[lideranca:auditar] ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
});
