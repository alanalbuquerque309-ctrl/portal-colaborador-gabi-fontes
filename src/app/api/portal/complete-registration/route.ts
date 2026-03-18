import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const CPF_ALAN = '05376259765';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const pendingCpf = cookieStore.get('portal_pending_cpf')?.value;
  if (pendingCpf !== CPF_ALAN) {
    return NextResponse.json({ ok: false, erro: 'Sessão pendente inválida' }, { status: 403 });
  }

  let body: { nome?: string; email?: string; unidade_id?: string; unidade_slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { nome, email, unidade_id, unidade_slug } = body;
  if (!nome?.trim()) {
    return NextResponse.json({ ok: false, erro: 'Nome é obrigatório' }, { status: 400 });
  }
  if (!unidade_id && !unidade_slug) {
    return NextResponse.json({ ok: false, erro: 'Selecione uma unidade' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let unidadeIdResolvido = unidade_id;
    if (!unidadeIdResolvido && unidade_slug) {
      const { data: porSlug } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', unidade_slug)
        .maybeSingle();
      if (porSlug?.id) {
        unidadeIdResolvido = porSlug.id;
      } else {
        const UNIDADES_PADRAO: { nome: string; slug: string }[] = [
          { nome: 'Matriz (todas as lojas)', slug: 'matriz' },
          { nome: 'Mesquita', slug: 'mesquita' },
          { nome: 'Barra', slug: 'barra' },
          { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
        ];
        const mapa = Object.fromEntries(UNIDADES_PADRAO.map((u) => [u.slug, u]));
        const def = mapa[unidade_slug];
        if (def) {
          const { data: ins } = await supabase
            .from('unidades')
            .insert({ nome: def.nome, slug: def.slug })
            .select('id')
            .single();
          if (ins?.id) unidadeIdResolvido = ins.id;
        }
      }
    }
    if (!unidadeIdResolvido) {
      return NextResponse.json({ ok: false, erro: 'Unidade inválida' }, { status: 400 });
    }
    const insertData = {
      cpf: CPF_ALAN,
      nome: nome.trim(),
      email: email?.trim() || null,
      unidade_id: unidadeIdResolvido,
      onboarding_completo: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existente } = await supabase
      .from('colaboradores')
      .select('id, unidade_id')
      .eq('cpf', CPF_ALAN)
      .maybeSingle();

    let novo: { id: string; unidade_id: string };

    if (existente) {
      const { error: updErr } = await supabase
        .from('colaboradores')
        .update({ nome: insertData.nome, email: insertData.email, unidade_id: insertData.unidade_id, updated_at: insertData.updated_at })
        .eq('id', existente.id);
      if (updErr) return NextResponse.json({ ok: false, erro: updErr.message }, { status: 500 });
      novo = { id: existente.id, unidade_id: insertData.unidade_id };
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('colaboradores')
        .insert(insertData)
        .select('id, unidade_id')
        .single();
      if (insErr) return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });
      novo = inserted!;
    }

    const res = NextResponse.json({
      ok: true,
      colaborador: { id: novo.id, unidade_id: novo.unidade_id, role: 'socio' },
    });

    const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false, SameSite: 'lax' as const };
    res.cookies.set('portal_colaborador_id', novo.id, opts);
    res.cookies.set('portal_unidade_id', novo.unidade_id, opts);
    res.cookies.set('portal_role', 'socio', opts);
    res.cookies.set('portal_pending_cpf', '', { path: '/', maxAge: 0 });

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
