import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { grupoCafeConectaPorSlug, gruposCafeConectaAtivos } from '@/lib/cafe-conecta/config';
import { montarDashboardCafeConecta } from '@/lib/cafe-conecta/service';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const grupoParam = searchParams.get('grupo')?.trim() ?? '';
  const ativos = gruposCafeConectaAtivos();
  const grupo = grupoCafeConectaPorSlug(grupoParam) ?? ativos[0] ?? null;

  if (!grupo || !grupo.ativo) {
    return NextResponse.json(
      { ok: false, erro: 'Nenhum grupo Café Conecta ativo.' },
      { status: 404, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const payload = await montarDashboardCafeConecta(supabase, grupo);
    if (!payload.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: payload.code,
          erro: 'Execute a migration 052 no Supabase (Café Conecta).',
          grupos_disponiveis: ativos.map((g) => ({ slug: g.slug, label: g.label })),
        },
        { status: 503, headers: NO_STORE }
      );
    }
    return NextResponse.json(
      { ...payload, grupos_disponiveis: ativos.map((g) => ({ slug: g.slug, label: g.label })) },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
