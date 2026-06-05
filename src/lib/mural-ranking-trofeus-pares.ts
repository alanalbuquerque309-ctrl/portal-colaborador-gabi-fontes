import type { SupabaseClient } from '@supabase/supabase-js';
import { topTresComEmpateNoTerceiro, type ScoreMensal } from '@/lib/avaliacao-ranking';
import { mesAnteriorUTC, mesAtualUTC } from '@/lib/mural-ranking-unidade';
import { rotuloGrupoMural, slugsDoGrupoMural } from '@/lib/mural-unidade-grupo';
import { metaTrofeuPar } from '@/lib/trofeus-pares';

export type RankingTrofeuItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  total_trofeus: number;
};

function mesBoundsUTC(ano: number, mes: number): { ini: string; fim: string; mesRef: string } {
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${ano}-${String(mes).padStart(2, '0')}` };
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

function topTresPorTotalTrofeus(
  scored: Array<{ id: string; nome: string; total: number; foto_url: string | null }>
): RankingTrofeuItem[] {
  const asScore: ScoreMensal[] = scored.map((s) => ({
    id: s.id,
    nome: s.nome,
    media: s.total,
    dias: s.total >= 1 ? 1 : 0,
  }));
  const topRaw = topTresComEmpateNoTerceiro(asScore);
  const fotoPorId = new Map(scored.map((s) => [s.id, s.foto_url]));
  const totalPorId = new Map(scored.map((s) => [s.id, s.total]));
  return topRaw.map((t, i) => ({
    posicao: i + 1,
    colaborador_id: t.id,
    nome: t.nome,
    foto_url: fotoPorId.get(t.id) ?? null,
    total_trofeus: totalPorId.get(t.id) ?? Math.round(t.media),
  }));
}

export async function calcularTop3TrofeusGrupoMural(
  supabase: SupabaseClient,
  opts: { unidadeSlugs: string[]; ano: number; mes: number }
): Promise<{ mes_referencia: string; top: RankingTrofeuItem[] }> {
  const { ini, fim, mesRef } = mesBoundsUTC(opts.ano, opts.mes);
  const unidadeIds = await idsUnidadesPorSlugs(supabase, opts.unidadeSlugs);
  if (unidadeIds.length === 0) {
    return { mes_referencia: mesRef, top: [] };
  }

  const { data: trofeus, error: errTrof } = await supabase
    .from('trofeus_entre_pares')
    .select('destinatario_id')
    .in('unidade_id', unidadeIds)
    .gte('semana_inicio', ini)
    .lte('semana_inicio', fim)
    .limit(8000);

  if (errTrof) throw new Error(errTrof.message);

  const contagem = new Map<string, number>();
  for (const row of trofeus ?? []) {
    const id = String(row.destinatario_id ?? '');
    if (!id) continue;
    contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }

  if (contagem.size === 0) {
    return { mes_referencia: mesRef, top: [] };
  }

  const ids = Array.from(contagem.keys());
  const { data: colaboradores, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url')
    .in('id', ids);

  if (errCol) throw new Error(errCol.message);

  const scored = (colaboradores ?? []).map((c) => ({
    id: String(c.id),
    nome: String(c.nome ?? ''),
    foto_url: c.foto_url ? String(c.foto_url) : null,
    total: contagem.get(String(c.id)) ?? 0,
  }));

  return { mes_referencia: mesRef, top: topTresPorTotalTrofeus(scored) };
}

export async function calcularRankingsTrofeusMuralDoColaborador(
  supabase: SupabaseClient,
  unidadeSlug: string | null | undefined
): Promise<{
  grupo_rotulo: string;
  mes_atual: { mes_referencia: string; top: RankingTrofeuItem[] };
  mes_anterior: { mes_referencia: string; top: RankingTrofeuItem[] };
}> {
  const slugs = slugsDoGrupoMural(unidadeSlug);
  const atual = mesAtualUTC();
  const anterior = mesAnteriorUTC(atual.ano, atual.mes);

  const [mesAtual, mesAnterior] = await Promise.all([
    calcularTop3TrofeusGrupoMural(supabase, { unidadeSlugs: slugs, ano: atual.ano, mes: atual.mes }),
    calcularTop3TrofeusGrupoMural(supabase, {
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

export type TrofeuRecebidoResumo = {
  tipo: string;
  titulo: string;
  emoji: string;
  quantidade: number;
};

export type RankingTrofeuDetalheItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  unidade_nome: string;
  unidade_slug: string;
  setor: string | null;
  total_trofeus: number;
  trofeus: TrofeuRecebidoResumo[];
};

/** Ranking completo de troféus entre pares no mês (rede inteira, todos os premiados). */
export async function calcularRankingTrofeusMesCompleto(
  supabase: SupabaseClient,
  opts: { ano: number; mes: number }
): Promise<{ mes_referencia: string; ranking: RankingTrofeuDetalheItem[] }> {
  const { ini, fim, mesRef } = mesBoundsUTC(opts.ano, opts.mes);

  const { data: trofeus, error: errTrof } = await supabase
    .from('trofeus_entre_pares')
    .select('destinatario_id, tipo')
    .gte('semana_inicio', ini)
    .lte('semana_inicio', fim)
    .limit(8000);

  if (errTrof) throw new Error(errTrof.message);

  const totalPorId = new Map<string, number>();
  const tiposPorId = new Map<string, Map<string, number>>();

  for (const row of trofeus ?? []) {
    const id = String(row.destinatario_id ?? '');
    const tipo = String(row.tipo ?? '');
    if (!id) continue;
    totalPorId.set(id, (totalPorId.get(id) ?? 0) + 1);
    const porTipo = tiposPorId.get(id) ?? new Map<string, number>();
    porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);
    tiposPorId.set(id, porTipo);
  }

  if (totalPorId.size === 0) {
    return { mes_referencia: mesRef, ranking: [] };
  }

  const ids = Array.from(totalPorId.keys());
  const { data: colaboradores, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url, setor, unidades(nome, slug)')
    .in('id', ids);

  if (errCol) throw new Error(errCol.message);

  const scored = (colaboradores ?? [])
    .map((c) => {
      const cid = String(c.id);
      const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
      const porTipo = tiposPorId.get(cid) ?? new Map<string, number>();
      const trofeusLista: TrofeuRecebidoResumo[] = Array.from(porTipo.entries())
        .map(([tipo, quantidade]) => {
          const meta = metaTrofeuPar(tipo);
          return {
            tipo,
            titulo: meta?.titulo ?? tipo,
            emoji: meta?.emoji ?? '🏅',
            quantidade,
          };
        })
        .sort((a, b) => b.quantidade - a.quantidade || a.titulo.localeCompare(b.titulo, 'pt-BR'));

      return {
        id: cid,
        nome: String(c.nome ?? ''),
        foto_url: c.foto_url ? String(c.foto_url) : null,
        setor: (c as { setor?: string | null }).setor ? String((c as { setor?: string | null }).setor) : null,
        unidade_nome: unidade?.nome ? String(unidade.nome) : '',
        unidade_slug: unidade?.slug ? String(unidade.slug) : '',
        total: totalPorId.get(cid) ?? 0,
        trofeus: trofeusLista,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));

  const ranking: RankingTrofeuDetalheItem[] = scored.map((s, i) => ({
    posicao: i + 1,
    colaborador_id: s.id,
    nome: s.nome,
    foto_url: s.foto_url,
    unidade_nome: s.unidade_nome,
    unidade_slug: s.unidade_slug,
    setor: s.setor,
    total_trofeus: s.total,
    trofeus: s.trofeus,
  }));

  return { mes_referencia: mesRef, ranking };
}

/** Ranking de troféus entre pares em uma semana (rede inteira). */
export async function calcularRankingTrofeusSemanaCompleto(
  supabase: SupabaseClient,
  semanaInicio: string
): Promise<{ semana_inicio: string; ranking: RankingTrofeuDetalheItem[] }> {
  const { data: trofeus, error: errTrof } = await supabase
    .from('trofeus_entre_pares')
    .select('destinatario_id, tipo')
    .eq('semana_inicio', semanaInicio)
    .limit(2000);

  if (errTrof) throw new Error(errTrof.message);

  const totalPorId = new Map<string, number>();
  const tiposPorId = new Map<string, Map<string, number>>();

  for (const row of trofeus ?? []) {
    const id = String(row.destinatario_id ?? '');
    const tipo = String(row.tipo ?? '');
    if (!id) continue;
    totalPorId.set(id, (totalPorId.get(id) ?? 0) + 1);
    const porTipo = tiposPorId.get(id) ?? new Map<string, number>();
    porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);
    tiposPorId.set(id, porTipo);
  }

  if (totalPorId.size === 0) {
    return { semana_inicio: semanaInicio, ranking: [] };
  }

  const ids = Array.from(totalPorId.keys());
  const { data: colaboradores, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url, setor, unidades(nome, slug)')
    .in('id', ids);

  if (errCol) throw new Error(errCol.message);

  const scored = (colaboradores ?? [])
    .map((c) => {
      const cid = String(c.id);
      const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
      const porTipo = tiposPorId.get(cid) ?? new Map<string, number>();
      const trofeusLista: TrofeuRecebidoResumo[] = Array.from(porTipo.entries())
        .map(([tipo, quantidade]) => {
          const meta = metaTrofeuPar(tipo);
          return {
            tipo,
            titulo: meta?.titulo ?? tipo,
            emoji: meta?.emoji ?? '🏅',
            quantidade,
          };
        })
        .sort((a, b) => b.quantidade - a.quantidade || a.titulo.localeCompare(b.titulo, 'pt-BR'));

      return {
        id: cid,
        nome: String(c.nome ?? ''),
        foto_url: c.foto_url ? String(c.foto_url) : null,
        setor: (c as { setor?: string | null }).setor ? String((c as { setor?: string | null }).setor) : null,
        unidade_nome: unidade?.nome ? String(unidade.nome) : '',
        unidade_slug: unidade?.slug ? String(unidade.slug) : '',
        total: totalPorId.get(cid) ?? 0,
        trofeus: trofeusLista,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));

  const ranking: RankingTrofeuDetalheItem[] = scored.map((s, i) => ({
    posicao: i + 1,
    colaborador_id: s.id,
    nome: s.nome,
    foto_url: s.foto_url,
    unidade_nome: s.unidade_nome,
    unidade_slug: s.unidade_slug,
    setor: s.setor,
    total_trofeus: s.total,
    trofeus: s.trofeus,
  }));

  return { semana_inicio: semanaInicio, ranking };
}
