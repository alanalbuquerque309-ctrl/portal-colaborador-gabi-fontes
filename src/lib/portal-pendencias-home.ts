import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalHomeTarefa } from '@/lib/portal-home-types';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { normalizePortalRole } from '@/lib/roles';
import { podeAvaliarRhVisitaGeral } from '@/lib/avaliacao-rh-visita-access';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { lembreteAvaliacaoSemanaPassada, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';
import { listarEquipeParaAvaliacaoSemanal, listarLideresDoColaborador } from '@/lib/colaborador-lideres';
import { colaboradorDeFeriasNaSemana } from '@/lib/avaliacao-ferias-semana';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { TROFEUS_PARES_CREDITOS_SEMANA } from '@/lib/trofeus-pares';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';

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
  const isAdm = nr === 'admin' || nr === 'socio';
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
        detalhe: 'Primeiro passo do dia — resposta anônima no resumo.',
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
      const lideresPendentes: { nome: string }[] = [];

      if (idsLideres.length > 0) {
        const { data: avalLid } = await supabase
          .from('avaliacoes_lideranca')
          .select('avaliado_id')
          .eq('avaliador_id', ctx.colaboradorId)
          .eq('semana_inicio', semanaInicio)
          .in('avaliado_id', idsLideres);

        const avaliadosIds = new Set((avalLid ?? []).map((r) => String(r.avaliado_id)));
        for (const l of lideres) {
          if (l.id && !avaliadosIds.has(l.id)) {
            lideresPendentes.push({ nome: l.nome ?? 'Líder' });
          }
        }
      }

      if (lideresPendentes.length > 0) {
        const nomes = lideresPendentes.map((a) => a.nome).filter(Boolean);
        lista.push({
          id: 'lideranca',
          titulo: 'Avaliar liderança',
          detalhe: `Falta${lideresPendentes.length === 1 ? '' : 'm'} avaliar: ${formatarNomes(nomes)}.`,
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

  if (podeEquipe && (nr === 'gerente' || nr === 'master' || nr === 'admin')) {
    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, ctx.colaboradorId, ctx.unidadeId);
    const ids = equipe.map((c) => c.id);

    const avaliacoesPorColab: Record<string, unknown> = {};
    if (ids.length > 0) {
      const dataRef = inicioSemanaSegundaFeiraLocal(semanaRef);
      const { data: avalRows } = await supabase
        .from('avaliacoes_diarias')
        .select('colaborador_id')
        .eq('avaliador_id', ctx.colaboradorId)
        .eq('data_referencia', dataRef)
        .in('colaborador_id', ids);

      for (const r of avalRows ?? []) {
        avaliacoesPorColab[String(r.colaborador_id)] = r;
      }
    }

    const pendentesMembros = equipe.filter((m) => !avaliacoesPorColab[m.id]);
    const pendentes = pendentesMembros.length;
    const total = equipe.length;

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
    const { data: rhEquipe } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .eq('role', 'colaborador')
      .eq('onboarding_completo', true);

    const idsRh = (rhEquipe ?? []).map((c) => String(c.id));
    const dataRef = inicioSemanaSegundaFeiraLocal(semanaRef);

    let avaliadosRh = new Set<string>();
    if (idsRh.length > 0) {
      const { data: avalRh } = await supabase
        .from('avaliacoes_diarias')
        .select('colaborador_id')
        .eq('avaliador_id', ctx.colaboradorId)
        .eq('data_referencia', dataRef)
        .in('colaborador_id', idsRh);

      avaliadosRh = new Set((avalRh ?? []).map((r) => String(r.colaborador_id)));
    }

    const pendentesMembros = (rhEquipe ?? []).filter((m) => !avaliadosRh.has(String(m.id)));
    const pendentes = pendentesMembros.length;

    if (pendentes > 0) {
      const nomesPreview = pendentesMembros
        .map((m) => String(m.nome ?? ''))
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
      const { calcularPendenciasSemana } = await import('@/lib/avaliacao-pendentes-semana');
      const pend = await calcularPendenciasSemana(supabase, {
        filtro: 'pendentes',
        rhAvaliadorId: ctx.colaboradorId,
      });
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

  if (isAdm && lista.filter((t) => t.id === 'pendentes-rede').length === 0) {
    lista.push({
      id: 'admin',
      titulo: 'Painel Admin',
      detalhe: 'Avaliações, avisos, colaboradores e relatórios.',
      href: '/admin/dashboard',
    });
  }

  return lista.slice(0, 6);
}
