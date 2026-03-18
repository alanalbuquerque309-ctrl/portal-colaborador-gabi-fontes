import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Teste rápido: Supabase conecta? Tabelas existem? (público, temporário) */
export async function GET() {
  const ok = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!ok) {
    return NextResponse.json({ ok: false, erro: 'Env vars ausentes' }, { status: 500 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('unidades').select('id, slug').limit(1);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message, codigo: error.code }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      unidades_count: data?.length ?? 0,
      primeiro: data?.[0]?.slug ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
