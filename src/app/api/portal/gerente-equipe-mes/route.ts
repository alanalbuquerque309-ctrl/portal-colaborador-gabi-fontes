import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  agruparMediasPorColaborador,
  inicioDataReferenciaRanking,
  mediaMensalColaborador,
} from '@/lib/avaliacao-ranking';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { requirePortalGerenteSession } from '@/lib/portal-gerente-session';
import { listarEquipeDoLider } from '@/lib/colaborador-lideres';
import { normalizePortalRole } from '@/lib/roles';

function mesBoundsUTC(ano: number, mes: number): { ini: string; fim: string } {
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimo = new Date(Date.UTC(ano, mes, 0));
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimo.getUTCDate()).padStart(2, '0')}`;
  return { ini, fim };
}

/** Métricas do mês dos colaboradores com este gerente como líder direto. `dias_com_avaliacao` = semanas com registro no mês (uma linha por semana). */
export async function GET(req: Request) {
  const auth = await requirePortalGerenteSession();
  if (!auth.ok) return auth.response;

  const { colaboradorId: gerenteId, unidadeId } = auth.ctx;

  const { searchParams } = new URL(req.url);
  const mesParam = searchParams.get('mes')?.trim() ?? '';
  let ano: number;
  let mes: number;
  if (/^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split('-').map(Number);
    ano = y;
    mes = m;
  } else {
    const d = new Date();
    ano = d.getFullYear();
    mes = d.getMonth() + 1;
  }
  if (mes < 1 || mes > 12) {
    return NextResponse.json({ ok: false, erro: 'Mês inválido' }, { status: 400 });
  }

  const { ini, fim } = mesBoundsUTC(ano, mes);
  const mesRef = `${ano}-${String(mes).padStart(2, '0')}`;

  try {
    const supabase = createAdminClient();
    const equipe = await listarEquipeDoLider(supabase, gerenteId, unidadeId);

    const membros = equipe.filter((membro) => normalizePortalRole(membro.role) === 'colaborador');
    if (membros.length === 0) {
      return NextResponse.json({
        ok: true,
        mes_referencia: mesRef,
        colaboradores: [] as Array<{
          id: string;
          nome: string;
          media_mes: number | null;
          dias_com_avaliacao: number;
        }>,
      });
    }

    const ids = membros.map((m) => m.id as string);
    const refMin = inicioDataReferenciaRanking(ini);

    const { data: linhas, error: errLin } = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, avaliador_id, data_referencia, media_dia, created_at')
      .in('colaborador_id', ids)
      .gte('data_referencia', refMin)
      .lte('data_referencia', fim);

    if (errLin) {
      return NextResponse.json({ ok: false, erro: errLin.message }, { status: 500 });
    }

    const linhasMapeadas = filtrarAvaliacoesParaMedia(
      (linhas ?? []).map((row) => ({
        colaborador_id: String(row.colaborador_id),
        avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
        data_referencia: String(row.data_referencia),
        media_dia: row.media_dia as number | null,
        created_at: row.created_at != null ? String(row.created_at) : null,
        ignorada: (row as { ignorada?: boolean }).ignorada,
      }))
    );
    const ctx = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);
    const porId = agruparMediasPorColaborador(linhasMapeadas, ids, ini, ctx, fim);

    const colaboradores = membros.map((m) => {
      const id = m.id as string;
      const agg = mediaMensalColaborador(porId[id] ?? []);
      return {
        id,
        nome: String(m.nome ?? ''),
        media_mes: agg.media,
        dias_com_avaliacao: agg.dias,
      };
    });

    return NextResponse.json({ ok: true, mes_referencia: mesRef, colaboradores });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
