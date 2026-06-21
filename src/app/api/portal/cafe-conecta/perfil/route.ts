import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { grupoCafeConectaPorUnidadeSlug } from '@/lib/cafe-conecta/config';
import { resumoPerfilCafeConecta } from '@/lib/cafe-conecta/historico';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const u = Array.isArray(col.unidades) ? col.unidades[0] : col.unidades;
    const grupo = grupoCafeConectaPorUnidadeSlug(u?.slug ? String(u.slug) : '');
    if (!grupo) {
      return NextResponse.json(
        { ok: true, resumo: { total_participacoes: 0, dias_desde_ultima: null, participacoes: [] } },
        { headers: NO_STORE }
      );
    }

    const resumo = await resumoPerfilCafeConecta(supabase, colaboradorId, grupo.slug);
    return NextResponse.json({ ok: true, resumo }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    if (/cafe_conecta/i.test(msg)) {
      return NextResponse.json(
        { ok: true, resumo: { total_participacoes: 0, dias_desde_ultima: null, participacoes: [] } },
        { headers: NO_STORE }
      );
    }
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
