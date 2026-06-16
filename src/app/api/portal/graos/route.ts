import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { ehQuintaSaoPaulo } from '@/lib/semana-brasil';
import { calcularSaldoGraos, listarExtratoGraos } from '@/lib/graos/movimentos';
import { obterResumoGraosColaborador } from '@/lib/graos/missoes';
import { nivelGraosPorTotal } from '@/lib/graos/nivel';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: colab, error: errColab } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errColab || !colab) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = normalizePortalRole((colab as { role?: string }).role);
    if (role !== 'colaborador') {
      return NextResponse.json(
        { ok: false, erro: 'Grãos de café são apenas para colaboradores da operação.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const semanaInicio = segundaSemanaSaoPaulo();
    const resumo = await obterResumoGraosColaborador(supabase, colaboradorId, semanaInicio);
    const saldo = await calcularSaldoGraos(supabase, colaboradorId);
    const extrato = await listarExtratoGraos(supabase, colaboradorId, 15);
    const nivel = nivelGraosPorTotal(saldo.total_ganho_confirmado);

    const { data: catalogo } = await supabase
      .from('graos_catalogo')
      .select('id, nome, graos')
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    return NextResponse.json(
      {
        ok: true,
        semana_inicio: semanaInicio,
        saldo_confirmado: saldo.confirmado,
        saldo_pendente: saldo.pendente,
        nivel: { emoji: nivel.emoji, label: nivel.label },
        elegibilidade: resumo.eleg,
        missoes: resumo.missoes,
        graos_semana_possivel: resumo.graos_semana_possivel,
        graos_semana_ganhos: resumo.graos_semana_ganhos,
        aviso_quinta: ehQuintaSaoPaulo()
          ? null
          : 'Toda quinta-feira tem treino rápido no portal. Concluindo, você ganha +5 Grãos extras (até 40 na semana).',
        eh_quinta: ehQuintaSaoPaulo(),
        catalogo: catalogo ?? [],
        extrato,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
