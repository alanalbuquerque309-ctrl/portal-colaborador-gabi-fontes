import type { SupabaseClient } from '@supabase/supabase-js';
import { GRAOS_MISSAO, GRAOS_MAX_SEMANA, GRAOS_SUGESTAO_MAX_SEMANA, type GraosMissaoId } from '@/lib/graos/constants';
import { calcularElegibilidadeSemanaComUi } from '@/lib/graos/elegibilidade';
import {
  calcularSaldoGraos,
  creditarMissaoGraos,
  cancelarMissoesSemLoginNaSemana,
  deduplicarLoginSemanaColaborador,
  deduplicarEnvioSugestaoSemanaColaborador,
  deduplicarBonusSugestaoSemanaColaborador,
  encerrarPendentesSemanasPassadas,
  processarElegibilidadeTodasSemanasPendentesGraos,
  refKeyGraos,
} from '@/lib/graos/movimentos';
import { colaboradorAcessouPortalSemanaGraos } from '@/lib/cafe-conecta/acesso-portal';
import { graosPorTrofeusEnviadosNaSemana } from '@/lib/graos/trofeus-graos';
import { ehQuintaSaoPaulo, hojeIsoSaoPaulo, semanaFimExclusiveUtcIsoSp, semanaInicioUtcIsoSp } from '@/lib/semana-brasil';
import { GRAOS_ENVIO_SUGESTAO } from '@/lib/sugestao-resposta-graos';
import { semanaVigenteParaGraos } from '@/lib/graos/semana-vigencia';
import { colaboradorDeFeriasNaSemana } from '@/lib/avaliacao-ferias-semana';

export type MissaoGraosUi = {
  id: GraosMissaoId | 'quinta';
  label: string;
  graos: number;
  graos_max: number;
  status: 'feito_pendente' | 'feito_confirmado' | 'disponivel' | 'bloqueado' | 'indisponivel';
  href: string | null;
  detalhe: string | null;
};

function statusDeMovimento(
  refKey: string,
  movimentos: Map<string, { estado: string; graos: number }>
): MissaoGraosUi['status'] {
  const m = movimentos.get(refKey);
  if (!m) return 'disponivel';
  if (m.estado === 'confirmado') return 'feito_confirmado';
  if (m.estado === 'pendente') return 'feito_pendente';
  /** Cancelamentos (ajuste interno ou inelegível) não aparecem como bloqueio na UI. */
  if (m.estado === 'cancelado') return 'disponivel';
  return 'disponivel';
}

export async function sincronizarMissoesSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string,
  opts?: { creditarLogin?: boolean }
): Promise<void> {
  if (!semanaVigenteParaGraos(semanaInicio)) return;

  await deduplicarLoginSemanaColaborador(supabase, colaboradorId);

  let temLoginSemana = await colaboradorAcessouPortalSemanaGraos(supabase, colaboradorId, semanaInicio);

  // Entrada no portal: 1 crédito/semana, só na primeira vez que acessa (sync com creditarLogin).
  if (opts?.creditarLogin !== false && !temLoginSemana) {
    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'login_semana',
      graos: GRAOS_MISSAO.login_semana,
      refKey: refKeyGraos(colaboradorId, 'login_semana', semanaInicio),
      descricao: 'Entrada no portal na semana',
    });
    temLoginSemana = true;
  }

  if (!temLoginSemana) {
    await cancelarMissoesSemLoginNaSemana(supabase, colaboradorId, semanaInicio);
    await processarElegibilidadeTodasSemanasPendentesGraos(supabase, colaboradorId);
    await encerrarPendentesSemanasPassadas(supabase, colaboradorId, semanaInicio);
    return;
  }

  // Aviso confirmado (1/semana) — coluna confirmado_em (não created_at)
  const inicioUtc = semanaInicioUtcIsoSp(semanaInicio);
  const fimUtc = semanaFimExclusiveUtcIsoSp(semanaInicio);
  const { data: confs } = await supabase
    .from('aviso_confirmacoes')
    .select('aviso_id, confirmado_em')
    .eq('colaborador_id', colaboradorId)
    .gte('confirmado_em', inicioUtc)
    .lt('confirmado_em', fimUtc)
    .order('confirmado_em', { ascending: true })
    .limit(1);

  if (confs?.length) {
    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'aviso_semana',
      graos: GRAOS_MISSAO.aviso_semana,
      refKey: refKeyGraos(colaboradorId, 'aviso_semana', semanaInicio),
      descricao: 'Leitura de comunicado',
      meta: { aviso_id: confs[0].aviso_id },
    });
  }

  // Avaliar liderança (não credita se de férias na semana)
  const deFerias = await colaboradorDeFeriasNaSemana(supabase, colaboradorId, semanaInicio);
  if (deFerias) {
    await supabase
      .from('graos_movimentos')
      .update({
        estado: 'cancelado',
        meta: { ajuste_sistema: 'ferias_sem_lideranca', oculto_colaborador: true },
      })
      .eq('colaborador_id', colaboradorId)
      .eq('semana_inicio', semanaInicio)
      .eq('missao', 'lideranca_semana')
      .neq('estado', 'cancelado');
  } else {
    const { count: liderancaCount } = await supabase
      .from('avaliacoes_lideranca')
      .select('id', { count: 'exact', head: true })
      .eq('avaliador_id', colaboradorId)
      .eq('semana_inicio', semanaInicio);

    if ((liderancaCount ?? 0) > 0) {
      await creditarMissaoGraos(supabase, {
        colaboradorId,
        semanaInicio,
        missao: 'lideranca_semana',
        graos: GRAOS_MISSAO.lideranca_semana,
        refKey: refKeyGraos(colaboradorId, 'lideranca_semana', semanaInicio),
        descricao: 'Avaliar liderança',
      });
    }
  }

  // Sugestão: +1 no envio; bônus 0–9 na resposta da gestão.
  const { count: sugCount } = await supabase
    .from('sugestoes_reclamacoes')
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', colaboradorId)
    .eq('tipo', 'sugestao')
    .gte('created_at', inicioUtc)
    .lt('created_at', fimUtc);

  if ((sugCount ?? 0) > 0) {
    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'sugestao_semana',
      graos: GRAOS_MISSAO.sugestao_semana,
      refKey: refKeyGraos(colaboradorId, 'sugestao_semana', semanaInicio),
      descricao: 'Enviar sugestão',
    });
    await deduplicarEnvioSugestaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
    await deduplicarBonusSugestaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
  }

  const { count: trofCount } = await supabase
    .from('trofeus_entre_pares')
    .select('id', { count: 'exact', head: true })
    .eq('avaliador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio);

  const graosTrof = graosPorTrofeusEnviadosNaSemana(trofCount ?? 0);
  if (graosTrof > 0) {
    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'trofeu_semana',
      graos: graosTrof,
      refKey: refKeyGraos(colaboradorId, 'trofeu_semana', semanaInicio),
      descricao: `Troféus entre pares (${trofCount} enviado(s))`,
      meta: { qtd: trofCount },
    });
  }

  // Quinta
  if (ehQuintaSaoPaulo()) {
    const dataQuinta = hojeIsoSaoPaulo();
    const { data: qConc } = await supabase
      .from('graos_quinta_conclusoes')
      .select('id')
      .eq('colaborador_id', colaboradorId)
      .eq('data_quinta', dataQuinta)
      .maybeSingle();

    if (qConc) {
      await creditarMissaoGraos(supabase, {
        colaboradorId,
        semanaInicio,
        missao: 'quinta',
        graos: GRAOS_MISSAO.quinta,
        refKey: refKeyGraos(colaboradorId, 'quinta', semanaInicio, dataQuinta),
        descricao: 'Quinta do café',
      });
    }
  }

  await processarElegibilidadeTodasSemanasPendentesGraos(supabase, colaboradorId);
  await encerrarPendentesSemanasPassadas(supabase, colaboradorId, semanaInicio);
}

export async function montarMissoesUi(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<{ missoes: MissaoGraosUi[]; graos_semana_possivel: number; graos_semana_ganhos: number }> {
  if (!semanaVigenteParaGraos(semanaInicio)) {
    return { missoes: [], graos_semana_possivel: GRAOS_MAX_SEMANA, graos_semana_ganhos: 0 };
  }

  const { data: movs } = await supabase
    .from('graos_movimentos')
    .select('ref_key, estado, graos, missao')
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio);

  const map = new Map<string, { estado: string; graos: number }>();
  let ganhosConfirmados = 0;
  let ganhosPendentes = 0;

  for (const m of movs ?? []) {
    const rk = String(m.ref_key);
    const est = String(m.estado);
    /** Ignora cancelados na UI de missões (ajuste interno não bloqueia nem assusta). */
    if (est === 'cancelado') continue;
    map.set(rk, { estado: est, graos: Number(m.graos) || 0 });
    if (String(m.missao) === 'quinta') {
      map.set('__quinta__', { estado: String(m.estado), graos: Number(m.graos) || 0 });
    }
    const g = Number(m.graos) || 0;
    if (g <= 0) continue;
    if (m.estado === 'confirmado') ganhosConfirmados += g;
    else if (m.estado === 'pendente') ganhosPendentes += g;
  }

  const quintaIndisponivel = !ehQuintaSaoPaulo();
  const deFerias = await colaboradorDeFeriasNaSemana(supabase, colaboradorId, semanaInicio);

  const inicioUtc = semanaInicioUtcIsoSp(semanaInicio);
  const fimUtc = semanaFimExclusiveUtcIsoSp(semanaInicio);
  const { data: sugsSemana } = await supabase
    .from('sugestoes_reclamacoes')
    .select('id, graos_destaque_em, graos_resposta_bonus')
    .eq('colaborador_id', colaboradorId)
    .eq('tipo', 'sugestao')
    .gte('created_at', inicioUtc)
    .lt('created_at', fimUtc);

  const sugestoesEnviadas = sugsSemana ?? [];
  const sugestoesRespondidas = sugestoesEnviadas.filter((s) => s.graos_destaque_em);
  const refSugestaoSemana = refKeyGraos(colaboradorId, 'sugestao_semana', semanaInicio);
  const movEnvio = map.get(refSugestaoSemana);
  const graosEnvio =
    movEnvio && movEnvio.estado !== 'cancelado'
      ? Math.min(Number(movEnvio.graos) || 0, GRAOS_ENVIO_SUGESTAO)
      : sugestoesEnviadas.length > 0
        ? GRAOS_ENVIO_SUGESTAO
        : 0;
  const graosBonus = (() => {
    const vals = (movs ?? [])
      .filter((m) => String(m.missao) === 'sugestao_destaque' && String(m.estado) !== 'cancelado')
      .map((m) => Number(m.graos) || 0)
      .filter((g) => g > 0);
    return vals.length ? Math.max(...vals) : 0;
  })();
  const graosSugestaoGanhos = graosEnvio + graosBonus;
  let statusSugestao: MissaoGraosUi['status'] = 'disponivel';
  if (sugestoesEnviadas.length > 0) {
    if (sugestoesRespondidas.length < sugestoesEnviadas.length) {
      statusSugestao = 'feito_pendente';
    } else {
      const destaqueMovs = (movs ?? []).filter((m) => String(m.missao) === 'sugestao_destaque');
      if (destaqueMovs.some((m) => m.estado === 'pendente')) statusSugestao = 'feito_pendente';
      else statusSugestao = 'feito_confirmado';
    }
  }

  const mk = (
    id: GraosMissaoId | 'quinta',
    label: string,
    graos: number,
    graosMax: number,
    refKey: string,
    href: string | null,
    detalhe: string | null,
    opts?: { indisponivel?: boolean; statusOverride?: MissaoGraosUi['status'] }
  ): MissaoGraosUi => ({
    id,
    label,
    graos,
    graos_max: graosMax,
    status:
      opts?.statusOverride ??
      (opts?.indisponivel ? 'indisponivel' : statusDeMovimento(refKey, map)),
    href,
    detalhe,
  });

  const missoes: MissaoGraosUi[] = [
    mk(
      'login_semana',
      'Entrar no portal esta semana',
      GRAOS_MISSAO.login_semana,
      GRAOS_MISSAO.login_semana,
      refKeyGraos(colaboradorId, 'login_semana', semanaInicio),
      '/portal',
      null
    ),
    mk(
      'aviso_semana',
      'Ler comunicado importante',
      GRAOS_MISSAO.aviso_semana,
      GRAOS_MISSAO.aviso_semana,
      refKeyGraos(colaboradorId, 'aviso_semana', semanaInicio),
      '/portal/comunicacao',
      '1 confirmação por semana'
    ),
    mk(
      'lideranca_semana',
      'Avaliar liderança',
      GRAOS_MISSAO.lideranca_semana,
      GRAOS_MISSAO.lideranca_semana,
      refKeyGraos(colaboradorId, 'lideranca_semana', semanaInicio),
      deFerias ? null : '/portal/avaliacao-lideranca',
      deFerias ? 'De férias nesta semana — sem avaliação de liderança' : null,
      deFerias ? { statusOverride: 'bloqueado' as const } : undefined
    ),
    mk(
      'trofeu_semana',
      'Enviar troféu entre pares',
      map.get(refKeyGraos(colaboradorId, 'trofeu_semana', semanaInicio))?.graos ?? 0,
      5,
      refKeyGraos(colaboradorId, 'trofeu_semana', semanaInicio),
      '/portal/mural',
      '1 troféu = 1 · 2 = 2 · 3+ = 5 Grãos'
    ),
    {
      ...mk(
        'sugestao_semana',
        'Enviar sugestão',
        graosSugestaoGanhos,
        GRAOS_SUGESTAO_MAX_SEMANA,
        refKeyGraos(colaboradorId, 'sugestao_semana', semanaInicio),
        '/portal/sugestoes',
        '1 Grão no envio (único na semana, qualquer quantidade de sugestões); bônus 0–9 na resposta da gestão'
      ),
      status: statusSugestao,
    },
    {
      ...mk(
        'quinta',
        quintaIndisponivel ? 'Quinta do café (disponível na quinta)' : 'Quinta do café — treino de hoje',
        GRAOS_MISSAO.quinta,
        GRAOS_MISSAO.quinta,
        refKeyGraos(colaboradorId, 'quinta', semanaInicio, hojeIsoSaoPaulo()),
        '/portal/graos',
        quintaIndisponivel ? 'Toda quinta: +5 Grãos extras' : 'Conclua o treino abaixo',
        { indisponivel: quintaIndisponivel }
      ),
      status: (() => {
        const m = map.get('__quinta__');
        if (m?.estado === 'confirmado') return 'feito_confirmado' as const;
        if (m?.estado === 'pendente') return 'feito_pendente' as const;
        if (m?.estado === 'cancelado') return 'disponivel' as const;
        return quintaIndisponivel ? ('indisponivel' as const) : ('disponivel' as const);
      })(),
    },
  ];

  return {
    missoes,
    graos_semana_possivel: GRAOS_MAX_SEMANA,
    graos_semana_ganhos: ganhosConfirmados + ganhosPendentes,
  };
}

export async function registrarLoginSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
) {
  await sincronizarMissoesSemanaGraos(supabase, colaboradorId, semanaInicio);
}

export async function obterResumoGraosColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string,
  opts?: { sincronizar?: boolean; creditarLogin?: boolean }
) {
  if (opts?.sincronizar !== false) {
    await sincronizarMissoesSemanaGraos(supabase, colaboradorId, semanaInicio, {
      creditarLogin: opts?.creditarLogin ?? true,
    });
  }
  const saldoSemana = await calcularSaldoGraos(supabase, colaboradorId, { semanaInicio });
  const eleg = await calcularElegibilidadeSemanaComUi(
    supabase,
    colaboradorId,
    semanaInicio,
    saldoSemana.pendente
  );
  const { missoes, graos_semana_possivel, graos_semana_ganhos } = await montarMissoesUi(
    supabase,
    colaboradorId,
    semanaInicio
  );
  return { eleg, missoes, graos_semana_possivel, graos_semana_ganhos };
}
