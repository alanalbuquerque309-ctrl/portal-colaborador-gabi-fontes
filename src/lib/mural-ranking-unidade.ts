import type { SupabaseClient } from '@supabase/supabase-js';
import { mediaMensalColaborador, topTresComEmpateNoTerceiro } from '@/lib/avaliacao-ranking';
import { rotuloGrupoMural, slugsDoGrupoMural } from '@/lib/mural-unidade-grupo';

export type RankingMuralItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  media: number;
  semanas_avaliadas: number;
};

function mesBoundsUTC(ano: number, mes: number): { ini: string; fim: string; mesRef: string } {
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${ano}-${String(mes).padStart(2, '0')}` };
}

export function mesAnteriorUTC(
  ano: number,
  mes: number
): { ano: number; mes: number; mesRef: string } {
  const d = new Date(Date.UTC(ano, mes - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  const a = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return { ano: a, mes: m, mesRef: `${a}-${String(m).padStart(2, '0')}` };
}

export function mesAtualUTC(): { ano: number; mes: number; mesRef: string } {
  const d = new Date();
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + 1;
  return { ano, mes, mesRef: `${ano}-${String(mes).padStart(2, '0')}` };
}

async function idsUnidadesPorSlugs(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase.from('unidades').select('id, slug').in('slug', slugs);
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => String(u.id));
}

export async function calcularTop3GrupoMural(
  supabase: SupabaseClient,
  opts: { unidadeSlugs: string[]; ano: number; mes: number }
): Promise<{ mes_referencia: string; top: RankingMuralItem[] }> {
  const { ini, fim, mesRef } = mesBoundsUTC(opts.ano, opts.mes);
  const unidadeIds = await idsUnidadesPorSlugs(supabase, opts.unidadeSlugs);
  if (unidadeIds.length === 0) {
    return { mes_referencia: mesRef, top: [] };
  }

  const { data: colaboradores, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url, role')
    .in('unidade_id', unidadeIds)
    .eq('role', 'colaborador');

  if (errCol) throw new Error(errCol.message);

  const ids = (colaboradores ?? []).map((c) => String(c.id));
  if (ids.length === 0) {
    return { mes_referencia: mesRef, top: [] };
  }

  const { data: linhas, error: errLin } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, media_dia')
    .in('colaborador_id', ids)
    .gte('data_referencia', ini)
    .lte('data_referencia', fim)
    .not('media_dia', 'is', null)
    .limit(8000);

  if (errLin) throw new Error(errLin.message);

  const porId: Record<string, { media_dia: number | null }[]> = {};
  for (const id of ids) porId[id] = [];
  for (const row of linhas ?? []) {
    const cid = String(row.colaborador_id);
    if (!porId[cid]) continue;
    porId[cid].push({ media_dia: row.media_dia as number | null });
  }

  const scored = (colaboradores ?? []).map((c) => {
    const agg = mediaMensalColaborador(porId[String(c.id)] ?? []);
    return {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      media: agg.media ?? 0,
      dias: agg.dias,
      foto_url: c.foto_url ? String(c.foto_url) : null,
    };
  });

  const topRaw = topTresComEmpateNoTerceiro(
    scored.map((s) => ({ id: s.id, nome: s.nome, media: s.media, dias: s.dias }))
  );

  const fotoPorId = new Map(scored.map((s) => [s.id, s.foto_url]));
  const diasPorId = new Map(scored.map((s) => [s.id, s.dias]));

  const top: RankingMuralItem[] = topRaw.map((t, i) => ({
    posicao: i + 1,
    colaborador_id: t.id,
    nome: t.nome,
    foto_url: fotoPorId.get(t.id) ?? null,
    media: t.media,
    semanas_avaliadas: diasPorId.get(t.id) ?? 0,
  }));

  return { mes_referencia: mesRef, top };
}

export async function calcularRankingsMuralDoColaborador(
  supabase: SupabaseClient,
  unidadeSlug: string | null | undefined
): Promise<{
  grupo_rotulo: string;
  mes_atual: { mes_referencia: string; top: RankingMuralItem[] };
  mes_anterior: { mes_referencia: string; top: RankingMuralItem[] };
}> {
  const slugs = slugsDoGrupoMural(unidadeSlug);
  const atual = mesAtualUTC();
  const anterior = mesAnteriorUTC(atual.ano, atual.mes);

  const [mesAtual, mesAnterior] = await Promise.all([
    calcularTop3GrupoMural(supabase, { unidadeSlugs: slugs, ano: atual.ano, mes: atual.mes }),
    calcularTop3GrupoMural(supabase, {
      unidadeSlugs: slugs,
      ano: anterior.ano,
      mes: anterior.mes,
    }),
  ]);

  return {
    grupo_rotulo: rotuloGrupoMural(unidadeSlug),
    mes_atual: mesAtual,
    mes_anterior: mesAnterior,
  };
}
