import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole, podeParticiparGraosCafe } from '@/lib/roles';
import { ehQuintaSaoPaulo, hojeIsoSaoPaulo, inicioCicloTreinoQuintaUtcIsoSp, segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { creditarMissaoGraos, refKeyGraos } from '@/lib/graos/movimentos';
import { GRAOS_MISSAO } from '@/lib/graos/constants';
import { processarElegibilidadeSemanaGraos } from '@/lib/graos/movimentos';
import { semanaVigenteParaGraos } from '@/lib/graos/semana-vigencia';
import { resolverQuintaTreino } from '@/lib/graos/quinta-treino';
import {
  chaveTreinoAutomaticoColaborador,
  registrarVisualizacaoTreinoAutomatico,
} from '@/lib/treinamento-acompanhamento';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Concluir treino da quinta (+5 Grãos). */
export async function POST() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  if (!ehQuintaSaoPaulo()) {
    return NextResponse.json(
      { ok: false, erro: 'Quinta do café disponível apenas na quinta-feira (horário de São Paulo).' },
      { status: 403, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('role, tipo_escala')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (!colab || !podeParticiparGraosCafe((colab as { role?: string }).role, { tipo_escala: (colab as { tipo_escala?: string | null }).tipo_escala })) {
      return NextResponse.json({ ok: false, erro: 'Apenas colaboradores.' }, { status: 403, headers: NO_STORE });
    }

    const dataQuinta = hojeIsoSaoPaulo();
    const semanaInicio = segundaSemanaSaoPaulo();

    if (!semanaVigenteParaGraos(semanaInicio)) {
      return NextResponse.json(
        { ok: false, erro: 'Grãos de café ainda não estavam ativos nesta semana.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const quinta = resolverQuintaTreino(undefined, 'colaborador');
    if (quinta.youtube_video_id) {
      const chave = chaveTreinoAutomaticoColaborador(quinta.youtube_video_id);
      const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();
      const { data: anterior } = await supabase
        .from('treinamento_automatico_registros')
        .select('id')
        .eq('treino_chave', chave)
        .lt('visualizado_em', cicloUtc)
        .limit(1);
      if ((anterior ?? []).length > 0) {
        return NextResponse.json(
          { ok: false, erro: 'O treino desta semana ainda não foi publicado.' },
          { status: 403, headers: NO_STORE }
        );
      }
    }

    const { error: errIns } = await supabase.from('graos_quinta_conclusoes').upsert(
      { colaborador_id: colaboradorId, data_quinta: dataQuinta },
      { onConflict: 'colaborador_id,data_quinta' }
    );

    if (errIns) {
      return NextResponse.json({ ok: false, erro: errIns.message }, { status: 500, headers: NO_STORE });
    }

    if (quinta.youtube_video_id) {
      await registrarVisualizacaoTreinoAutomatico(
        supabase,
        colaboradorId,
        chaveTreinoAutomaticoColaborador(quinta.youtube_video_id)
      );
    }

    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'quinta',
      graos: GRAOS_MISSAO.quinta,
      refKey: refKeyGraos(colaboradorId, 'quinta', semanaInicio, dataQuinta),
      descricao: 'Quinta do café',
    });

    await processarElegibilidadeSemanaGraos(supabase, colaboradorId, semanaInicio);

    return NextResponse.json({ ok: true, graos: GRAOS_MISSAO.quinta }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
