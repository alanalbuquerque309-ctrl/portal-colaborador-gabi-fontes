import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/password';
import { SENHA_PADRAO_INICIAL } from '@/lib/senha-portal';

const PORTAL_COLABORADOR = 'portal_colaborador_id';

async function atendidoPorId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const id = cookieStore.get(PORTAL_COLABORADOR)?.value;
    return id && id !== 'pending' ? id : null;
  } catch {
    return null;
  }
}

/**
 * Atende (redefine para a senha padrão com troca forçada) ou rejeita uma solicitação de
 * redefinição de senha. Admin, RH ou sócios.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  let body: { acao?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const acao = body.acao === 'rejeitar' ? 'rejeitar' : 'atender';

  try {
    const supabase = createAdminClient();
    const { data: sol, error: findErr } = await supabase
      .from('solicitacoes_redefinicao_senha')
      .select('id, colaborador_id, status')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !sol) {
      return NextResponse.json({ ok: false, erro: 'Solicitação não encontrada' }, { status: 404 });
    }
    if (sol.status !== 'pendente') {
      return NextResponse.json({ ok: false, erro: 'Solicitação já foi tratada.' }, { status: 409 });
    }

    const atendidoPor = await atendidoPorId();
    const agora = new Date().toISOString();

    if (acao === 'rejeitar') {
      const { error: upErr } = await supabase
        .from('solicitacoes_redefinicao_senha')
        .update({ status: 'rejeitada', atendido_em: agora, atendido_por: atendidoPor })
        .eq('id', id);
      if (upErr) return NextResponse.json({ ok: false, erro: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, mensagem: 'Solicitação descartada.' });
    }

    // Atender: redefine a senha do colaborador para a padrão e força troca no próximo acesso.
    const colaboradorId = sol.colaborador_id as string | null;
    if (!colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Solicitação sem colaborador vinculado.' }, { status: 400 });
    }

    const hash = hashPassword(SENHA_PADRAO_INICIAL);
    const first = await supabase
      .from('colaboradores')
      .update({ senha_hash: hash, forca_troca_senha: true, updated_at: agora })
      .eq('id', colaboradorId)
      .select('id')
      .single();

    if (first.error) {
      const msg = String(first.error.message ?? '').toLowerCase();
      if (msg.includes('forca_troca_senha') || msg.includes('column')) {
        const retry = await supabase
          .from('colaboradores')
          .update({ senha_hash: hash, updated_at: agora })
          .eq('id', colaboradorId)
          .select('id')
          .single();
        if (retry.error) {
          return NextResponse.json({ ok: false, erro: retry.error.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ ok: false, erro: first.error.message }, { status: 500 });
      }
    }

    const { error: upErr } = await supabase
      .from('solicitacoes_redefinicao_senha')
      .update({ status: 'atendida', atendido_em: agora, atendido_por: atendidoPor })
      .eq('id', id);
    if (upErr) {
      // Senha já foi redefinida; reportar mesmo assim para o admin reenviar a baixa se quiser.
      return NextResponse.json(
        { ok: false, erro: `Senha redefinida, mas falhou ao baixar a solicitação: ${upErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensagem: `Senha redefinida para ${SENHA_PADRAO_INICIAL}. O colaborador deve trocar no próximo acesso.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
