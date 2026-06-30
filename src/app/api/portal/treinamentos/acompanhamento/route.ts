import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { montarAcompanhamentoTreinamentos, migration064TreinamentoPendente } from '@/lib/treinamento-acompanhamento';
import { authGestorTreinamento } from '@/lib/treinamento-gestao-auth';

/** Resumo de quem assistiu / não assistiu a cada treinamento ativo (gestão). */
export async function GET() {
  const auth = await authGestorTreinamento();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createAdminClient();
    const [itens, migracao_064_pendente] = await Promise.all([
      montarAcompanhamentoTreinamentos(supabase),
      migration064TreinamentoPendente(supabase),
    ]);
    return NextResponse.json({ ok: true, itens, migracao_064_pendente });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
