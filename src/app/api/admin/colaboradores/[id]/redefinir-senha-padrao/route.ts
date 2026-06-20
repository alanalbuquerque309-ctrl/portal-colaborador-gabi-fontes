import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/password';
import { SENHA_PADRAO_INICIAL } from '@/lib/senha-portal';

/**
 * Admin, RH ou sócios redefinem a senha do colaborador para a padrão (123456) e exigem troca no próximo login.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: existe, error: findErr } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !existe) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const hash = hashPassword(SENHA_PADRAO_INICIAL);
    const updatedAt = new Date().toISOString();

    const first = await supabase
      .from('colaboradores')
      .update({
        senha_hash: hash,
        forca_troca_senha: true,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (first.error) {
      const msg = String(first.error.message ?? '').toLowerCase();
      if (msg.includes('forca_troca_senha') || msg.includes('column')) {
        const retry = await supabase
          .from('colaboradores')
          .update({ senha_hash: hash, updated_at: updatedAt })
          .eq('id', id)
          .select('id')
          .single();
        if (retry.error) {
          return NextResponse.json({ ok: false, erro: retry.error.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ ok: false, erro: first.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      mensagem: 'Senha redefinida para o padrão. No próximo acesso o colaborador deve trocar a senha.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
