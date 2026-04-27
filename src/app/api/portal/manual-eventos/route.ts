import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const TIPOS_EVENTO_VALIDOS = new Set(['printscreen', 'atalho_impressao', 'beforeprint']);

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { tipo?: string; manual_path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const tipo = String(body.tipo ?? '').trim().toLowerCase();
  if (!TIPOS_EVENTO_VALIDOS.has(tipo)) {
    return NextResponse.json({ ok: false, erro: 'Tipo de evento inválido' }, { status: 400 });
  }

  const manualPath = String(body.manual_path ?? '').trim().slice(0, 300) || null;
  const hdrs = await headers();
  const userAgent = String(hdrs.get('user-agent') ?? '').slice(0, 500) || null;
  const forwardedFor = hdrs.get('x-forwarded-for');
  const ip = (forwardedFor ? forwardedFor.split(',')[0] : null)?.trim() || null;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('manual_eventos').insert({
      colaborador_id: colaboradorId,
      tipo,
      manual_path: manualPath,
      user_agent: userAgent,
      ip,
    });
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
