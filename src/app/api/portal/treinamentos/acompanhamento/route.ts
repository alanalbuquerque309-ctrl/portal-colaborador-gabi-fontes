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
    const [acompanhamento, migracao_064_pendente] = await Promise.all([
      montarAcompanhamentoTreinamentos(supabase),
      migration064TreinamentoPendente(supabase),
    ]);
    return NextResponse.json({
      ok: true,
      itens: acompanhamento.itens,
      ciclo_quinta_inicio: acompanhamento.ciclo_quinta_inicio,
      ciclo_quinta_rotulo: acompanhamento.ciclo_quinta_rotulo,
      migracao_064_pendente,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
