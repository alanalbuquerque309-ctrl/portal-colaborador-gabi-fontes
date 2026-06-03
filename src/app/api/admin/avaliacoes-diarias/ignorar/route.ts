import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { podeVerDetalheNotasAvaliacaoAdmin } from '@/lib/admin-access';
import { requireAdminFullApi } from '@/lib/admin-auth';
import {
  sanitizeMotivoIgnorarAvaliacao,
  validarMotivoIgnorarAvaliacao,
} from '@/lib/avaliacao-ignorada';

const PORTAL_COLABORADOR = 'portal_colaborador_id';

/**
 * Marca uma avaliação semanal como ignorada (sócio / admin / sessão por senha).
 * Não apaga o registro; remove da média agregada.
 */
export async function POST(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

  const role = auth.ctx.kind === 'portal' ? auth.ctx.role : null;
  const senhaAdmin = auth.ctx.kind === 'password_session';
  if (!podeVerDetalheNotasAvaliacaoAdmin(role, senhaAdmin)) {
    return NextResponse.json({ ok: false, erro: 'Sem permissão para ignorar avaliações.' }, { status: 403 });
  }

  let body: { avaliacao_id?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const avaliacaoId = String(body.avaliacao_id ?? '').trim();
  const motivo = sanitizeMotivoIgnorarAvaliacao(body.motivo);
  const errMotivo = validarMotivoIgnorarAvaliacao(motivo);
  if (!avaliacaoId) {
    return NextResponse.json({ ok: false, erro: 'avaliacao_id obrigatório' }, { status: 400 });
  }
  if (errMotivo) {
    return NextResponse.json({ ok: false, erro: errMotivo }, { status: 400 });
  }

  const cookieStore = await cookies();
  const ignoradaPor =
    auth.ctx.kind === 'portal'
      ? String(cookieStore.get(PORTAL_COLABORADOR)?.value ?? '').trim() || null
      : null;

  try {
    const supabase = createAdminClient();
    const { data: existente, error: errGet } = await supabase
      .from('avaliacoes_diarias')
      .select('id, ignorada')
      .eq('id', avaliacaoId)
      .maybeSingle();

    if (errGet) {
      const msg = errGet.message.toLowerCase();
      if (msg.includes('ignorada') && msg.includes('does not exist')) {
        return NextResponse.json(
          {
            ok: false,
            erro: 'Banco sem coluna ignorada. Rode a migration 040 no Supabase (SQL Editor ou npm run db:apply-040).',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: errGet.message }, { status: 500 });
    }
    if (!existente?.id) {
      return NextResponse.json({ ok: false, erro: 'Avaliação não encontrada.' }, { status: 404 });
    }
    if ((existente as { ignorada?: boolean }).ignorada === true) {
      return NextResponse.json({ ok: false, erro: 'Esta avaliação já está ignorada.' }, { status: 409 });
    }

    const agora = new Date().toISOString();
    const { error: errUp } = await supabase
      .from('avaliacoes_diarias')
      .update({
        ignorada: true,
        ignorada_em: agora,
        ignorada_por: ignoradaPor,
        ignorada_motivo: motivo,
        updated_at: agora,
      })
      .eq('id', avaliacaoId);

    if (errUp) {
      return NextResponse.json({ ok: false, erro: errUp.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: avaliacaoId,
      ignorada_em: agora,
      ignorada_motivo: motivo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
