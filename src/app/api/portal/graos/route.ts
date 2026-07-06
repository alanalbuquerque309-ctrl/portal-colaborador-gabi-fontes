import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole, podeVerGraosCafePortal, podeParticiparGraosCafe, podeVerTodosTreinosQuinta } from '@/lib/roles';
import { podeVerGraosGestaoTodos } from '@/lib/graos-access';
import { segundaSemanaSaoPaulo, ehQuintaSaoPaulo } from '@/lib/semana-brasil';
import { calcularSaldoGraos, listarExtratoGraos } from '@/lib/graos/movimentos';
import { obterResumoGraosColaborador } from '@/lib/graos/missoes';
import { listarGraosGestao } from '@/lib/graos/gestao-lista';
import { listarCatalogoGraosAtivo } from '@/lib/graos/catalogo';
import { nivelGraosPorTotal } from '@/lib/graos/nivel';
import { resolverQuintaTreino, resolverParTreinosQuinta } from '@/lib/graos/quinta-treino';
import {
  avaliarElegibilidadeResgateSairCedo,
  enriquecerCatalogoResgateSairCedo,
} from '@/lib/graos/resgate-sair-cedo-elegibilidade';
import { GRAOS_CONGELADO_MENSAGEM, graosCongelado } from '@/lib/graos/congelado';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const viewerId = cookieStore.get('portal_colaborador_id')?.value;
  if (!viewerId || viewerId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  const alvoParam = new URL(req.url).searchParams.get('colaborador_id')?.trim() ?? '';

  try {
    const supabase = createAdminClient();
    const { data: viewer, error: errViewer } = await supabase
      .from('colaboradores')
      .select('role, tipo_escala')
      .eq('id', viewerId)
      .maybeSingle();

    if (errViewer || !viewer) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = normalizePortalRole((viewer as { role?: string }).role);
    if (!podeVerGraosCafePortal(role, viewerId)) {
      return NextResponse.json(
        { ok: false, erro: 'Grãos de café não disponível para este perfil.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const gestao = podeVerGraosGestaoTodos(role, viewerId);
    const colaboradorOperacao = podeParticiparGraosCafe(role, {
      tipo_escala: (viewer as { tipo_escala?: string | null }).tipo_escala,
    });

    if (!colaboradorOperacao && alvoParam && alvoParam !== viewerId && !gestao) {
      return NextResponse.json({ ok: false, erro: 'Acesso negado.' }, { status: 403, headers: NO_STORE });
    }

    if (colaboradorOperacao && alvoParam && alvoParam !== viewerId) {
      return NextResponse.json(
        { ok: false, erro: 'Você só pode ver seus próprios Grãos.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const semanaInicio = segundaSemanaSaoPaulo();
    const origin = new URL(req.url).origin;
    const ehQuinta = ehQuintaSaoPaulo();
    const congelado = graosCongelado();
    const verTodosTreinos = podeVerTodosTreinosQuinta(role);
    const quintaTreino = resolverQuintaTreino(origin, 'colaborador');
    const treinosQuinta = verTodosTreinos ? resolverParTreinosQuinta(origin) : null;

    if (gestao && !alvoParam) {
      const colaboradores = await listarGraosGestao(supabase, semanaInicio);
      const catalogo = await listarCatalogoGraosAtivo(supabase);

      return NextResponse.json(
        {
          ok: true,
          modo_gestao: true,
          apenas_visualizacao: true,
          congelado,
          congelado_mensagem: congelado ? GRAOS_CONGELADO_MENSAGEM : null,
          semana_inicio: semanaInicio,
          eh_quinta: ehQuinta,
          treinos_quinta: treinosQuinta,
          colaboradores,
          catalogo,
        },
        { headers: NO_STORE }
      );
    }

    const colaboradorId = gestao && alvoParam ? alvoParam : viewerId;

    if (gestao && alvoParam) {
      const { data: alvo } = await supabase
        .from('colaboradores')
        .select('id, nome, role')
        .eq('id', alvoParam)
        .maybeSingle();

      if (!alvo || normalizePortalRole((alvo as { role?: string }).role) !== 'colaborador') {
        return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado.' }, { status: 404, headers: NO_STORE });
      }
    }

    const apenasVisualizacao = !colaboradorOperacao || (gestao && colaboradorId !== viewerId);

    const resumo = await obterResumoGraosColaborador(supabase, colaboradorId, semanaInicio, {
      sincronizar: !congelado && colaboradorOperacao && colaboradorId === viewerId,
      creditarLogin: !congelado && colaboradorOperacao && colaboradorId === viewerId,
    });
    const saldoTotal = await calcularSaldoGraos(supabase, colaboradorId);
    const saldoSemana = await calcularSaldoGraos(supabase, colaboradorId, { semanaInicio });
    const extrato = await listarExtratoGraos(supabase, colaboradorId, 15, { ocultarCancelados: true });
    const nivel = nivelGraosPorTotal(saldoTotal.total_ganho_confirmado);

    const catalogo = await listarCatalogoGraosAtivo(supabase);

    const elegSairCedo =
      colaboradorOperacao && colaboradorId === viewerId
        ? await avaliarElegibilidadeResgateSairCedo(supabase, colaboradorId)
        : null;
    const catalogoEnriquecido = enriquecerCatalogoResgateSairCedo(catalogo, elegSairCedo);

    let colaboradorNome: string | undefined;
    if (gestao && colaboradorId !== viewerId) {
      const { data: alvoNome } = await supabase
        .from('colaboradores')
        .select('nome')
        .eq('id', colaboradorId)
        .maybeSingle();
      colaboradorNome = String((alvoNome as { nome?: string } | null)?.nome ?? '');
    }

    return NextResponse.json(
      {
        ok: true,
        modo_gestao: gestao,
        apenas_visualizacao: apenasVisualizacao,
        congelado,
        congelado_mensagem: congelado ? GRAOS_CONGELADO_MENSAGEM : null,
        colaborador_id: colaboradorId,
        colaborador_nome: colaboradorNome,
        semana_inicio: semanaInicio,
        saldo_confirmado: saldoTotal.confirmado,
        saldo_pendente: saldoSemana.pendente,
        nivel: { emoji: nivel.emoji, label: nivel.label },
        elegibilidade: resumo.eleg,
        missoes: resumo.missoes,
        graos_semana_possivel: resumo.graos_semana_possivel,
        graos_semana_ganhos: resumo.graos_semana_ganhos,
        aviso_quinta: ehQuinta
          ? null
          : 'O treino da semana continua disponível para assistir. Na próxima quinta, conclua para ganhar +5 Grãos.',
        eh_quinta: ehQuinta,
        quinta_treino: quintaTreino,
        treinos_quinta: verTodosTreinos ? treinosQuinta ?? resolverParTreinosQuinta(origin) : null,
        catalogo: catalogoEnriquecido,
        resgate_sair_cedo: elegSairCedo,
        extrato,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
