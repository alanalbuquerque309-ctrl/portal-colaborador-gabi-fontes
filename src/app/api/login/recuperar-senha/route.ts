import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword, normalizeEmail } from '@/lib/password';
import { normalizeTelefoneLogin, telefoneLoginValido } from '@/lib/telefone';

const SENHA_PADRAO = '123456';

type ColaboradorRecuperacao = {
  id: string;
  email: string | null;
  telefone: string | null;
  telefone_login?: string | null;
};

function isMissingTelefoneLoginColumn(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return msg.includes('telefone_login') && (msg.includes('does not exist') || msg.includes('schema cache'));
}

/**
 * Redefine senha após validar telefone + e-mail cadastrados.
 * Volta para a senha padrão e força troca no próximo login.
 */
export async function POST(req: Request) {
  let body: { telefone?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const telefoneLogin = normalizeTelefoneLogin(String(body.telefone ?? ''));
  const emailIn = normalizeEmail(String(body.email ?? ''));

  if (!telefoneLoginValido(telefoneLogin)) {
    return NextResponse.json(
      { ok: false, erro: 'Informe um celular válido com DDD (10 ou 11 dígitos).' },
      { status: 400 }
    );
  }
  if (!emailIn || !emailIn.includes('@')) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    let { data: candidatos, error } = await supabase
      .from('colaboradores')
      .select('id, email, telefone, telefone_login')
      .ilike('email', emailIn)
      .limit(10);

    if (error && isMissingTelefoneLoginColumn(error.message)) {
      const retry = await supabase
        .from('colaboradores')
        .select('id, email, telefone')
        .ilike('email', emailIn)
        .limit(10);
      candidatos = retry.data as typeof candidatos;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json(
        { ok: false, erro: 'Não encontramos esse telefone ou o e-mail não confere.' },
        { status: 404 }
      );
    }

    const col = ((candidatos ?? []) as ColaboradorRecuperacao[]).find((c) => {
      const emailCad = normalizeEmail(c.email ?? '');
      const telefoneCadastro = normalizeTelefoneLogin(c.telefone ?? '');
      const telefoneLoginCadastro = normalizeTelefoneLogin(c.telefone_login ?? '');
      return (
        emailCad === emailIn &&
        (telefoneCadastro === telefoneLogin || telefoneLoginCadastro === telefoneLogin)
      );
    });

    if (!col) {
      return NextResponse.json(
        { ok: false, erro: 'Não encontramos esse telefone ou o e-mail não confere.' },
        { status: 404 }
      );
    }

    const hash = hashPassword(SENHA_PADRAO);
    const { error: upErr } = await supabase
      .from('colaboradores')
      .update({ senha_hash: hash, forca_troca_senha: true, updated_at: new Date().toISOString() })
      .eq('id', col.id);

    if (upErr) {
      const msg = String(upErr.message ?? '').toLowerCase();
      if (msg.includes('forca_troca_senha') || msg.includes('column')) {
        const retry = await supabase
          .from('colaboradores')
          .update({ senha_hash: hash, updated_at: new Date().toISOString() })
          .eq('id', col.id);
        if (retry.error) {
          return NextResponse.json({ ok: false, erro: 'Não foi possível atualizar a senha.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ ok: false, erro: 'Não foi possível atualizar a senha.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      mensagem: 'Senha redefinida para 123456. Faça login e cadastre uma nova senha.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
