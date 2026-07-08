import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { dataCivilBr } from '@/lib/data-civil-br';
import { registrarPresencaPortal } from '@/lib/registrar-presenca-portal';
import { graosCongelado } from '@/lib/graos/congelado';
import { registrarLoginSemanaGraos } from '@/lib/graos/missoes';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import {
  EMOCOES_IDS,
  isEmocaoId,
  emocaoRequerAlertaGestao,
  sanitizarMotivoEmocional,
} from '@/lib/emocional-opcoes';

const SELECTS_REGISTRO = ['emocao, motivo', 'emocao'] as const;

function erroColunaMotivo(msg: string): boolean {
  return /motivo|column .* does not exist|schema cache/i.test(msg);
}

async function lerRegistroHoje(supabase: ReturnType<typeof createAdminClient>, colaboradorId: string, hoje: string) {
  for (const sel of SELECTS_REGISTRO) {
    const res = await supabase
      .from('emocional_registro')
      .select(sel)
      .eq('colaborador_id', colaboradorId)
      .eq('data', hoje)
      .maybeSingle();

    if (!res.error) {
      const row = res.data as { emocao?: string; motivo?: string | null } | null;
      return {
        emocao: row?.emocao ?? null,
        motivo: row?.motivo ?? null,
      };
    }
    if (!erroColunaMotivo(res.error.message)) {
      throw new Error(res.error.message);
    }
  }
  return { emocao: null, motivo: null };
}

/** POST: Registra como o colaborador está se sentindo hoje (só gestão vê detalhe com nome). */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { emocao?: string; motivo?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const emocao = body.emocao?.toLowerCase()?.trim();
  if (!emocao || !isEmocaoId(emocao)) {
    return NextResponse.json(
      {
        ok: false,
        erro: `Emoção inválida. Use: ${EMOCOES_IDS.join(', ')}.`,
      },
      { status: 400 }
    );
  }

  const motivo =
    body.motivo === null || body.motivo === ''
      ? null
      : sanitizarMotivoEmocional(body.motivo);
  const hoje = dataCivilBr();

  try {
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {
      colaborador_id: colaboradorId,
      data: hoje,
      emocao,
      motivo,
    };

    let error = (
      await supabase.from('emocional_registro').upsert(payload, { onConflict: 'colaborador_id,data' })
    ).error;

    if (error && erroColunaMotivo(error.message)) {
      delete payload.motivo;
      error = (
        await supabase.from('emocional_registro').upsert(payload, { onConflict: 'colaborador_id,data' })
      ).error;
    }

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    await registrarPresencaPortal(supabase, colaboradorId);
    if (!graosCongelado()) {
      await registrarLoginSemanaGraos(supabase, colaboradorId, segundaSemanaSaoPaulo());
    }

    return NextResponse.json({ ok: true, alerta_gestao: emocaoRequerAlertaGestao(emocao), motivo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** GET: Registro de hoje do próprio colaborador (emoção + motivo que ele escreveu). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const hoje = dataCivilBr();

  try {
    const supabase = createAdminClient();
    const registro = await lerRegistroHoje(supabase, colaboradorId, hoje);
    return NextResponse.json({ ok: true, ...registro });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
