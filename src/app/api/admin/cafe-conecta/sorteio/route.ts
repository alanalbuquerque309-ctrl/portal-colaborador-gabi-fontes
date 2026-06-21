import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { grupoCafeConectaPorSlug, grupoPermiteSorteioCafeConecta, gruposCafeConectaAtivos } from '@/lib/cafe-conecta/config';
import { montarDashboardCafeConecta, realizarSorteioCafeConecta } from '@/lib/cafe-conecta/service';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  let body: { grupo?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const grupoParam = String(body.grupo ?? '').trim();
  const ativos = gruposCafeConectaAtivos();
  const grupo = grupoCafeConectaPorSlug(grupoParam) ?? ativos[0] ?? null;
  if (!grupo?.ativo || !grupoPermiteSorteioCafeConecta(grupo)) {
    return NextResponse.json(
      { ok: false, erro: 'Sorteio ainda não liberado para esta unidade.' },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const resultado = await realizarSorteioCafeConecta(supabase, grupo);
    if (!resultado.ok) {
      return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 400, headers: NO_STORE });
    }
    const dash = await montarDashboardCafeConecta(supabase, grupo);
    return NextResponse.json(
      { ok: true, sorteio: resultado.sorteio, dashboard: dash.ok ? dash : null },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    if (/cafe_conecta/i.test(msg)) {
      return NextResponse.json(
        { ok: false, erro: 'Tabelas Café Conecta ausentes. Aplique a migration 052 no Supabase.' },
        { status: 503, headers: NO_STORE }
      );
    }
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
