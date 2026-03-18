import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const TIPOS = ['sugestao', 'reclamacao'] as const;

/** POST: Envia sugestão ou reclamação. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { tipo?: string; texto?: string; anonimo?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const tipo = body.tipo?.toLowerCase();
  if (!tipo || !TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return NextResponse.json({ ok: false, erro: 'Tipo inválido. Use: sugestao ou reclamacao.' }, { status: 400 });
  }

  const texto = body.texto?.trim();
  if (!texto || texto.length < 5) {
    return NextResponse.json({ ok: false, erro: 'Escreva pelo menos 5 caracteres.' }, { status: 400 });
  }

  const anonimo = body.anonimo === true;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sugestoes_reclamacoes')
      .insert({
        colaborador_id: anonimo ? null : colaboradorId,
        tipo,
        texto,
        anonimo,
        unidade_id: unidadeId || null,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
