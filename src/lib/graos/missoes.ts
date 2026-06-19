import type { SupabaseClient } from '@supabase/supabase-js';
import { GRAOS_MISSAO, GRAOS_MAX_SEMANA, GRAOS_SUGESTAO_MAX_SEMANA, type GraosMissaoId } from '@/lib/graos/constants';
import { calcularElegibilidadeSemanaComUi } from '@/lib/graos/elegibilidade';
import {
  calcularSaldoGraos,
  creditarMissaoGraos,
  deduplicarLoginSemanaColaborador,
  encerrarPendentesSemanasPassadas,
  processarElegibilidadeTodasSemanasPendentesGraos,
  refKeyGraos,
} from '@/lib/graos/movimentos';
import { graosPorTrofeusEnviadosNaSemana } from '@/lib/graos/trofeus-graos';
import { ehQuintaSaoPaulo, hojeIsoSaoPaulo } from '@/lib/semana-brasil';

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
  if (m.estado === 'cancelado') return 'bloqueado';
  return 'disponivel';
}

export async function sincronizarMissoesSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string,
  opts?: { creditarLogin?: boolean }
): Promise<void> {
  await encerrarPendentesSemanasPassadas(supabase, colaboradorId, semanaInicio);
  await deduplicarLoginSemanaColaborador(supabase, colaboradorId);

  // Entrada no portal: 1 crédito/semana, só quando o colaborador acessa o portal (sync explícito).
  if (opts?.creditarLogin !== false) {
    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'login_semana',
      graos: GRAOS_MISSAO.login_semana,
      refKey: refKeyGraos(colaboradorId, 'login_semana', semanaInicio),
      descricao: 'Entrada no portal na semana',
    });
  }

  // Aviso confirmado (1/semana)
  const { data: confs } = await supabase
    .from('aviso_confirmacoes')
    .select('aviso_id, created_at')
    .eq('colaborador_id', colaboradorId)
    .gte('created_at', `${semanaInicio}T00:00:00`)
    .order('created_at', { ascending: true })
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

  // Avaliar liderança
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

  // Sugestão
  const { count: sugCount } = await supabase
    .from('sugestoes_reclamacoes')
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', colaboradorId)
    .eq('tipo', 'sugestao')
    .gte('created_at', `${semanaInicio}T00:00:00`);

  if ((sugCount ?? 0) > 0) {
    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'sugestao_semana',
      graos: GRAOS_MISSAO.sugestao_semana,
      refKey: refKeyGraos(colaboradorId, 'sugestao_semana', semanaInicio),
      descricao: 'Enviar sugestão',
    });
  }

  // Troféus
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
}

export async function montarMissoesUi(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<{ missoes: MissaoGraosUi[]; graos_semana_possivel: number; graos_semana_ganhos: number }> {
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
    map.set(rk, { estado: String(m.estado), graos: Number(m.graos) || 0 });
    if (String(m.missao) === 'quinta') {
      map.set('__quinta__', { estado: String(m.estado), graos: Number(m.graos) || 0 });
    }
    const g = Number(m.graos) || 0;
    if (g <= 0) continue;
    if (m.estado === 'confirmado') ganhosConfirmados += g;
    else if (m.estado === 'pendente') ganhosPendentes += g;
  }

  const quintaIndisponivel = !ehQuintaSaoPaulo();

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
      '/portal/avaliacao-lideranca',
      null
    ),
    mk(
      'trofeu_semana',
      'Enviar troféu entre pares',
      5,
      5,
      refKeyGraos(colaboradorId, 'trofeu_semana', semanaInicio),
      '/portal/mural',
      '1 troféu = 1 · 2 = 2 · 3+ = 5 Grãos'
    ),
    mk(
      'sugestao_semana',
      'Enviar sugestão',
      GRAOS_MISSAO.sugestao_semana,
      GRAOS_SUGESTAO_MAX_SEMANA,
      refKeyGraos(colaboradorId, 'sugestao_semana', semanaInicio),
      '/portal/sugestoes',
      '+7 se a gestão destacar: gostamos, vamos analisar'
    ),
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
        if (m?.estado === 'cancelado') return 'bloqueado' as const;
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
