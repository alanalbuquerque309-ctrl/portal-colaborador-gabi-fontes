import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { podeAvaliarRhVisitaGeral } from '@/lib/avaliacao-rh-visita-access';
import { PORTAL_COOKIE_SESSAO_LONGA } from '@/lib/portal-login-persist';
import { refreshPortalRoleCookie } from '@/lib/portal-session-cookies';

function isPerfilCompleto(row: {
  nome?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
}): boolean {
  return Boolean(
    String(row.nome ?? '').trim() &&
      String(row.endereco ?? '').trim() &&
      String(row.telefone ?? '').trim() &&
      String(row.email ?? '').trim()
  );
}

/** Retorna dados do perfil do colaborador logado. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select(
        'id, unidade_id, nome, email, telefone, endereco, cpf, cargo, setor, foto_url, role, onboarding_completo, onboarding_video_visto, onboarding_quiz_video_ok, onboarding_manual_geral_lido_ok, onboarding_quiz_manual_geral_ok, onboarding_manual_escolhido_file, onboarding_manual_escolhido_concluido, unidades(nome)'
      )
      .eq('id', colaboradorId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const unidade = Array.isArray(data.unidades) ? data.unidades[0] : data.unidades;
    const unidadeNome = unidade && typeof unidade === 'object' && 'nome' in unidade ? unidade.nome : undefined;
    const cpfRaw = (data as { cpf?: string | null }).cpf;
    const cpfCadastrado = !!(cpfRaw && String(cpfRaw).trim());
    const roleNormalizado = normalizePortalRole((data as { role?: string }).role ?? null);
    const setorCol = (data as { setor?: string | null }).setor ?? null;
    const podeVisitaRh = podeAvaliarRhVisitaGeral({
      colaboradorId,
      role: roleNormalizado,
      setor: setorCol,
      nome: data.nome as string,
    });

    const response = NextResponse.json({
      ok: true,
      pode_visita_rh: podeVisitaRh,
      colaborador: {
        id: colaboradorId,
        unidade_id: (data as { unidade_id?: string }).unidade_id ?? '',
        nome: data.nome ?? '',
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        endereco: (data as { endereco?: string | null }).endereco ?? null,
        perfil_completo: isPerfilCompleto({
          nome: data.nome as string | null | undefined,
          endereco: (data as { endereco?: string | null }).endereco,
          telefone: data.telefone as string | null | undefined,
          email: data.email as string | null | undefined,
        }),
        cpf_cadastrado: cpfCadastrado,
        cargo: data.cargo ?? null,
        setor: (data as { setor?: string | null }).setor ?? null,
        foto_url: data.foto_url ?? null,
        role: roleNormalizado,
        unidades: unidadeNome != null ? { nome: unidadeNome } : undefined,
        onboarding_completo: !!(data as { onboarding_completo?: boolean }).onboarding_completo,
        onboarding_video_visto: !!(data as { onboarding_video_visto?: boolean }).onboarding_video_visto,
        onboarding_quiz_video_ok: !!(data as { onboarding_quiz_video_ok?: boolean }).onboarding_quiz_video_ok,
        onboarding_manual_geral_lido_ok: !!(data as { onboarding_manual_geral_lido_ok?: boolean })
          .onboarding_manual_geral_lido_ok,
        onboarding_quiz_manual_geral_ok: !!(data as { onboarding_quiz_manual_geral_ok?: boolean })
          .onboarding_quiz_manual_geral_ok,
        onboarding_manual_escolhido_file:
          (data as { onboarding_manual_escolhido_file?: string | null }).onboarding_manual_escolhido_file ?? null,
        onboarding_manual_escolhido_concluido: !!(data as { onboarding_manual_escolhido_concluido?: boolean })
          .onboarding_manual_escolhido_concluido,
      },
    });
    const sessaoLonga = cookieStore.get(PORTAL_COOKIE_SESSAO_LONGA)?.value === '1';
    refreshPortalRoleCookie(response, roleNormalizado, sessaoLonga);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Atualiza dados básicos do perfil (nome, endereço, telefone e e-mail). */
export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { nome?: string; endereco?: string; telefone?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const nome = String(body.nome ?? '').trim();
  const endereco = String(body.endereco ?? '').trim();
  const telefone = String(body.telefone ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!nome || !endereco || !telefone || !email) {
    return NextResponse.json(
      { ok: false, erro: 'Nome, endereço, telefone e e-mail são obrigatórios.' },
      { status: 400 }
    );
  }

  if (!email.includes('@')) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('colaboradores')
      .update({
        nome,
        endereco,
        telefone,
        email,
      })
      .eq('id', colaboradorId);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
