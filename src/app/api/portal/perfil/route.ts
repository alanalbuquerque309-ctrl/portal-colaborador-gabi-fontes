import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { podeAvaliarRhVisitaGeral } from '@/lib/avaliacao-rh-visita-access';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { PORTAL_COOKIE_SESSAO_LONGA } from '@/lib/portal-login-persist';
import { refreshPortalRoleCookie } from '@/lib/portal-session-cookies';
import { isPerfilPessoalCompleto } from '@/lib/perfil-completo';
import { normalizeEmail } from '@/lib/password';
import { normalizeTelefoneLogin, syncTelefoneLoginFromTelefone, telefoneLoginValido } from '@/lib/telefone';

function formatDateForInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
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
        'id, unidade_id, nome, email, telefone, endereco, cpf, data_nascimento, cargo, setor, foto_url, role, onboarding_completo, onboarding_video_visto, onboarding_quiz_video_ok, onboarding_manual_geral_lido_ok, onboarding_quiz_manual_geral_ok, onboarding_manual_escolhido_file, onboarding_manual_escolhido_concluido, unidades(nome)'
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
    const podeAvaliacaoEquipe = await podeUsarAvaliacaoEquipeSemanal(
      supabase,
      colaboradorId,
      roleNormalizado
    );

    const perfilCompleto = isPerfilPessoalCompleto({
      nome: data.nome as string | null | undefined,
      endereco: (data as { endereco?: string | null }).endereco,
      telefone: data.telefone as string | null | undefined,
      email: data.email as string | null | undefined,
      data_nascimento: (data as { data_nascimento?: string | null }).data_nascimento,
    });

    const response = NextResponse.json({
      ok: true,
      pode_visita_rh: podeVisitaRh,
      pode_avaliacao_equipe: podeAvaliacaoEquipe,
      colaborador: {
        id: colaboradorId,
        unidade_id: (data as { unidade_id?: string }).unidade_id ?? '',
        nome: data.nome ?? '',
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        endereco: (data as { endereco?: string | null }).endereco ?? null,
        data_nascimento: formatDateForInput((data as { data_nascimento?: string | null }).data_nascimento),
        perfil_completo: perfilCompleto,
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

/** Atualiza dados pessoais do perfil (nome, endereço, telefone, e-mail e data de nascimento). */
export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { nome?: string; endereco?: string; telefone?: string; email?: string; data_nascimento?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const nome = String(body.nome ?? '').trim();
  const endereco = String(body.endereco ?? '').trim();
  const telefoneRaw = String(body.telefone ?? '').trim();
  const email = normalizeEmail(String(body.email ?? ''));
  const dataNascimento = String(body.data_nascimento ?? '').trim();

  if (!nome || !endereco || !telefoneRaw || !email || !dataNascimento) {
    return NextResponse.json(
      {
        ok: false,
        erro: 'Nome, endereço, telefone, e-mail e data de nascimento são obrigatórios.',
      },
      { status: 400 }
    );
  }

  if (!email.includes('@')) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    return NextResponse.json({ ok: false, erro: 'Informe uma data de nascimento válida.' }, { status: 400 });
  }

  const telefoneLogin = syncTelefoneLoginFromTelefone(telefoneRaw);
  if (!telefoneLogin || !telefoneLoginValido(telefoneLogin)) {
    return NextResponse.json(
      { ok: false, erro: 'Celular inválido. Use DDD + número (10 ou 11 dígitos).' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: dupEmail } = await supabase
      .from('colaboradores')
      .select('id')
      .ilike('email', email)
      .neq('id', colaboradorId)
      .limit(1)
      .maybeSingle();
    if (dupEmail?.id) {
      return NextResponse.json(
        { ok: false, erro: 'Este e-mail já está em uso por outro colaborador.' },
        { status: 409 }
      );
    }

    const { data: candidatosTel } = await supabase
      .from('colaboradores')
      .select('id, telefone, telefone_login')
      .neq('id', colaboradorId)
      .or('telefone.not.is.null,telefone_login.not.is.null')
      .limit(500);

    const conflitoTel = (candidatosTel ?? []).some((c) => {
      const tl = String((c as { telefone_login?: string | null }).telefone_login ?? '');
      const t = normalizeTelefoneLogin(String((c as { telefone?: string | null }).telefone ?? ''));
      return tl === telefoneLogin || t === telefoneLogin;
    });
    if (conflitoTel) {
      return NextResponse.json(
        { ok: false, erro: 'Este telefone já está em uso por outro colaborador.' },
        { status: 409 }
      );
    }

    const payload: Record<string, unknown> = {
      nome,
      endereco,
      telefone: telefoneRaw,
      telefone_login: telefoneLogin,
      email,
      data_nascimento: dataNascimento,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('colaboradores').update(payload).eq('id', colaboradorId);

    if (error && String(error.message).toLowerCase().includes('telefone_login')) {
      const { telefone_login: _omit, ...semLogin } = payload;
      const retry = await supabase.from('colaboradores').update(semLogin).eq('id', colaboradorId);
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      perfil_completo: true,
      login_telefone: telefoneLogin,
      login_email: email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
