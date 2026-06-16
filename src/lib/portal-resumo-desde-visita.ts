import type { SupabaseClient } from '@supabase/supabase-js';
import {
  agruparMediasPorColaborador,
  inicioDataReferenciaRanking,
  mediaMensalColaborador,
} from '@/lib/avaliacao-ranking';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { aniversarioNoDia, dataCivilBr, diaMesCivilBr } from '@/lib/data-civil-br';
import {
  colaboradorRecebeAvisoPublico,
  resolverPublicoAviso,
} from '@/lib/avisos-publico';
import { metaTrofeuPar } from '@/lib/trofeus-pares';

export type ResumoDesdeVisitaItem = {
  id: string;
  emoji: string;
  texto: string;
  href?: string;
};

export type ResumoDesdeVisitaResult = {
  ok: true;
  primeira_visita: boolean;
  desde_referencia: string | null;
  itens: ResumoDesdeVisitaItem[];
};

const MAX_ITENS = 5;
const MAX_DIAS_DESDE = 14;
const MAX_DIAS_ANIVERSARIO = 7;

function mesBoundsUTC(ano: number, mes: number): { ini: string; fim: string } {
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim };
}

function parseDesdeParam(raw: string | null): { desde: Date | null; primeiraVisita: boolean } {
  if (!raw?.trim()) return { desde: null, primeiraVisita: true };
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return { desde: null, primeiraVisita: true };
  const limite = new Date();
  limite.setDate(limite.getDate() - MAX_DIAS_DESDE);
  if (d < limite) return { desde: limite, primeiraVisita: false };
  return { desde: d, primeiraVisita: false };
}

function refEmOffsetDiasBr(offset: number): Date {
  const [y, m, day] = dataCivilBr().split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + offset);
  return d;
}

function aniversariosProximos(
  colaboradores: Array<{ id: string; nome: string; data_nascimento: string | null }>,
  excluirId: string
): Array<{ nome: string; label: string }> {
  const out: Array<{ nome: string; label: string; offset: number }> = [];
  for (let offset = 0; offset <= MAX_DIAS_ANIVERSARIO; offset++) {
    const ref = refEmOffsetDiasBr(offset);
    for (const c of colaboradores) {
      if (String(c.id) === excluirId) continue;
      if (!aniversarioNoDia(c.data_nascimento, ref)) continue;
      const label =
        offset === 0 ? 'hoje' : offset === 1 ? 'amanhã' : `em ${offset} dias`;
      out.push({ nome: String(c.nome ?? ''), label, offset });
    }
  }
  out.sort((a, b) => a.offset - b.offset || a.nome.localeCompare(b.nome, 'pt-BR'));
  return out.slice(0, 2).map(({ nome, label }) => ({ nome, label }));
}

function formatarMedia(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

export async function montarResumoDesdeVisita(
  supabase: SupabaseClient,
  opts: {
    colaboradorId: string;
    role: string;
    unidadeSlug: string;
    setor: string | null;
    desdeParam: string | null;
  }
): Promise<ResumoDesdeVisitaResult> {
  const { desde, primeiraVisita } = parseDesdeParam(opts.desdeParam);
  const desdeIso = desde?.toISOString() ?? null;
  const itens: ResumoDesdeVisitaItem[] = [];
  const roleNorm = opts.role.trim().toLowerCase();
  const isColaborador = roleNorm === 'colaborador';

  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth() + 1;
  const { ini, fim } = mesBoundsUTC(ano, mes);

  if (desdeIso && isColaborador) {
    const { data: trofeusNovos } = await supabase
      .from('trofeus_entre_pares')
      .select('tipo, created_at')
      .eq('destinatario_id', opts.colaboradorId)
      .gte('created_at', desdeIso)
      .limit(50);

    const rows = trofeusNovos ?? [];
    if (rows.length > 0) {
      const porTipo = new Map<string, number>();
      for (const r of rows) {
        const t = String(r.tipo ?? '');
        porTipo.set(t, (porTipo.get(t) ?? 0) + 1);
      }
      const partes = Array.from(porTipo.entries()).map(([tipo, qtd]) => {
        const meta = metaTrofeuPar(tipo);
        const titulo = meta?.titulo ?? tipo;
        return qtd > 1 ? `${meta?.emoji ?? '🏅'} ${titulo} ×${qtd}` : `${meta?.emoji ?? '🏅'} ${titulo}`;
      });
      itens.push({
        id: 'trofeus-novos',
        emoji: '🏅',
        texto:
          rows.length === 1
            ? `Você recebeu 1 troféu entre pares (${partes[0]}).`
            : `Você recebeu ${rows.length} troféus entre pares: ${partes.join(', ')}.`,
        href: '/portal/mural',
      });
    }

    const { data: avalNovas } = await supabase
      .from('avaliacoes_diarias')
      .select('data_referencia, media_dia, avaliador_id, created_at')
      .eq('colaborador_id', opts.colaboradorId)
      .gte('created_at', desdeIso)
      .not('media_dia', 'is', null)
      .limit(20);

    const avalFiltradas = filtrarAvaliacoesParaMedia(
      (avalNovas ?? []).map((r) => ({
        colaborador_id: opts.colaboradorId,
        avaliador_id: r.avaliador_id != null ? String(r.avaliador_id) : null,
        data_referencia: String(r.data_referencia),
        media_dia: r.media_dia as number | null,
        created_at: r.created_at != null ? String(r.created_at) : null,
      }))
    );

    if (avalFiltradas.length > 0) {
      const refMin = inicioDataReferenciaRanking(ini);
      const { data: avalMes } = await supabase
        .from('avaliacoes_diarias')
        .select('avaliador_id, data_referencia, media_dia, created_at')
        .eq('colaborador_id', opts.colaboradorId)
        .gte('data_referencia', refMin)
        .lte('data_referencia', fim)
        .not('media_dia', 'is', null)
        .limit(200);

      const linhasMes = filtrarAvaliacoesParaMedia(
        (avalMes ?? []).map((r) => ({
          colaborador_id: opts.colaboradorId,
          avaliador_id: r.avaliador_id != null ? String(r.avaliador_id) : null,
          data_referencia: String(r.data_referencia),
          media_dia: r.media_dia as number | null,
          created_at: r.created_at != null ? String(r.created_at) : null,
        }))
      );

      const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMes);
      const semanas = agruparMediasPorColaborador(linhasMes, [opts.colaboradorId], ini, ctx, fim);
      const agg = mediaMensalColaborador(semanas[opts.colaboradorId] ?? []);
      if (agg.media != null) {
        itens.push({
          id: 'media-atualizada',
          emoji: '📊',
          texto: `Nova avaliação registrada. Sua média do mês: ${formatarMedia(agg.media)} (${agg.dias} semana${agg.dias === 1 ? '' : 's'}).`,
          href: '/portal/desempenho',
        });
      } else {
        itens.push({
          id: 'avaliacao-nova',
          emoji: '📊',
          texto: 'Sua equipe registrou uma nova avaliação sua.',
          href: '/portal/desempenho',
        });
      }
    }
  }

  if (desdeIso) {
    const primario = await supabase
      .from('avisos')
      .select('id, titulo, data_publicacao, publico_alvo, unidades(slug)')
      .eq('ativo', true)
      .gte('data_publicacao', desdeIso)
      .order('data_publicacao', { ascending: false })
      .limit(20);

    let avisosRows: Record<string, unknown>[] = (primario.data ?? []) as Record<string, unknown>[];
    if (primario.error && /publico_alvo/i.test(primario.error.message)) {
      const retry = await supabase
        .from('avisos')
        .select('id, titulo, data_publicacao, unidade_id, unidades(slug)')
        .eq('ativo', true)
        .gte('data_publicacao', desdeIso)
        .order('data_publicacao', { ascending: false })
        .limit(20);
      avisosRows = (retry.data ?? []) as Record<string, unknown>[];
    }

    const verTodasLojas = ['socio', 'admin'].includes(roleNorm);
    const avisosFiltrados = avisosRows.filter((a) => {
      if (verTodasLojas) return true;
      const unidadeAviso = a.unidades as { slug?: string } | null;
      const publico = resolverPublicoAviso(
        a.publico_alvo as string | null | undefined,
        unidadeAviso?.slug
      );
      return colaboradorRecebeAvisoPublico(
        { unidade_slug: opts.unidadeSlug, setor: opts.setor },
        publico
      );
    });

    if (avisosFiltrados.length === 1) {
      const a = avisosFiltrados[0];
      itens.push({
        id: 'aviso-1',
        emoji: '📢',
        texto: `Aviso novo: «${String(a.titulo ?? 'Sem título')}».`,
        href: '/portal/comunicacao',
      });
    } else if (avisosFiltrados.length > 1) {
      itens.push({
        id: 'avisos-novos',
        emoji: '📢',
        texto: `${avisosFiltrados.length} avisos novos para você.`,
        href: '/portal/comunicacao',
      });
    }
  }

  if (primeiraVisita && isColaborador) {
    const refMin = inicioDataReferenciaRanking(ini);
    const { data: avalMes } = await supabase
      .from('avaliacoes_diarias')
      .select('avaliador_id, data_referencia, media_dia, created_at')
      .eq('colaborador_id', opts.colaboradorId)
      .gte('data_referencia', refMin)
      .lte('data_referencia', fim)
      .not('media_dia', 'is', null)
      .limit(200);

    const linhasMes = filtrarAvaliacoesParaMedia(
      (avalMes ?? []).map((r) => ({
        colaborador_id: opts.colaboradorId,
        avaliador_id: r.avaliador_id != null ? String(r.avaliador_id) : null,
        data_referencia: String(r.data_referencia),
        media_dia: r.media_dia as number | null,
        created_at: r.created_at != null ? String(r.created_at) : null,
      }))
    );

    if (linhasMes.length > 0) {
      const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMes);
      const semanas = agruparMediasPorColaborador(linhasMes, [opts.colaboradorId], ini, ctx, fim);
      const agg = mediaMensalColaborador(semanas[opts.colaboradorId] ?? []);
      if (agg.media != null) {
        itens.push({
          id: 'media-mes',
          emoji: '📊',
          texto: `Sua média do mês: ${formatarMedia(agg.media)} (${agg.dias} semana${agg.dias === 1 ? '' : 's'} avaliada${agg.dias === 1 ? '' : 's'}).`,
          href: '/portal/desempenho',
        });
      }
    }

    const { count: trofeusMes } = await supabase
      .from('trofeus_entre_pares')
      .select('id', { count: 'exact', head: true })
      .eq('destinatario_id', opts.colaboradorId)
      .gte('semana_inicio', ini)
      .lte('semana_inicio', fim);

    const totalTrofeus = typeof trofeusMes === 'number' ? trofeusMes : 0;
    if (totalTrofeus > 0) {
      itens.push({
        id: 'trofeus-mes',
        emoji: '🏅',
        texto: `Você já recebeu ${totalTrofeus} troféu${totalTrofeus === 1 ? '' : 's'} entre pares neste mês.`,
        href: '/portal/mural',
      });
    }
  }

  const { data: colegas } = await supabase
    .from('colaboradores')
    .select('id, nome, data_nascimento')
    .not('data_nascimento', 'is', null)
    .limit(500);

  const proximos = aniversariosProximos(
    (colegas ?? []).map((c) => ({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      data_nascimento: c.data_nascimento as string | null,
    })),
    opts.colaboradorId
  );

  for (const aniv of proximos) {
    if (itens.length >= MAX_ITENS) break;
    itens.push({
      id: `aniv-${aniv.nome}`,
      emoji: '🎂',
      texto: `Aniversário de ${aniv.nome} ${aniv.label}.`,
      href: '/portal/aniversariantes',
    });
  }

  if (!primeiraVisita && itens.length === 0 && isColaborador) {
    const refMin = inicioDataReferenciaRanking(ini);
    const { data: avalMes } = await supabase
      .from('avaliacoes_diarias')
      .select('avaliador_id, data_referencia, media_dia, created_at')
      .eq('colaborador_id', opts.colaboradorId)
      .gte('data_referencia', refMin)
      .lte('data_referencia', fim)
      .not('media_dia', 'is', null)
      .limit(200);

    const linhasMes = filtrarAvaliacoesParaMedia(
      (avalMes ?? []).map((r) => ({
        colaborador_id: opts.colaboradorId,
        avaliador_id: r.avaliador_id != null ? String(r.avaliador_id) : null,
        data_referencia: String(r.data_referencia),
        media_dia: r.media_dia as number | null,
        created_at: r.created_at != null ? String(r.created_at) : null,
      }))
    );

    if (linhasMes.length > 0) {
      const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMes);
      const semanas = agruparMediasPorColaborador(linhasMes, [opts.colaboradorId], ini, ctx, fim);
      const agg = mediaMensalColaborador(semanas[opts.colaboradorId] ?? []);
      if (agg.media != null) {
        itens.push({
          id: 'sem-novidades',
          emoji: '✨',
          texto: `Nada de novo desde a última visita. Sua média do mês segue ${formatarMedia(agg.media)}.`,
          href: '/portal/desempenho',
        });
      }
    }
  }

  if (primeiraVisita && itens.length === 0) {
    itens.push({
      id: 'bem-vindo',
      emoji: '👋',
      texto: 'Bem-vindo ao portal. Confira os destaques da semana e o mural abaixo.',
      href: '/portal/mural',
    });
  }

  return {
    ok: true,
    primeira_visita: primeiraVisita,
    desde_referencia: desdeIso,
    itens: itens.slice(0, MAX_ITENS),
  };
}

/** Rótulo curto da última visita para exibir no card. */
export function rotuloDesdeVisita(iso: string | null, primeiraVisita: boolean): string {
  if (primeiraVisita || !iso) return 'Resumo para você';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Desde a sua última visita';
  const hoje = diaMesCivilBr();
  const ref = diaMesCivilBr(d);
  if (ref.dia === hoje.dia && ref.mes === hoje.mes) {
    return 'Desde mais cedo hoje';
  }
  return `Desde ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}
