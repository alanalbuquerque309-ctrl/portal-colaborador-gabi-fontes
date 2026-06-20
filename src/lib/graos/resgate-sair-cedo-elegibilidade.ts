import type { SupabaseClient } from '@supabase/supabase-js';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import {
  agruparMediasPorColaborador,
  mediaMensalColaborador,
} from '@/lib/avaliacao-ranking';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import { GRAOS_RESGATE_SAIR_CEDO_MEDIA_MIN } from '@/lib/graos/constants';

const CRITERIOS_NOTA = [
  'nota_pontualidade',
  'nota_trabalho_equipe',
  'nota_desempenho_tarefas',
  'nota_proatividade',
  'nota_vestimenta',
] as const;

export type ElegibilidadeResgateSairCedo = {
  elegivel: boolean;
  media_mensal: number | null;
  semanas_com_nota: number;
  teve_nota_3_no_mes: boolean;
  motivo: string | null;
};

function mesAtualBounds(ref: Date): { ini: string; fim: string } {
  const ano = ref.getFullYear();
  const mes = ref.getMonth() + 1;
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim };
}

function lerNota(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN;
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

function fmtMedia(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(2).replace('.', ',');
}

/** Item de catálogo «Sair 1h mais cedo (aprovação gerente)». */
export function itemCatalogoEhSairCedo(nome: string): boolean {
  return /sair\s*1\s*h\s*mais\s*cedo/i.test(nome);
}

export async function avaliarElegibilidadeResgateSairCedo(
  supabase: SupabaseClient,
  colaboradorId: string,
  refDate: Date = new Date()
): Promise<ElegibilidadeResgateSairCedo> {
  const { ini, fim } = mesAtualBounds(refDate);

  const selectCols =
    'colaborador_id, avaliador_id, data_referencia, media_dia, assiduidade, justificativa_nota_baixa, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, nota_vestimenta, created_at, ignorada';

  const { data: linhasRaw, error } = await supabase
    .from('avaliacoes_diarias')
    .select(selectCols)
    .eq('colaborador_id', colaboradorId)
    .gte('data_referencia', ini)
    .lte('data_referencia', fim);

  if (error) throw new Error(error.message);

  const linhasMapeadas = filtrarAvaliacoesParaMedia(
    (linhasRaw ?? []).map((row) => ({
      colaborador_id: String(row.colaborador_id),
      avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
      data_referencia: String(row.data_referencia),
      media_dia: row.media_dia as number | null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      ignorada: (row as { ignorada?: boolean }).ignorada,
    }))
  );

  const ctxRanking = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);
  const porColab = agruparMediasPorColaborador(linhasMapeadas, [colaboradorId], ini, ctxRanking, fim);
  const { media, dias } = mediaMensalColaborador(porColab[colaboradorId] ?? []);

  let teveNota3 = false;
  for (const row of linhasRaw ?? []) {
    if ((row as { ignorada?: boolean }).ignorada === true) continue;
    const ass = assiduidadeDoBanco(
      String((row as { assiduidade?: string }).assiduidade ?? ''),
      (row as { justificativa_nota_baixa?: string | null }).justificativa_nota_baixa
    );
    if (ass !== 'presente' && ass !== 'falta_justificada') continue;

    for (const key of CRITERIOS_NOTA) {
      const nota = lerNota((row as Record<string, unknown>)[key]);
      if (nota === 3) {
        teveNota3 = true;
        break;
      }
    }
    if (teveNota3) break;
  }

  if (dias === 0 || media == null) {
    return {
      elegivel: false,
      media_mensal: null,
      semanas_com_nota: 0,
      teve_nota_3_no_mes: teveNota3,
      motivo: 'Ainda não há avaliações neste mês para liberar sair 1h mais cedo.',
    };
  }

  if (teveNota3) {
    return {
      elegivel: false,
      media_mensal: media,
      semanas_com_nota: dias,
      teve_nota_3_no_mes: true,
      motivo: `Sair 1h mais cedo exige nenhuma nota 3 no mês. Sua média: ${fmtMedia(media)}.`,
    };
  }

  if (media < GRAOS_RESGATE_SAIR_CEDO_MEDIA_MIN) {
    return {
      elegivel: false,
      media_mensal: media,
      semanas_com_nota: dias,
      teve_nota_3_no_mes: false,
      motivo: `Sair 1h mais cedo exige média mensal ≥ ${GRAOS_RESGATE_SAIR_CEDO_MEDIA_MIN.toFixed(1).replace('.', ',')} (sua média: ${fmtMedia(media)}).`,
    };
  }

  return {
    elegivel: true,
    media_mensal: media,
    semanas_com_nota: dias,
    teve_nota_3_no_mes: false,
    motivo: null,
  };
}

export function enriquecerCatalogoResgateSairCedo<
  T extends { id: string; nome: string; graos: number },
>(catalogo: T[], eleg: ElegibilidadeResgateSairCedo | null): Array<
  T & {
    exige_desempenho_alto?: boolean;
    bloqueado?: boolean;
    motivo_bloqueio?: string | null;
  }
> {
  if (!eleg) return catalogo;
  return catalogo.map((item) => {
    if (!itemCatalogoEhSairCedo(item.nome)) return item;
    return {
      ...item,
      exige_desempenho_alto: true,
      bloqueado: !eleg.elegivel,
      motivo_bloqueio: eleg.elegivel ? null : eleg.motivo,
    };
  });
}
