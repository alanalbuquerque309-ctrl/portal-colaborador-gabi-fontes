import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Lista colaboradores para escalas (admin), excluindo sócios.
 * Usa service role para não depender de RLS no browser.
 */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, role, setor, unidade_id, unidades(nome, slug)')
      .or('role.eq.colaborador,role.eq.admin,role.eq.gerente,role.eq.rh,role.eq.master,role.is.null')
      .order('nome');

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const colaboradores = (data ?? []).map((c: Record<string, unknown>) => {
      const un = c.unidades as { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
      const u = Array.isArray(un) ? un[0] : un;
      return {
        id: String(c.id ?? ''),
        nome: String(c.nome ?? ''),
        setor: (c.setor as string | null) ?? null,
        unidade_id: (c.unidade_id as string | null) ?? null,
        unidade_nome: u?.nome ? String(u.nome) : undefined,
        unidade_slug: u?.slug ? String(u.slug) : undefined,
      };
    });

    return NextResponse.json({ ok: true, colaboradores });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
