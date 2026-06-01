import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

import { ADMIN_NAV_RH, labelNivelAdmin, podeEditarLiderancaMapaCompleto } from '@/lib/admin-access';

import { resolveColaboradorForAdminBridge } from '@/lib/admin-portal-bridge';

import { parseManterLogado } from '@/lib/portal-login-persist';

import { applyAdminSessionCookie, applyPortalSessionCookies } from '@/lib/portal-session-cookies';



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



  const ok = await isAdminAuthorized();

  if (!ok) return NextResponse.json({ ok: false });



  const ctx = await getAdminViewerContext();

  const role = ctx?.kind === 'portal' ? ctx.role : null;

  const nivel = ctx?.nivel ?? null;

  const senhaAdmin = ctx?.kind === 'password_session';



  const podeGorjeta =

    ctx?.kind === 'password_session' || (role != null && podeVerBonificacaoInterna(role));



  return NextResponse.json({

    ok: true,

    nivel,

    nivel_label: labelNivelAdmin(nivel),

    acesso_limitado_rh: nivel === 'rh_limitado',

    menu_rh: [...ADMIN_NAV_RH],

    pode_editar_lideranca_mapa: podeEditarLiderancaMapaCompleto(role, senhaAdmin),

    podeVerReclamacoes: canViewReclamacoesAdmin(ctx),

    podeVerGorjeta: podeGorjeta,

    podeVerBonificacao: podeGorjeta,

  });

}


