import type { SupabaseClient } from '@supabase/supabase-js';
import { colaboradorRecebeAvisoPublico } from '@/lib/avisos-publico';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { deveVerTreinoLiderancaPortal, normalizePortalRole } from '@/lib/roles';
import { socioIsentoObrigacoesOperacionaisPortal } from '@/lib/socios-negocio';
import {
  treinoCadastradoVigentePorPublico,
  treinoTextoVigentePorPublico,
  type TreinamentoDbRow,
} from '@/lib/treinamento-vigencia';
import { liderConcluiuTreinoAtual } from '@/lib/treino-lider-acompanhamento';

export type TreinamentoPendenciasNav = {
  pendentes: number;
  /** Treino «todos» vigente sem confirmação. */
  equipe: boolean;
  /** Treino de liderança (cadastrado ou Quinta automática) sem conclusão. */
  lideranca: boolean;
};

type Ctx = {
  colaboradorId: string;
  role: string;
  nome?: string | null;
  setor?: string | null;
  unidadeSlug?: string | null;
};

/**
 * Contagem leve para badge do menu Treinamento.
 * Mesma regra do «Faça agora», sem montar a lista completa de tarefas.
 */
export async function contarTreinamentosPendentesNav(
  supabase: SupabaseClient,
  ctx: Ctx
): Promise<TreinamentoPendenciasNav> {
  const vazio: TreinamentoPendenciasNav = { pendentes: 0, equipe: false, lideranca: false };

  if (
    socioIsentoObrigacoesOperacionaisPortal({
      role: ctx.role,
      nome: ctx.nome,
    })
  ) {
    return vazio;
  }

  const nr = normalizePortalRole(ctx.role);
  const { data: treinosDb } = await supabase
    .from('treinamentos')
    .select('id, titulo, publico_alvo, tipo_conteudo, created_at, ativo')
    .eq('ativo', true);

  const rows = (treinosDb ?? []) as TreinamentoDbRow[];
  let equipe = false;
  let lideranca = false;

  const textoTodos = treinoTextoVigentePorPublico(rows, 'todos');
  const recebeTodos = colaboradorRecebeAvisoPublico(
    { unidade_slug: ctx.unidadeSlug ?? '', setor: ctx.setor ?? null, role: ctx.role },
    'todos'
  );

  if (textoTodos && recebeTodos) {
    const { data: conf } = await supabase
      .from('treinamento_confirmacoes')
      .select('id')
      .eq('treinamento_id', textoTodos.id)
      .eq('colaborador_id', ctx.colaboradorId)
      .maybeSingle();
    if (!conf) equipe = true;
  }

  const podeEquipe = await podeUsarAvaliacaoEquipeSemanal(supabase, ctx.colaboradorId, ctx.role);
  if (deveVerTreinoLiderancaPortal(nr, podeEquipe)) {
    const treinoLiderCad = treinoCadastradoVigentePorPublico(rows, 'lideranca');
    if (treinoLiderCad) {
      const { data: confCad } = await supabase
        .from('treinamento_confirmacoes')
        .select('id')
        .eq('treinamento_id', treinoLiderCad.id)
        .eq('colaborador_id', ctx.colaboradorId)
        .maybeSingle();
      if (!confCad) lideranca = true;
    } else {
      // Vídeo automático da Quinta (quando não há cadastro vigente de liderança).
      try {
        const concluiu = await liderConcluiuTreinoAtual(supabase, ctx.colaboradorId);
        if (!concluiu) lideranca = true;
      } catch {
        lideranca = true;
      }
    }
  }

  const pendentes = (equipe ? 1 : 0) + (lideranca ? 1 : 0);
  return { pendentes, equipe, lideranca };
}
