import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { montarAudienciaAviso } from '@/lib/audiencia-comunicacao';
import { labelPublicoAviso } from '@/lib/avisos-publico';

/** Quem confirmou, quem só abriu e quem ainda não fez nada. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const audiencia = await montarAudienciaAviso(supabase, id);
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
