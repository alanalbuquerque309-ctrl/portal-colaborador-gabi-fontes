import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword, verifyPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';
import { senhaNumerica6Valida } from '@/lib/senha-portal';

/**
 * Troca senha quando `forca_troca_senha` ou senha atual é a padrão (123456).
 * Nova senha: exatamente 6 dígitos numéricos.
 */
export async function POST(req: Request) {
  let body: { cpf?: string; senha_atual?: string; senha_nova?: string; senha_confirmacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const cleanCpf = String(body.cpf ?? '')
    .replace(/\D/g, '')
    .trim()
    .padStart(11, '0');
  const senhaAtual = String(body.senha_atual ?? '').trim();
  const senhaNova = String(body.senha_nova ?? '').trim();
  const senha2 = String(body.senha_confirmacao ?? '').trim();

  if (cleanCpf.length !== 11) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido' }, { status: 400 });
  }
  if (!senhaAtual) {
    return NextResponse.json({ ok: false, erro: 'Informe a senha atual.' }, { status: 400 });
  }
  if (!senhaNumerica6Valida(senhaNova)) {
    return NextResponse.json(
      { ok: false, erro: 'A nova senha deve ter exatamente 6 números.' },
      { status: 400 }
    );
  }
  if (senhaNova !== senha2) {
    return NextResponse.json({ ok: false, erro: 'A confirmação não confere.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash, forca_troca_senha')
      .eq('cpf', cleanCpf)
      .single();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'CPF não cadastrado.' }, { status: 404 });
    }

    const senhaHash = (col as { senha_hash?: string | null }).senha_hash;
    if (!senhaHash || !verifyPassword(senhaAtual, senhaHash)) {
      return NextResponse.json({ ok: false, erro: 'Senha atual incorreta.' }, { status: 401 });
    }

    const hash = hashPassword(senhaNova);
    const { error: upErr } = await supabase
      .from('colaboradores')
      .update({
        senha_hash: hash,
        forca_troca_senha: false,
        updated_at: new Date().toISOString(),
      })
      .eq('cpf', cleanCpf);

    if (upErr) {
      return NextResponse.json({ ok: false, erro: 'Não foi possível salvar a nova senha.' }, { status: 500 });
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
