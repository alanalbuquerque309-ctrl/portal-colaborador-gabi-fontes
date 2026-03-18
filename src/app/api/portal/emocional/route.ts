import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const EMOCOES = ['feliz', 'tranquilo', 'neutro', 'cansado', 'frustrado'];

/** POST: Registra como o colaborador está se sentindo hoje. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { emocao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const emocao = body.emocao?.toLowerCase()?.trim();
  if (!emocao || !EMOCOES.includes(emocao)) {
    return NextResponse.json({ ok: false, erro: 'Emoção inválida. Use: feliz, tranquilo, neutro, cansado ou frustrado.' }, { status: 400 });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('emocional_registro').upsert(
      { colaborador_id: colaboradorId, data: hoje, emocao },
      { onConflict: 'colaborador_id,data' }
    );

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** GET: Retorna o registro de hoje (se existir). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('emocional_registro')
      .select('emocao')
      .eq('colaborador_id', colaboradorId)
      .eq('data', hoje)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, emocao: data?.emocao ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
