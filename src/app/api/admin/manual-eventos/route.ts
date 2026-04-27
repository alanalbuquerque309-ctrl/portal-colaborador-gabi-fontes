import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

function descricaoEvento(tipo: string): string {
  if (tipo === 'printscreen') return 'PrintScreen';
  if (tipo === 'atalho_impressao') return 'Atalho de impressão (Ctrl/Cmd + P)';
  if (tipo === 'beforeprint') return 'Abertura do diálogo de impressão';
  return tipo;
}

export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get('limit') || 100);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.trunc(limitRaw))) : 100;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('manual_eventos')
      .select('id, colaborador_id, tipo, manual_path, ip, user_agent, created_at, colaboradores(nome, telefone)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const eventos = (data ?? []).map((row: Record<string, unknown>) => {
      const colaborador = row.colaboradores as { nome?: string | null; telefone?: string | null } | null;
      return {
        id: row.id,
        colaborador_id: row.colaborador_id,
        colaborador_nome: colaborador?.nome ?? 'Colaborador',
        colaborador_telefone: colaborador?.telefone ?? null,
        tipo: row.tipo,
        tipo_label: descricaoEvento(String(row.tipo ?? '')),
        manual_path: row.manual_path,
        ip: row.ip,
        user_agent: row.user_agent,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ ok: true, eventos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
