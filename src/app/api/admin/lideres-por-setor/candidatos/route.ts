import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { podeSerLider } from '@/lib/pode-ser-lider';
import { normalizePortalRole } from '@/lib/roles';

/** Colaboradores elegíveis como líder de setor numa unidade (para o select do admin). */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get('unidade_id')?.trim() ?? '';
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() ?? '';

  try {
    const supabase = createAdminClient();
    let uid = unidadeId;
    if (!uid && unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id').eq('slug', unidadeSlug).maybeSingle();
      uid = u?.id ? String(u.id) : '';
    }
    if (!uid) {
      return NextResponse.json({ ok: false, erro: 'unidade_id ou unidade_slug obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, setor')
      .eq('unidade_id', uid)
      .order('nome');

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const candidatos = (data ?? [])
      .filter((c) => {
        const r = normalizePortalRole((c as { role?: string }).role);
        if (r === 'socio') return false;
        return podeSerLider((c as { role?: string }).role, (c as { cargo?: string }).cargo);
      })
      .map((c) => ({
        id: String(c.id),
        nome: String(c.nome ?? ''),
        role: String((c as { role?: string }).role ?? ''),
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        setor: (c as { setor?: string | null }).setor ?? null,
      }));

    return NextResponse.json({ ok: true, candidatos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
