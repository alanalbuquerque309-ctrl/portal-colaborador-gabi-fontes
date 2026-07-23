import type { createAdminClient } from '@/lib/supabase/admin';
import { listarUnidadesCadastroServer } from '@/lib/tenant/settings-server';
import {
  REGRAS_LIDERANCA_OPERACIONAL,
  type RegraLiderancaOperacional,
} from '@/lib/config-lideranca-operacional';
import { REGRAS_UNIDADE_EXTRA_TEMPORARIA } from '@/lib/config-avaliacao-unidade-extra';
import { nomeCoincide } from '@/lib/avaliacao-direta';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { liderancaResolveSoBanco } from '@/lib/lideranca-transversal';
import { listarSetoresLideradosPor } from '@/lib/lideres-por-setor';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function resolverUnidadeIdPorSlug(
  supabase: SupabaseAdmin,
  slug: string,
  catalogo: { slug: string; label: string }[]
): Promise<string | null> {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  if (data?.id) return String(data.id);
  const def = catalogo.find((u) => u.slug === slug);
  if (!def) return null;
  const { data: ins } = await supabase
    .from('unidades')
    .insert({ nome: def.label, slug: def.slug })
    .select('id')
    .single();
  return ins?.id ? String(ins.id) : null;
}

/** Slugs em que o líder vê todos os colaboradores da unidade (gerente de loja). */
function slugsUnidadeCompletaOperacionalParaNome(nome: string): string[] {
  const slugs = new Set<string>();
  for (const regra of REGRAS_LIDERANCA_OPERACIONAL) {
    if (regra.tipo !== 'unidade_todos') continue;
    if (!regraLideraUnidade(regra, nome)) continue;
    slugs.add(regra.unidade_slug);
  }
  return Array.from(slugs);
}

function regraLideraUnidade(regra: RegraLiderancaOperacional, nomeLider: string): boolean {
  const nomes =
    regra.tipo === 'setor_todas_unidades' ? regra.lideres_nomes : regra.lideres_nomes;
  return nomes.some((n) => nomeCoincide(nomeLider, n));
}

function slugsExtraTemporariosParaNome(nome: string): string[] {
  const slugs: string[] = [];
  for (const regra of REGRAS_UNIDADE_EXTRA_TEMPORARIA) {
    if (regra.lideres_nomes.some((n) => nomeCoincide(nome, n))) {
      slugs.push(regra.unidade_slug);
    }
  }
  return slugs;
}

/**
 * Unidades cujos colaboradores (role colaborador) entram na lista completa de avaliação semanal.
 * Apenas gerentes de unidade (`unidade_todos` / `*` em `lideres_por_setor`).
 * Líderes por setor (ex.: Fábrica de preparos) ficam só em `listarEquipeDoLider` — Fábrica ≠ Mesquita.
 */
export async function resolverUnidadesListaCompletaEquipeAvaliacao(
  supabase: SupabaseAdmin,
  liderId: string,
  _unidadeIdCadastro: string
): Promise<string[]> {
  const ids = new Set<string>();
  const catalogoUnidades = await listarUnidadesCadastroServer();

  let setoresLiderados: Array<{ unidade_id: string; setor: string }> = [];
  try {
    setoresLiderados = await listarSetoresLideradosPor(supabase, liderId);
  } catch {
    setoresLiderados = [];
  }

  for (const s of setoresLiderados) {
    if (s.setor === SETOR_TODOS_NA_UNIDADE && s.unidade_id) ids.add(s.unidade_id);
  }

  if (!liderancaResolveSoBanco()) {
    const { data: eu } = await supabase.from('colaboradores').select('nome').eq('id', liderId).maybeSingle();
    const nomeLider = String(eu?.nome ?? '');

    if (nomeLider) {
      const slugs = Array.from(
        new Set([
          ...slugsUnidadeCompletaOperacionalParaNome(nomeLider),
          ...slugsExtraTemporariosParaNome(nomeLider),
        ])
      );
      for (const slug of slugs) {
        const uid = await resolverUnidadeIdPorSlug(supabase, slug, catalogoUnidades);
        if (uid) ids.add(uid);
      }
    }
  }

  // Sem fallback para unidade de cadastro: líder só por setor não vira “gerente da loja inteira”.
  // Sem `*` / unidade_todos, ids fica vazio; `listarEquipeParaAvaliacaoSemanal` usa setor + direta
  // e só então o fallback da unidade de cadastro.
  return Array.from(ids);
}
