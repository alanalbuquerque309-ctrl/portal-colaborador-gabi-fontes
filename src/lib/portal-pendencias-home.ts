import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalHomeTarefa } from '@/lib/portal-home-types';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { deveVerTreinoLiderancaPortal, normalizePortalRole } from '@/lib/roles';
import { podeAvaliarRhVisitaGeral } from '@/lib/avaliacao-rh-visita-access';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { lembreteAvaliacaoSemanaPassada, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';
import { semanasReferenciaCobrancaAvaliacaoLider } from '@/lib/avaliacao-semana-cobranca';
import {
  agruparAvaliacoesPorColaborador,
  carregarAvaliacoesFechamentoColaboradores,
  colaboradorFechouSemanaPorAlgumLider,
} from '@/lib/avaliacao-fechamento-lider';
import { construirConjuntoIdsRh } from '@/lib/avaliacao-semanal-agregacao';
import { listarEquipeParaAvaliacaoSemanal, listarLideresDoColaborador } from '@/lib/colaborador-lideres';
import { colaboradorDeFeriasNaSemana, idsColaboradoresDeFeriasNaSemana } from '@/lib/avaliacao-ferias-semana';
import { idsColaboradoresDeLicencaOuAfastamentoNaSemana } from '@/lib/avaliacao-licenca-semana';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { TROFEUS_PARES_CREDITOS_SEMANA } from '@/lib/trofeus-pares';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';
import { listarComunicadosPendenteConfirmacao } from '@/lib/avisos-pendencias';
import { liderConcluiuTreinoAtual } from '@/lib/treino-lider-acompanhamento';
import { resolverQuintaTreino } from '@/lib/graos/quinta-treino';
import {
  treinoCadastradoVigentePorPublico,
  treinoTextoVigentePorPublico,
} from '@/lib/treinamento-vigencia';
import { colaboradorRecebeAvisoPublico } from '@/lib/avisos-publico';
import { socioIsentoObrigacoesOperacionaisPortal } from '@/lib/socios-negocio';
import { normalizarTipoConteudo } from '@/lib/treinamento-conteudo';

function formatarNomes(nomes: string[], max = 3): string {
  if (nomes.length === 0) return '';
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  if (nomes.length <= max) {
    return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
  }
  return `${nomes.slice(0, max).join(', ')} e mais ${nomes.length - max}`;
}

export type MontarPendenciasCtx = {
  colaboradorId: string;
  unidadeId: string;
  role: string;
  nome?: string | null;
  setor?: string | null;
  unidadeSlug?: string | null;
};

/** Mesma lógica do Faça agora — reutilizada pelo semáforo e pela lista de tarefas. */
export async function montarPendenciasPortalHome(
  supabase: SupabaseClient,
  ctx: MontarPendenciasCtx
): Promise<PortalHomeTarefa[]> {
  const lista: PortalHomeTarefa[] = [];
  const nr = normalizePortalRole(ctx.role);
  const isentoOperacional = socioIsentoObrigacoesOperacionaisPortal({
    role: ctx.role,
    nome: ctx.nome,
  });
  const podeEquipe = await podeUsarAvaliacaoEquipeSemanal(supabase, ctx.colaboradorId, ctx.role);
  const isColaborador = nr === 'colaborador';
  const lembreteLider = lembreteAvaliacaoSemanaPassada();
  const semanaRef = semanaAvaliacaoEquipePadraoISO();
  const semanaInicio = segundaSemanaSaoPaulo();

  const podeVisitaRh = podeAvaliarRhVisitaGeral({
    colaboradorId: ctx.colaboradorId,
    role: ctx.role,
    setor: ctx.setor,
    nome: ctx.nome,
  });

  const comunicadosPendentes = await listarComunicadosPendenteConfirmacao(supabase, {
    colaboradorId: ctx.colaboradorId,
    role: ctx.role,
    setor: ctx.setor,
    unidadeSlug: ctx.unidadeSlug,
  });
  if (comunicadosPendentes.length > 0) {
    const titulos = comunicadosPendentes.map((a) => a.titulo).slice(0, 2);
    const extra =
      comunicadosPendentes.length > titulos.length
        ? ` (+${comunicadosPendentes.length - titulos.length})`
        : '';
    lista.push({
      id: 'comunicados-confirmacao',
      titulo:
        comunicadosPendentes.length === 1
          ? 'Confirmar comunicado'
          : 'Confirmar comunicados',
      detalhe: `Aguardando «${titulos.join('», «')}»${extra}.`,
      href: '/portal#comunicados-home',
      urgente: false,
      acaoLabel: 'Ver comunicados →',
    });
  }

  if (!isentoOperacional) {
    const { data: treinosDb } = await supabase
      .from('treinamentos')
      .select('id, titulo, publico_alvo, tipo_conteudo, created_at, ativo')
      .eq('ativo', true);

    const textoTodos = treinoTextoVigentePorPublico(treinosDb ?? [], 'todos');
    const recebeTodos = colaboradorRecebeAvisoPublico(
      { unidade_slug: ctx.unidadeSlug ?? '', setor: ctx.setor ?? null, role: ctx.role },
      'todos'
    );

    if (textoTodos && recebeTodos) {
      const { data: confTodos } = await supabase
        .from('treinamento_confirmacoes')
        .select('id')
        .eq('treinamento_id', textoTodos.id)
        .eq('colaborador_id', ctx.colaboradorId)
        .maybeSingle();

      if (!confTodos) {
        lista.push({
          id: 'treino-semana-texto',
          titulo: 'Ler treinamento da semana',
          detalhe: `Falta ler e confirmar: "${textoTodos.titulo}".`,
          href: '/portal/treinamento',
          urgente: false,
          acaoLabel: 'Ler agora →',
        });
      }
    }
  }

  if (isColaborador) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: emoRow } = await supabase
      .from('emocional_registro')
      .select('emocao')
      .eq('colaborador_id', ctx.colaboradorId)
      .eq('data', hoje)
      .maybeSingle();

    if (!emoRow?.emocao) {
      lista.push({
        id: 'termometro',
        titulo: 'Responder termômetro de emoções',
        detalhe: 'Primeiro passo do dia — só gestão vê sua resposta.',
        href: '#termometro-emocoes',
        urgente: true,
        acaoLabel: 'Responder agora →',
      });
    }

    const ferias = await colaboradorDeFeriasNaSemana(supabase, ctx.colaboradorId, semanaInicio);
    if (!ferias) {
      const lideres = await listarLideresDoColaborador(supabase, ctx.colaboradorId, null, {
        apenasDaConfig: true,
      });
      const idsLideres = lideres.map((l) => l.id).filter(Boolean);

      const plantaoDuplo = idsLideres.length >= 2;

      const lideresPendentes: { nome: string }[] = [];

      if (idsLideres.length > 0) {
        const { data: avalLid } = await supabase
          .from('avaliacoes_lideranca')
          .select('avaliado_id')
          .eq('avaliador_id', ctx.colaboradorId)
          .eq('semana_inicio', semanaInicio)
          .in('avaliado_id', idsLideres);

        const avaliadosIds = new Set((avalLid ?? []).map((r) => String(r.avaliado_id)));

        if (plantaoDuplo) {
          // Dois gerentes na loja (12x36): avalia só o líder do plantão da semana passada.
          const algumPlantaoAvaliado = lideres.some((l) => l.id && avaliadosIds.has(l.id));
          if (!algumPlantaoAvaliado && lideres.length > 0) {
            lideresPendentes.push({ nome: 'seu líder do plantão' });
          }
        } else {
          // Um líder ou setor sem par: avalia cada vínculo.
          for (const l of lideres) {
            if (l.id && !avaliadosIds.has(l.id)) {
              lideresPendentes.push({ nome: l.nome ?? 'Líder' });
            }
          }
        }
      }

      if (lideresPendentes.length > 0) {
        const nomes = lideresPendentes.map((a) => a.nome).filter(Boolean);
        lista.push({
          id: 'lideranca',
          titulo: 'Avaliar liderança',
          detalhe: plantaoDuplo
            ? 'Confirme o líder do seu plantão na semana passada e avalie.'
            : `Falta${lideresPendentes.length === 1 ? '' : 'm'} avaliar: ${formatarNomes(nomes)}.`,
          href: '/portal/avaliacao-lideranca?aba=lideranca&pendentes=1',
          urgente: false,
          acaoLabel: 'Clique para ver →',
        });
      }
    }

    const { data: enviados } = await supabase
      .from('trofeus_entre_pares')
      .select('id')
      .eq('avaliador_id', ctx.colaboradorId)
      .eq('semana_inicio', semanaInicio);

    const creditosUsados = (enviados ?? []).length;
    const creditosRestantes = Math.max(0, TROFEUS_PARES_CREDITOS_SEMANA - creditosUsados);
    if (creditosRestantes > 0) {
      lista.push({
        id: 'trofeus',
        titulo: 'Enviar troféus entre pares',
        detalhe: `Você ainda pode dar ${creditosRestantes} troféu${creditosRestantes === 1 ? '' : 's'} esta semana (Postura, Braço Direito, Eficiência).`,
        href: '/portal/avaliacao-lideranca?aba=pares',
        acaoLabel: 'Clique para ver →',
      });
    }
  }

  if (deveVerTreinoLiderancaPortal(nr, podeEquipe) && !isentoOperacional) {
    const { data: treinosDb } = await supabase
      .from('treinamentos')
      .select('id, titulo, publico_alvo, tipo_conteudo, created_at, ativo')
      .eq('ativo', true);

    const treinoLiderCad = treinoCadastradoVigentePorPublico(treinosDb ?? [], 'lideranca');

    if (treinoLiderCad) {
      const { data: confCad } = await supabase
        .from('treinamento_confirmacoes')
        .select('id')
        .eq('treinamento_id', treinoLiderCad.id)
        .eq('colaborador_id', ctx.colaboradorId)
        .maybeSingle();

      if (!confCad) {
        const ehTexto = normalizarTipoConteudo(treinoLiderCad.tipo_conteudo) === 'texto';
        lista.push({
          id: 'treino-lideranca-cadastrado',
          titulo: ehTexto ? 'Ler treinamento de liderança' : 'Assistir treinamento de liderança',
          detalhe: ehTexto
            ? `Falta ler e confirmar: "${treinoLiderCad.titulo}".`
            : `Falta assistir e confirmar: "${treinoLiderCad.titulo}".`,
          href: '/portal/treinamento',
          urgente: false,
          acaoLabel: ehTexto ? 'Ler agora →' : 'Assistir agora →',
        });
      }
    } else {
      let concluiuTreinoLider = false;
      try {
        concluiuTreinoLider = await liderConcluiuTreinoAtual(supabase, ctx.colaboradorId);
      } catch {
        concluiuTreinoLider = false;
      }
      if (!concluiuTreinoLider) {
        const treinoLider = resolverQuintaTreino(undefined, 'lider');
        lista.push({
          id: 'treino-lideranca',
          titulo: 'Assistir treinamento de liderança',
          detalhe: `Falta assistir: "${treinoLider.titulo}". Assista e confirme em Treinamento.`,
          href: '/portal/treinamento',
          urgente: false,
          acaoLabel: 'Assistir agora →',
        });
      }
    }

    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, ctx.colaboradorId, ctx.unidadeId);
    const ids = equipe.map((c) => c.id);
    const dataRef = inicioSemanaSegundaFeiraLocal(semanaRef);
    const semanasCobranca = semanasReferenciaCobrancaAvaliacaoLider();

    const avaliacoesPorColab: Record<string, unknown> = {};
    const feriasIds =
      ids.length > 0 ? await idsColaboradoresDeFeriasNaSemana(supabase, ids, dataRef) : new Set<string>();
    const licencaIds =
      ids.length > 0
        ? await idsColaboradoresDeLicencaOuAfastamentoNaSemana(supabase, ids, dataRef)
        : new Set<string>();

    if (ids.length > 0) {
      const { data: todosAvaliadores } = await supabase
        .from('colaboradores')
        .select('id, role, setor, nome');
      const rhIds = construirConjuntoIdsRh(todosAvaliadores ?? []);
      const { rows: avalRows, error: errAval } = await carregarAvaliacoesFechamentoColaboradores(
        supabase,
        semanasCobranca,
        ids
      );
      if (!errAval) {
        const porColab = agruparAvaliacoesPorColaborador(avalRows);
        for (const id of ids) {
          const linhas = porColab.get(id) ?? [];
          if (colaboradorFechouSemanaPorAlgumLider(linhas, rhIds)) {
            avaliacoesPorColab[id] = true;
          }
        }
      }
    }

    const equipeElegivel = equipe.filter((m) => !feriasIds.has(m.id) && !licencaIds.has(m.id));
    const pendentesMembros = equipeElegivel.filter((m) => !avaliacoesPorColab[m.id]);
    const pendentes = pendentesMembros.length;
    const total = equipeElegivel.length;

    if (total > 0 && pendentes > 0) {
      const nomesPreview = pendentesMembros
        .map((m) => m.nome ?? '')
        .filter(Boolean)
        .slice(0, 3);
      const preview =
        nomesPreview.length > 0
          ? ` Pendente${pendentes === 1 ? '' : 's'}: ${formatarNomes(nomesPreview, 3)}${pendentes > nomesPreview.length ? ` (+${pendentes - nomesPreview.length})` : ''}.`
          : '';
      lista.push({
        id: 'equipe',
        titulo: lembreteLider.titulo,
        detalhe: `${pendentes} de ${total} avaliação${total === 1 ? '' : 'ões'} da equipe ainda não feita${pendentes === 1 ? '' : 's'}.${preview}`,
        href: '/portal/avaliacao-master?pendentes=1',
        urgente: true,
        acaoLabel: 'Clique para ver →',
      });
    }
  }

  if (podeVisitaRh) {
    const { listarRedeParaVisitaRh } = await import('@/lib/avaliacao-rh-visita');
    const redeRh = await listarRedeParaVisitaRh(supabase, ctx.colaboradorId, {});
    const idsRh = redeRh
      .filter((m) => normalizePortalRole(m.role) === 'colaborador')
      .map((m) => m.id);
    const dataRef = inicioSemanaSegundaFeiraLocal(semanaRef);
    const semanasRh = semanasReferenciaCobrancaAvaliacaoLider();
    const feriasRhIds =
      idsRh.length > 0 ? await idsColaboradoresDeFeriasNaSemana(supabase, idsRh, dataRef) : new Set<string>();
    const licencaRhIds =
      idsRh.length > 0
        ? await idsColaboradoresDeLicencaOuAfastamentoNaSemana(supabase, idsRh, dataRef)
        : new Set<string>();

    let avaliadosRh = new Set<string>();
    if (idsRh.length > 0) {
      const { data: avalRh } = await supabase
        .from('avaliacoes_diarias')
        .select('colaborador_id')
        .eq('avaliador_id', ctx.colaboradorId)
        .in('data_referencia', semanasRh)
        .in('colaborador_id', idsRh);

      avaliadosRh = new Set((avalRh ?? []).map((r) => String(r.colaborador_id)));
    }

    const pendentesMembros = redeRh.filter(
      (m) =>
        normalizePortalRole(m.role) === 'colaborador' &&
        !avaliadosRh.has(m.id) &&
        !feriasRhIds.has(m.id) &&
        !licencaRhIds.has(m.id)
    );
    const pendentes = pendentesMembros.length;

    if (pendentes > 0) {
      const nomesPreview = pendentesMembros
        .map((m) => m.nome ?? '')
        .filter(Boolean)
        .slice(0, 3);
      const preview =
        nomesPreview.length > 0
          ? ` Ex.: ${formatarNomes(nomesPreview, 3)}${pendentes > nomesPreview.length ? ` e mais ${pendentes - nomesPreview.length}` : ''}.`
          : '';
      lista.push({
        id: 'visita-rh',
        titulo: 'Visita RH',
        detalhe: `${pendentes} visita${pendentes === 1 ? '' : 's'} RH pendente${pendentes === 1 ? '' : 's'} na rede.${preview}`,
        href: '/portal/avaliacao-rh-visita?pendentes=1',
        acaoLabel: 'Clique para ver →',
      });
    }
  }

  if (podeVerPendenciasSemanaRede(nr)) {
    try {
      const { obterPendenciasSemanaRedeCacheadas } = await import('@/lib/cache/servidor-operacional');
      const pend = await obterPendenciasSemanaRedeCacheadas(ctx.colaboradorId);
      const total = pend.itens.length;
      const alertaSexta = pend.meta?.alerta_critico_sexta === true;
      const criticosSemAvaliacao = Number(pend.resumo?.criticos_sem_avaliacao ?? 0);

      if (total > 0) {
        lista.push({
          id: 'pendentes-rede',
          titulo: alertaSexta
            ? `${criticosSemAvaliacao} crítico(s) — sexta sem avaliação`
            : `${total} pendência${total === 1 ? '' : 's'} na rede`,
          detalhe: alertaSexta
            ? 'Colaborador(es) sem avaliação de líder e RH. Busque esclarecimentos com a liderança.'
            : 'Avaliações da semana ainda não concluídas — quem falta e qual líder cobrar.',
          href: alertaSexta ? '/portal/pendencias-semana?filtro=critico_sexta' : '/portal/pendencias-semana',
          urgente: alertaSexta || (pend.resumo?.criticos ?? 0) > 0,
          hero: true,
          acaoLabel: 'Clique para ver →',
        });
      }
    } catch {
      /* pendências opcionais */
    }
  }

  return lista.slice(0, 6);
}
