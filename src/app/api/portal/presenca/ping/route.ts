import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalSessionFromCookies } from '@/lib/portal-session-server';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function tabelaPresencaInexistente(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('portal_presenca') && (m.includes('does not exist') || m.includes('schema cache'));
}

/** Registra que o colaborador tem o portal aberto (heartbeat). */
export async function POST() {
  const sess = await getPortalSessionFromCookies();
  if (!sess) {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('portal_presenca').upsert(
      { colaborador_id: sess.colaboradorId, ultimo_ping_at: new Date().toISOString() },
      { onConflict: 'colaborador_id' }
    );

    if (error) {
      if (tabelaPresencaInexistente(error.message)) {
        return NextResponse.json(
          { ok: false, code: 'presenca_missing_table', erro: 'Tabela de presença não criada. Rode a migração 031 no Supabase.' },
          { status: 503, headers: NO_STORE }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
