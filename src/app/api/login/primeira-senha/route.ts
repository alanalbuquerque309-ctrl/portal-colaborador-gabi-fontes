import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';
import { senhaNumerica6Valida } from '@/lib/senha-portal';
import { updateSenhaColaboradorCompat } from '@/lib/colaborador-forca-troca-compat';

/**
 * Primeiro acesso: define senha quando ainda não existe hash no banco.
 */
export async function POST(req: Request) {
  let body: { cpf?: string; senha?: string; senhaConfirmacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const cleanCpf = String(body.cpf ?? '')
    .replace(/\D/g, '')
    .trim()
    .padStart(11, '0');
  const senha = String(body.senha ?? '').trim();
  const senha2 = String(body.senhaConfirmacao ?? '').trim();

  if (cleanCpf.length !== 11) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido' }, { status: 400 });
  }
  if (!senhaNumerica6Valida(senha)) {
    return NextResponse.json(
      { ok: false, erro: 'A senha deve ter exatamente 6 números.' },
      { status: 400 }
    );
  }
  if (senha !== senha2) {
    return NextResponse.json({ ok: false, erro: 'As senhas não coincidem.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash')
      .eq('cpf', cleanCpf)
      .single();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'CPF não cadastrado.' }, { status: 404 });
    }

    if ((col as { senha_hash?: string | null }).senha_hash) {
      return NextResponse.json(
        { ok: false, erro: 'Senha já cadastrada. Use o login com CPF e senha.' },
        { status: 400 }
      );
    }

    const hash = hashPassword(senha);
    const { error: upErr } = await updateSenhaColaboradorCompat(supabase, cleanCpf, hash, true);

    if (upErr) {
      return NextResponse.json({ ok: false, erro: 'Não foi possível salvar a senha.' }, { status: 500 });
    }

    const payload = buildPortalLoginJson(
      {
        id: col.id,
        unidade_id: col.unidade_id,
        role: (col as { role?: string }).role,
        onboarding_completo: (col as { onboarding_completo?: boolean }).onboarding_completo,
      },
      cleanCpf
    );

    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
