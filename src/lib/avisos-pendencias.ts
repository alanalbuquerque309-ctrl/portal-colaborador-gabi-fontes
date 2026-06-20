import type { SupabaseClient } from '@supabase/supabase-js';
import {
  colaboradorRecebeAvisoPublico,
  resolverPublicoAviso,
} from '@/lib/avisos-publico';

const SELECT_AVISOS =
  'id, titulo, exige_confirmacao, unidade_id, publico_alvo, unidades(slug)';
const SELECT_AVISOS_SEM_PUBLICO = 'id, titulo, exige_confirmacao, unidade_id, unidades(slug)';

/** Comunicados ativos que exigem confirmação e ainda não foram confirmados pelo colaborador. */
export async function listarComunicadosPendenteConfirmacao(
  supabase: SupabaseClient,
  opts: {
    colaboradorId: string;
    role: string;
    setor?: string | null;
    unidadeSlug?: string | null;
  }
): Promise<Array<{ id: string; titulo: string }>> {
  const verTodasLojas = ['socio', 'admin'].includes(opts.role.toLowerCase());

  const primario = await supabase
    .from('avisos')
    .select(SELECT_AVISOS)
    .eq('ativo', true)
    .eq('exige_confirmacao', true)
    .order('data_publicacao', { ascending: false })
    .limit(30);

  let avisosRows: Record<string, unknown>[] = [];
  if (primario.error && /publico_alvo/i.test(primario.error.message)) {
    const retry = await supabase
      .from('avisos')
      .select(SELECT_AVISOS_SEM_PUBLICO)
      .eq('ativo', true)
      .eq('exige_confirmacao', true)
      .order('data_publicacao', { ascending: false })
      .limit(30);
    if (retry.error) return [];
    avisosRows = (retry.data ?? []) as Record<string, unknown>[];
  } else if (primario.error) {
    return [];
  } else {
    avisosRows = (primario.data ?? []) as Record<string, unknown>[];
  }

  let avisos = avisosRows;
  if (!verTodasLojas) {
    avisos = avisos.filter((a) => {
      const unidadeAviso = a.unidades as { slug?: string } | null;
      const publico = resolverPublicoAviso(
        a.publico_alvo as string | null | undefined,
        unidadeAviso?.slug
      );
      return colaboradorRecebeAvisoPublico(
        {
          unidade_slug: opts.unidadeSlug ?? '',
          setor: opts.setor ?? null,
          role: opts.role,
        },
        publico
      );
    });
  } else {
    avisos = avisos.filter((a) => {
      const unidadeAviso = a.unidades as { slug?: string } | null;
      const publico = resolverPublicoAviso(
        a.publico_alvo as string | null | undefined,
        unidadeAviso?.slug
      );
      if (publico !== 'lideranca') return true;
      return colaboradorRecebeAvisoPublico(
        {
          unidade_slug: opts.unidadeSlug ?? '',
          setor: opts.setor ?? null,
          role: opts.role,
        },
        publico
      );
    });
  }

  if (avisos.length === 0) return [];

  const ids = avisos.map((a) => String(a.id));
  const { data: confirmacoes } = await supabase
    .from('aviso_confirmacoes')
    .select('aviso_id')
    .eq('colaborador_id', opts.colaboradorId)
    .in('aviso_id', ids);

  const confirmados = new Set((confirmacoes ?? []).map((c) => String(c.aviso_id)));

  return avisos
    .filter((a) => !confirmados.has(String(a.id)))
    .map((a) => ({
      id: String(a.id),
      titulo: String(a.titulo ?? 'Comunicado'),
    }));
}
