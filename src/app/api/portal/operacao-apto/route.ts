import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalGerenteSession } from '@/lib/portal-gerente-session';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';

/** Líder marca colaborador como apto na função (sem menção a bonificação na UI). */
export async function POST(req: Request) {
  const auth = await requirePortalGerenteSession();
  if (!auth.ok) return auth.response;

  let body: { colaborador_id?: string; apto?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const alvoId = String(body.colaborador_id ?? '').trim();
  const apto = body.apto !== false;

  if (!alvoId) {
    return NextResponse.json({ ok: false, erro: 'colaborador_id obrigatório' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { colaboradorId, unidadeId } = auth.ctx;

    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, colaboradorId, unidadeId);
    if (!equipe.some((m) => m.id === alvoId)) {
      return NextResponse.json(
        { ok: false, erro: 'Colaborador fora da sua equipe para avaliação.' },
        { status: 403 }
      );
    }

    const payload = apto
      ? {
          operacao_apto: true,
          operacao_apto_em: new Date().toISOString(),
          operacao_apto_por: colaboradorId,
          updated_at: new Date().toISOString(),
        }
      : {
          operacao_apto: false,
          operacao_apto_em: null,
          operacao_apto_por: null,
          updated_at: new Date().toISOString(),
        };

    const { error } = await supabase.from('colaboradores').update(payload).eq('id', alvoId);

    if (error) {
      if (/operacao_apto/i.test(error.message)) {
        return NextResponse.json(
          {
            ok: false,
            erro: 'Campo operacao_apto ausente no banco. Aplique a migration 035_operacao_apto.sql.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, operacao_apto: apto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
