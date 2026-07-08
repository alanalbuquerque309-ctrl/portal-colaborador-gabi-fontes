import type { SupabaseClient } from '@supabase/supabase-js';
import {
  agruparMediasPorColaborador,
  AVALIACAO_RANKING_MIN_SEMANAS_SEMANAL,
  inicioDataReferenciaRanking,
  mediaMensalColaborador,
  topTresComEmpateNoTerceiro,
} from '@/lib/avaliacao-ranking';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { rotuloGrupoMural, slugsDoGrupoMural } from '@/lib/mural-unidade-grupo';

export type RankingMuralItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  media: number;
  semanas_avaliadas: number;
  unidade_nome: string;
  unidade_slug: string;
  setor: string | null;
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

export function anoAtualUTC(): { ano: number; anoRef: string } {
  const ano = new Date().getUTCFullYear();
  return { ano, anoRef: String(ano) };
}

function anoBoundsUTC(ano: number): { ini: string; fim: string; anoRef: string } {
  return { ini: `${ano}-01-01`, fim: `${ano}-12-31`, anoRef: String(ano) };
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
    .select('id, nome, foto_url, role, setor, unidade_id, unidades(nome, slug)')
    .in('unidade_id', unidadeIds)
    .eq('role', 'colaborador');

  if (errCol) throw new Error(errCol.message);

  const ids = (colaboradores ?? []).map((c) => String(c.id));
  if (ids.length === 0) {
    return { mes_referencia: mesRef, top: [] };
  }

  const refMin = inicioDataReferenciaRanking(ini);

  const { data: linhas, error: errLin } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, data_referencia, media_dia, created_at')
    .in('colaborador_id', ids)
    .gte('data_referencia', refMin)
    .lte('data_referencia', fim)
    .not('media_dia', 'is', null)
    .limit(8000);

  if (errLin) throw new Error(errLin.message);

  const linhasMapeadas = filtrarAvaliacoesParaMedia(
    (linhas ?? []).map((row) => ({
      colaborador_id: String(row.colaborador_id),
      avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
      data_referencia: String(row.data_referencia),
      media_dia: row.media_dia as number | null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      ignorada: (row as { ignorada?: boolean }).ignorada,
    }))
  );

  const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);

  const porId = agruparMediasPorColaborador(linhasMapeadas, ids, ini, ctx, fim);

  const scored = (colaboradores ?? []).map((c) => {
    const agg = mediaMensalColaborador(porId[String(c.id)] ?? []);
    const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
    return {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      media: agg.media ?? 0,
      dias: agg.dias,
      foto_url: c.foto_url ? String(c.foto_url) : null,
      setor: (c as { setor?: string | null }).setor ? String((c as { setor?: string | null }).setor) : null,
      unidade_nome: unidade?.nome ? String(unidade.nome) : '',
      unidade_slug: unidade?.slug ? String(unidade.slug) : '',
    };
  });

  const topRaw = topTresComEmpateNoTerceiro(
    scored.map((s) => ({ id: s.id, nome: s.nome, media: s.media, dias: s.dias }))
  );

  const metaPorId = new Map(scored.map((s) => [s.id, s]));

  const top: RankingMuralItem[] = topRaw.map((t, i) => {
    const meta = metaPorId.get(t.id);
    return {
      posicao: i + 1,
      colaborador_id: t.id,
      nome: t.nome,
      foto_url: meta?.foto_url ?? null,
      media: t.media,
      semanas_avaliadas: meta?.dias ?? 0,
      unidade_nome: meta?.unidade_nome ?? '',
      unidade_slug: meta?.unidade_slug ?? '',
      setor: meta?.setor ?? null,
    };
  });

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

async function listarUnidadesAtivas(
  supabase: SupabaseClient
): Promise<Array<{ id: string; slug: string; nome: string }>> {
  const { data, error } = await supabase.from('unidades').select('id, slug, nome').order('nome');
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => ({
    id: String(u.id),
    slug: String(u.slug ?? ''),
    nome: String(u.nome ?? ''),
  }));
}

/** Top 3 da rede inteira (média mensal das avaliações semanais). */
export async function calcularTop3GeralRede(
  supabase: SupabaseClient,
  opts: { ano: number; mes: number }
): Promise<{ mes_referencia: string; top: RankingMuralItem[] }> {
  const unidades = await listarUnidadesAtivas(supabase);
  const slugs = unidades.map((u) => u.slug).filter(Boolean);
  return calcularTop3GrupoMural(supabase, { unidadeSlugs: slugs, ano: opts.ano, mes: opts.mes });
}

export type RankingPorUnidadeBloco = {
  unidade_slug: string;
  unidade_nome: string;
  top: RankingMuralItem[];
};

/** Top 3 de cada unidade separadamente (mesma regra de média mensal). */
export async function calcularTop3PorUnidadeRede(
  supabase: SupabaseClient,
  opts: { ano: number; mes: number }
): Promise<{ mes_referencia: string; unidades: RankingPorUnidadeBloco[] }> {
  const unidades = await listarUnidadesAtivas(supabase);
  const blocos = await Promise.all(
    unidades.map(async (u) => {
      const { top } = await calcularTop3GrupoMural(supabase, {
        unidadeSlugs: [u.slug],
        ano: opts.ano,
        mes: opts.mes,
      });
      return {
        unidade_slug: u.slug,
        unidade_nome: u.nome,
        top,
      };
    })
  );
  const mesRef = mesBoundsUTC(opts.ano, opts.mes).mesRef;
  return {
    mes_referencia: mesRef,
    unidades: blocos.filter((b) => b.top.length > 0),
  };
}

/** Top 3 de um grupo de unidades na semana (`data_referencia` = segunda). */
export async function calcularTop3GrupoSemana(
  supabase: SupabaseClient,
  opts: { unidadeSlugs: string[]; semanaInicio: string }
): Promise<{ semana_inicio: string; top: RankingMuralItem[] }> {
  const semanaInicio = opts.semanaInicio;
  const unidadeIds = await idsUnidadesPorSlugs(supabase, opts.unidadeSlugs);
  if (unidadeIds.length === 0) {
    return { semana_inicio: semanaInicio, top: [] };
  }

  const refMin = inicioDataReferenciaRanking(semanaInicio);

  const { data: colaboradores, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url, role, setor, unidade_id, unidades(nome, slug)')
    .in('unidade_id', unidadeIds)
    .eq('role', 'colaborador');

  if (errCol) throw new Error(errCol.message);

  const ids = (colaboradores ?? []).map((c) => String(c.id));
  if (ids.length === 0) {
    return { semana_inicio: semanaInicio, top: [] };
  }

  const { data: linhas, error: errLin } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, data_referencia, media_dia, created_at')
    .in('colaborador_id', ids)
    .eq('data_referencia', semanaInicio)
    .gte('data_referencia', refMin)
    .not('media_dia', 'is', null)
    .limit(2000);

  if (errLin) throw new Error(errLin.message);

  const linhasMapeadas = filtrarAvaliacoesParaMedia(
    (linhas ?? []).map((row) => ({
      colaborador_id: String(row.colaborador_id),
      avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
      data_referencia: String(row.data_referencia),
      media_dia: row.media_dia as number | null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      ignorada: (row as { ignorada?: boolean }).ignorada,
    }))
  );

  if (linhasMapeadas.length === 0) {
    return { semana_inicio: semanaInicio, top: [] };
  }

  const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);
  const porId = agruparMediasPorColaborador(linhasMapeadas, ids, semanaInicio, ctx);

  const scored = (colaboradores ?? [])
    .map((c) => {
      const agg = mediaMensalColaborador(porId[String(c.id)] ?? []);
      const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
      return {
        id: String(c.id),
        nome: String(c.nome ?? ''),
        media: agg.media ?? 0,
        dias: agg.dias,
        foto_url: c.foto_url ? String(c.foto_url) : null,
        setor: (c as { setor?: string | null }).setor ? String((c as { setor?: string | null }).setor) : null,
        unidade_nome: unidade?.nome ? String(unidade.nome) : '',
        unidade_slug: unidade?.slug ? String(unidade.slug) : '',
      };
    })
    .filter((s) => s.dias >= AVALIACAO_RANKING_MIN_SEMANAS_SEMANAL);

  const topRaw = topTresComEmpateNoTerceiro(
    scored.map((s) => ({ id: s.id, nome: s.nome, media: s.media, dias: s.dias }))
  );

  const metaPorId = new Map(scored.map((s) => [s.id, s]));

  const top: RankingMuralItem[] = topRaw.map((t, i) => {
    const meta = metaPorId.get(t.id);
    return {
      posicao: i + 1,
      colaborador_id: t.id,
      nome: t.nome,
      foto_url: meta?.foto_url ?? null,
      media: t.media,
      semanas_avaliadas: meta?.dias ?? 0,
      unidade_nome: meta?.unidade_nome ?? '',
      unidade_slug: meta?.unidade_slug ?? '',
      setor: meta?.setor ?? null,
    };
  });

  return { semana_inicio: semanaInicio, top };
}

/** Top 3 da rede na semana corrente. */
export async function calcularTop3GeralSemana(
  supabase: SupabaseClient,
  semanaInicio: string
): Promise<{ semana_inicio: string; top: RankingMuralItem[] }> {
  const unidades = await listarUnidadesAtivas(supabase);
  const slugs = unidades.map((u) => u.slug).filter(Boolean);
  return calcularTop3GrupoSemana(supabase, { unidadeSlugs: slugs, semanaInicio });
}

/** Top 3 de cada unidade na semana corrente. */
export async function calcularTop3PorUnidadeSemana(
  supabase: SupabaseClient,
  semanaInicio: string
): Promise<{ semana_inicio: string; unidades: RankingPorUnidadeBloco[] }> {
  const unidades = await listarUnidadesAtivas(supabase);
  const blocos = await Promise.all(
    unidades.map(async (u) => {
      const { top } = await calcularTop3GrupoSemana(supabase, {
        unidadeSlugs: [u.slug],
        semanaInicio,
      });
      return {
        unidade_slug: u.slug,
        unidade_nome: u.nome,
        top,
      };
    })
  );
  return {
    semana_inicio: semanaInicio,
    unidades: blocos.filter((b) => b.top.length > 0),
  };
}

/** Top 3 de um grupo no ano (média acumulada das avaliações semanais). */
export async function calcularTop3GrupoAnual(
  supabase: SupabaseClient,
  opts: { unidadeSlugs: string[]; ano: number }
): Promise<{ ano_referencia: string; top: RankingMuralItem[] }> {
  const { ini, fim, anoRef } = anoBoundsUTC(opts.ano);
  const unidadeIds = await idsUnidadesPorSlugs(supabase, opts.unidadeSlugs);
  if (unidadeIds.length === 0) {
    return { ano_referencia: anoRef, top: [] };
  }

  const { data: colaboradores, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url, role, setor, unidade_id, unidades(nome, slug)')
    .in('unidade_id', unidadeIds)
    .eq('role', 'colaborador');

  if (errCol) throw new Error(errCol.message);

  const ids = (colaboradores ?? []).map((c) => String(c.id));
  if (ids.length === 0) {
    return { ano_referencia: anoRef, top: [] };
  }

  const refMin = inicioDataReferenciaRanking(ini);

  const { data: linhas, error: errLin } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, data_referencia, media_dia, created_at')
    .in('colaborador_id', ids)
    .gte('data_referencia', refMin)
    .lte('data_referencia', fim)
    .not('media_dia', 'is', null)
    .limit(12000);

  if (errLin) throw new Error(errLin.message);

  const linhasMapeadas = filtrarAvaliacoesParaMedia(
    (linhas ?? []).map((row) => ({
      colaborador_id: String(row.colaborador_id),
      avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
      data_referencia: String(row.data_referencia),
      media_dia: row.media_dia as number | null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      ignorada: (row as { ignorada?: boolean }).ignorada,
    }))
  );

  const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);
  const porId = agruparMediasPorColaborador(linhasMapeadas, ids, ini, ctx, fim);

  const scored = (colaboradores ?? []).map((c) => {
    const agg = mediaMensalColaborador(porId[String(c.id)] ?? []);
    const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
    return {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      media: agg.media ?? 0,
      dias: agg.dias,
      foto_url: c.foto_url ? String(c.foto_url) : null,
      setor: (c as { setor?: string | null }).setor ? String((c as { setor?: string | null }).setor) : null,
      unidade_nome: unidade?.nome ? String(unidade.nome) : '',
      unidade_slug: unidade?.slug ? String(unidade.slug) : '',
    };
  });

  const topRaw = topTresComEmpateNoTerceiro(
    scored.map((s) => ({ id: s.id, nome: s.nome, media: s.media, dias: s.dias }))
  );

  const metaPorId = new Map(scored.map((s) => [s.id, s]));

  const top: RankingMuralItem[] = topRaw.map((t, i) => {
    const meta = metaPorId.get(t.id);
    return {
      posicao: i + 1,
      colaborador_id: t.id,
      nome: t.nome,
      foto_url: meta?.foto_url ?? null,
      media: t.media,
      semanas_avaliadas: meta?.dias ?? 0,
      unidade_nome: meta?.unidade_nome ?? '',
      unidade_slug: meta?.unidade_slug ?? '',
      setor: meta?.setor ?? null,
    };
  });

  return { ano_referencia: anoRef, top };
}

/** Top 3 da rede no ano corrente (acumulado). */
export async function calcularTop3GeralAnual(
  supabase: SupabaseClient,
  opts: { ano: number }
): Promise<{ ano_referencia: string; top: RankingMuralItem[] }> {
  const unidades = await listarUnidadesAtivas(supabase);
  const slugs = unidades.map((u) => u.slug).filter(Boolean);
  return calcularTop3GrupoAnual(supabase, { unidadeSlugs: slugs, ano: opts.ano });
}

/** Top 3 de cada unidade no ano (acumulado). */
export async function calcularTop3PorUnidadeAnual(
  supabase: SupabaseClient,
  opts: { ano: number }
): Promise<{ ano_referencia: string; unidades: RankingPorUnidadeBloco[] }> {
  const unidades = await listarUnidadesAtivas(supabase);
  const blocos = await Promise.all(
    unidades.map(async (u) => {
      const { top } = await calcularTop3GrupoAnual(supabase, {
        unidadeSlugs: [u.slug],
        ano: opts.ano,
      });
      return {
        unidade_slug: u.slug,
        unidade_nome: u.nome,
        top,
      };
    })
  );
  const anoRef = String(opts.ano);
  return {
    ano_referencia: anoRef,
    unidades: blocos.filter((b) => b.top.length > 0),
  };
}
