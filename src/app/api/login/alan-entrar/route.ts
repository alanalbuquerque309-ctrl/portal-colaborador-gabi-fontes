import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CPF_ALAN = '05376259765';

const UNIDADES_PADRAO = [
  { nome: 'Matriz (todas as lojas)', slug: 'matriz' },
  { nome: 'Mesquita', slug: 'mesquita' },
  { nome: 'Barra', slug: 'barra' },
  { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
];

/**
 * Alan entra direto: garante que está cadastrado e retorna dados para sessão.
 * Nunca exige "Complete seu cadastro" — cadastra tudo no servidor.
 */
export async function POST(req: Request) {
  let body: { cpf?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const cpf = String(body.cpf ?? '').replace(/\D/g, '');
  if (cpf !== CPF_ALAN) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    // Garantir que unidades existem (upsert evita erro de duplicata)
    let { data: unidades } = await supabase.from('unidades').select('id, slug');
    if (!unidades?.length) {
      const { error: upsertErr } = await supabase
        .from('unidades')
        .upsert(UNIDADES_PADRAO, { onConflict: 'slug', ignoreDuplicates: false });
      if (upsertErr) {
        return NextResponse.json(
          { ok: false, erro: `Erro ao configurar unidades: ${upsertErr.message}` },
          { status: 500 }
        );
      }
      const r = await supabase.from('unidades').select('id, slug');
      unidades = r.data ?? [];
    }

    const matriz = unidades?.find((u) => u.slug === 'matriz') ?? unidades?.[0];
    const unidadeId = matriz?.id;
    if (!unidadeId) {
      return NextResponse.json(
        { ok: false, erro: 'Unidades não configuradas. Execute as migrations no Supabase.' },
        { status: 500 }
      );
    }

    const { data: existente } = await supabase
      .from('colaboradores')
      .select('id, unidade_id')
      .eq('cpf', cpf)
      .maybeSingle();

    let colaborador: { id: string; unidade_id: string };

    if (existente) {
      colaborador = { id: existente.id, unidade_id: existente.unidade_id };
    } else {
      const { data: novo, error } = await supabase
        .from('colaboradores')
        .insert({
          cpf,
          nome: 'Alan Albuquerque',
          unidade_id: unidadeId,
          onboarding_completo: true,
          role: 'socio',
        })
        .select('id, unidade_id')
        .single();

      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      colaborador = novo!;
    }

    const res = NextResponse.json({
      ok: true,
      colaborador: { id: colaborador.id, unidade_id: colaborador.unidade_id, role: 'socio' },
    });

    const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false, SameSite: 'lax' as const };
    res.cookies.set('portal_colaborador_id', colaborador.id, opts);
    res.cookies.set('portal_unidade_id', colaborador.unidade_id, opts);
    res.cookies.set('portal_role', 'socio', opts);
    res.cookies.set('portal_pending_cpf', '', { path: '/', maxAge: 0 });

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
