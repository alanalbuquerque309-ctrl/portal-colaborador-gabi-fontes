import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { montarAudienciaTreinamento } from '@/lib/audiencia-comunicacao';
import { labelPublicoAviso } from '@/lib/avisos-publico';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const audiencia = await montarAudienciaTreinamento(supabase, id);
    return NextResponse.json({
      ok: true,
      ...audiencia,
      publico_label: labelPublicoAviso(audiencia.publico),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
