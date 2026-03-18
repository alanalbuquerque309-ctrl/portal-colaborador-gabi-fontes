import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UNIDADES_PADRAO = [
  { nome: 'Matriz (todas as lojas)', slug: 'matriz' },
  { nome: 'Mesquita', slug: 'mesquita' },
  { nome: 'Barra', slug: 'barra' },
  { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
];

/** Retorna unidades para o formulário. Se a tabela estiver vazia, insere as padrão e retorna. */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: existentes, error: fetchErr } = await supabase
      .from('unidades')
      .select('id, nome, slug')
      .order('nome');

    if (fetchErr) {
      return NextResponse.json({ ok: false, erro: fetchErr.message }, { status: 500 });
    }

    if (existentes && existentes.length > 0) {
      const temMatriz = existentes.some((u) => u.slug === 'matriz');
      if (!temMatriz) {
        await supabase.from('unidades').insert({ nome: 'Matriz (todas as lojas)', slug: 'matriz' });
        const { data: apos } = await supabase.from('unidades').select('id, nome, slug').order('nome');
        return NextResponse.json({ ok: true, unidades: apos ?? existentes });
      }
      return NextResponse.json({ ok: true, unidades: existentes });
    }

    const { data: inseridas, error: insErr } = await supabase
      .from('unidades')
      .insert(
        UNIDADES_PADRAO.map((u) => ({ nome: u.nome, slug: u.slug }))
      )
      .select('id, nome, slug')
      .order('nome');

    if (insErr) {
      return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, unidades: inseridas ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
