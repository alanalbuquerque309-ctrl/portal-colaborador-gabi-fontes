import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword, normalizeEmail } from '@/lib/password';

const MIN_LEN = 6;

/**
 * Redefine senha após validar CPF + e-mail cadastrados.
 * Não exibe senha antiga (armazenamento é apenas hash).
 */
export async function POST(req: Request) {
  let body: { cpf?: string; email?: string; novaSenha?: string; novaSenhaConfirmacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const cleanCpf = String(body.cpf ?? '')
    .replace(/\D/g, '')
    .trim()
    .padStart(11, '0');
  const emailIn = normalizeEmail(String(body.email ?? ''));
  const nova = String(body.novaSenha ?? '').trim();
  const nova2 = String(body.novaSenhaConfirmacao ?? '').trim();

  if (cleanCpf.length !== 11) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido' }, { status: 400 });
  }
  if (!emailIn || !emailIn.includes('@')) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 });
  }
  if (nova.length < MIN_LEN) {
    return NextResponse.json(
      { ok: false, erro: `A nova senha deve ter pelo menos ${MIN_LEN} caracteres.` },
      { status: 400 }
    );
  }
  if (nova !== nova2) {
    return NextResponse.json({ ok: false, erro: 'As senhas não coincidem.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, email')
      .eq('cpf', cleanCpf)
      .single();

    if (error || !col) {
      return NextResponse.json(
        { ok: false, erro: 'Não encontramos esse CPF ou o e-mail não confere.' },
        { status: 404 }
      );
    }

    const emailCad = (col as { email?: string | null }).email;
    if (!emailCad || normalizeEmail(emailCad) !== emailIn) {
      return NextResponse.json(
        { ok: false, erro: 'Não encontramos esse CPF ou o e-mail não confere.' },
        { status: 404 }
      );
    }

    const hash = hashPassword(nova);
    const { error: upErr } = await supabase
      .from('colaboradores')
      .update({ senha_hash: hash, updated_at: new Date().toISOString() })
      .eq('cpf', cleanCpf);

    if (upErr) {
      return NextResponse.json({ ok: false, erro: 'Não foi possível atualizar a senha.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensagem: 'Senha redefinida. Faça login com a nova senha.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
