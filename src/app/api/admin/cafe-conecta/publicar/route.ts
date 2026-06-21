import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { grupoCafeConectaPorSlug, gruposCafeConectaAtivos } from '@/lib/cafe-conecta/config';
import { montarDashboardCafeConecta, publicarSorteioCafeConecta } from '@/lib/cafe-conecta/service';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const cookieStore = await cookies();
  const publicadoPor = cookieStore.get('portal_colaborador_id')?.value ?? '';

  let body: { grupo?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const grupoParam = String(body.grupo ?? '').trim();
  const ativos = gruposCafeConectaAtivos();
  const grupo = grupoCafeConectaPorSlug(grupoParam) ?? ativos[0] ?? null;
  if (!grupo?.ativo) {
    return NextResponse.json({ ok: false, erro: 'Grupo inválido.' }, { status: 400, headers: NO_STORE });
  }

  if (!publicadoPor || publicadoPor === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Sessão inválida.' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const pub = await publicarSorteioCafeConecta(supabase, grupo, publicadoPor);
    if (!pub.ok) {
      return NextResponse.json({ ok: false, erro: pub.erro }, { status: 400, headers: NO_STORE });
    }
    const dash = await montarDashboardCafeConecta(supabase, grupo);
    return NextResponse.json({ ok: true, dashboard: dash.ok ? dash : null }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
