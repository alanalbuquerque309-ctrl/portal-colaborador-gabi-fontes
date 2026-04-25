import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateCpf } from '@/lib/utils/cpf';
import { buildPortalLoginJson } from '@/lib/portal-login-response';

/**
 * Colaborador informa o CPF para concluir o cadastro (CPF opcional no cadastro pelo RH).
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { cpf?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const cpfLimpo = String(body.cpf ?? '').replace(/\D/g, '');
  if (!validateCpf(cpfLimpo)) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido. Verifique os dígitos.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: row, error: fetchErr } = await supabase
      .from('colaboradores')
      .select('id, cpf, unidade_id, role, onboarding_completo')
      .eq('id', colaboradorId)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ ok: false, erro: 'Cadastro não encontrado' }, { status: 404 });
    }

    const cpfAtual = String((row as { cpf?: string | null }).cpf ?? '').trim();
    if (cpfAtual) {
      return NextResponse.json({ ok: false, erro: 'CPF já foi cadastrado neste perfil.' }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('colaboradores')
      .update({ cpf: cpfLimpo, updated_at: updatedAt })
      .eq('id', colaboradorId);

    if (upErr) {
      if (upErr.code === '23505') {
        return NextResponse.json({ ok: false, erro: 'Este CPF já está cadastrado para outro colaborador.' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, erro: upErr.message }, { status: 500 });
    }

    const { data: atualizado, error: reloadErr } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role, onboarding_completo')
      .eq('id', colaboradorId)
      .single();

    if (reloadErr || !atualizado) {
      return NextResponse.json({ ok: true, mensagem: 'CPF salvo.' });
    }

    const nextPayload = buildPortalLoginJson(
      {
        id: atualizado.id,
        unidade_id: atualizado.unidade_id,
        role: (atualizado as { role?: string }).role,
        onboarding_completo: (atualizado as { onboarding_completo?: boolean }).onboarding_completo,
      },
      ''
    );

    // Mesmo fluxo de entrar-socio-admin (senha já validada no login anterior).
    if ('action' in nextPayload && nextPayload.action === 'socio_admin') {
      if (!(atualizado as { onboarding_completo?: boolean }).onboarding_completo) {
        await supabase
          .from('colaboradores')
          .update({
            onboarding_completo: true,
            termo_aceite_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', atualizado.id);
      }
      const res = NextResponse.json({
        ok: true,
        redirect: '/portal',
        colaborador: {
          id: atualizado.id,
          unidade_id: atualizado.unidade_id,
          role: (atualizado as { role?: string }).role || 'socio',
        },
      });
      const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false, SameSite: 'lax' as const };
      res.cookies.set('portal_colaborador_id', atualizado.id, opts);
      res.cookies.set('portal_unidade_id', atualizado.unidade_id, opts);
      res.cookies.set(
        'portal_role',
        String((atualizado as { role?: string }).role || 'socio'),
        opts
      );
      return res;
    }

    return NextResponse.json(nextPayload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
