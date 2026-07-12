import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

import {
  ADMIN_NAV_RH,
  labelNivelAdmin,
  podeEditarCadastroColaborador,
  podeEditarCpfColaboradorAdmin,
  podeEditarEscalasAdmin,
  podeEditarLiderancaMapaCompleto,
  podeVerAvisoAdmissaoPendente,
  podeVerAuditoria,
  podeVerDetalheNotasAvaliacaoAdmin,
  podeVerRotatividade,
} from '@/lib/admin-access';

import { podeVerHistoricoChecklistsRede } from '@/lib/checklists/access';

import { resolveColaboradorForAdminBridge } from '@/lib/admin-portal-bridge';

import { parseManterLogado } from '@/lib/portal-login-persist';

import { applyAdminSessionCookie, applyPortalSessionCookies } from '@/lib/portal-session-cookies';

import { AUDIT_ACOES, registrarAuditoria } from '@/lib/audit-log';



function getAdminCredentials(): { login: string; senha: string }[] {

  const creds: { login: string; senha: string }[] = [];

  const login = process.env.ADMIN_ALAN_LOGIN?.trim().toLowerCase();

  const senha = process.env.ADMIN_ALAN_PASSWORD;

  if (login && senha) creds.push({ login, senha });

  return creds;

}



export async function POST(req: Request) {

  const body = await req.json();

  const login = (body.login ?? '').toString().trim().toLowerCase();

  const senha = (body.senha ?? body.password ?? '').toString();



  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  const credentials = getAdminCredentials();



  const credMatch = senha

    ? credentials.find((c) => c.login === login && c.senha === senha)

    : undefined;

  const legacyMatch = !login && !!adminPassword && senha === adminPassword;



  if (credMatch || legacyMatch) {

    const res = NextResponse.json({ ok: true });

    const persistent = parseManterLogado(body);

    applyAdminSessionCookie(res, { persistent });



    const loginBridge = credMatch?.login ?? login ?? process.env.ADMIN_ALAN_LOGIN?.trim() ?? '';

    try {

      const supabase = createAdminClient();

      const col = await resolveColaboradorForAdminBridge(supabase, loginBridge || null);

      if (col) {

        applyPortalSessionCookies(res, col, { persistent });

      }

      await registrarAuditoria(supabase, {

        acao: AUDIT_ACOES.LOGIN_ADMIN_SENHA,

        ator: { atorColaboradorId: (col as { id?: string } | null)?.id ?? null, atorTipo: 'senha_admin' },

        detalhes: { login: loginBridge || null },

        req,

      });

    } catch {

      /* bridge opcional */

    }



    return res;

  }

  return NextResponse.json({ ok: false }, { status: 401 });

}



export async function GET() {

  const { isAdminAuthorized, getAdminViewerContext, canViewReclamacoesAdmin } = await import(

    '@/lib/admin-auth'

  );

  const { podeVerBonificacaoInterna } = await import('@/lib/bonificacao-access');
  const { podeGerirSugestoesReclamacoes } = await import('@/lib/sugestoes-acesso');



  const ok = await isAdminAuthorized();

  if (!ok) return NextResponse.json({ ok: false });



  const ctx = await getAdminViewerContext();

  const role = ctx?.kind === 'portal' ? ctx.role : null;

  const nivel = ctx?.nivel ?? null;

  const senhaAdmin = ctx?.kind === 'password_session';



  const podeGorjeta =

    ctx?.kind === 'password_session' || (role != null && podeVerBonificacaoInterna(role));

  const podeGerirSugestoes =

    ctx?.kind === 'password_session' || (role != null && podeGerirSugestoesReclamacoes(role));



  return NextResponse.json({

    ok: true,

    nivel,

    nivel_label: labelNivelAdmin(nivel),

    acesso_limitado_rh: nivel === 'rh_limitado',

    menu_rh: [...ADMIN_NAV_RH],

    pode_editar_lideranca_mapa: podeEditarLiderancaMapaCompleto(role, senhaAdmin),

    pode_editar_escalas: podeEditarEscalasAdmin(role, senhaAdmin),

    pode_ver_detalhe_notas_avaliacao: podeVerDetalheNotasAvaliacaoAdmin(role, senhaAdmin),

    pode_editar_cadastro: podeEditarCadastroColaborador(role, senhaAdmin),

    pode_editar_cpf: podeEditarCpfColaboradorAdmin(role, senhaAdmin),

    pode_ver_aviso_admissao: podeVerAvisoAdmissaoPendente(role, senhaAdmin),

    pode_ver_rotatividade: podeVerRotatividade(role, senhaAdmin),

    podeVerReclamacoes: canViewReclamacoesAdmin(ctx),

    podeGerirSugestoes,

    podeVerGorjeta: podeGorjeta,

    podeVerBonificacao: podeGorjeta,

    podeVerAuditoria: podeVerAuditoria(role, senhaAdmin),

    podeVerChecklistsRede:
      senhaAdmin || (role != null && podeVerHistoricoChecklistsRede(role)),

  });

}


