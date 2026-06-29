import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { montarAcompanhamentoTreinamentos } from '@/lib/treinamento-acompanhamento';
import { authGestorTreinamento } from '@/lib/treinamento-gestao-auth';

/** Resumo de quem assistiu / não assistiu a cada treinamento ativo (gestão). */
export async function GET() {
  const auth = await authGestorTreinamento();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createAdminClient();
    const itens = await montarAcompanhamentoTreinamentos(supabase);
    return NextResponse.json({ ok: true, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
