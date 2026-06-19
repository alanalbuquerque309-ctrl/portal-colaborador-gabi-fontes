import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { marcarFeriasSemanaRede } from '@/lib/avaliacao-marcar-ferias-rede';
import { resolverAvaliadorPendenciasRede } from '@/lib/avaliacoes-pendentes-auth';
import { isDateIsoAvaliacao } from '@/lib/semana-referencia';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(req: Request) {
  const auth = await resolverAvaliadorPendenciasRede();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }

  let body: { colaborador_id?: string; data_referencia?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }

  const colaboradorId = String(body.colaborador_id ?? '').trim();
  const dataRef = String(body.data_referencia ?? '').trim();
  if (!colaboradorId) {
    return NextResponse.json({ ok: false, erro: 'colaborador_id obrigatório' }, { status: 400, headers: NO_STORE });
  }
  if (!dataRef || !isDateIsoAvaliacao(dataRef)) {
    return NextResponse.json(
      { ok: false, erro: 'data_referencia inválida (YYYY-MM-DD)' },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const resultado = await marcarFeriasSemanaRede(supabase, {
      colaboradorAlvoId: colaboradorId,
      dataIso: dataRef,
      avaliadorId: auth.avaliadorId,
    });

    if (!resultado.ok) {
      return NextResponse.json({ ok: false, erro: resultado.erro }, { status: resultado.status, headers: NO_STORE });
    }

    return NextResponse.json(
      {
        ok: true,
        ja_estava: resultado.ja_estava,
        colaborador_nome: resultado.colaborador_nome,
        mensagem: resultado.ja_estava
          ? `${resultado.colaborador_nome} já estava de férias nesta semana.`
          : `${resultado.colaborador_nome} registrado(a) de férias — pendência resolvida.`,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
