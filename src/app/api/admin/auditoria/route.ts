import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerAuditoria } from '@/lib/admin-access';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } as const;

type AuditRow = {
  id: string;
  criado_em: string;
  ator_colaborador_id: string | null;
  ator_tipo: string;
  acao: string;
  alvo_tipo: string | null;
  alvo_id: string | null;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
};

/**
 * Lista a trilha de auditoria (somente leitura). Sócios, admin ou login por senha.
 * Enriquece os nomes em tempo de leitura — a tabela em si não guarda PII.
 */
export async function GET(req: Request) {
  const ctx = await getAdminViewerContext();
  const senha = ctx?.kind === 'password_session';
  const role = ctx?.kind === 'portal' ? ctx.role : null;
  if (!ctx || !podeVerAuditoria(role, senha)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403, headers: NO_STORE });
  }

  const url = new URL(req.url);
  const acaoFiltro = url.searchParams.get('acao');
  const limite = Math.min(500, Math.max(1, Number(url.searchParams.get('limite') ?? 100) || 100));

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('audit_log')
      .select('id, criado_em, ator_colaborador_id, ator_tipo, acao, alvo_tipo, alvo_id, detalhes, ip')
      .order('criado_em', { ascending: false })
      .limit(limite);
    if (acaoFiltro) query = query.eq('acao', acaoFiltro);

    const { data, error } = await query;
    if (error) {
      const msg = String(error.message ?? '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json(
          { ok: true, eventos: [], total: 0, migration_pendente: true },
          { headers: NO_STORE }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
    }

    const rows = (data ?? []) as AuditRow[];

    // Resolve nomes (ator + alvos do tipo colaborador) em tempo de leitura.
    const ids = new Set<string>();
    rows.forEach((r) => {
      if (r.ator_colaborador_id) ids.add(r.ator_colaborador_id);
      if (r.alvo_tipo === 'colaborador' && r.alvo_id) ids.add(r.alvo_id);
    });
    let nomePorId: Record<string, string> = {};
    if (ids.size > 0) {
      const { data: cols } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .in('id', Array.from(ids));
      nomePorId = Object.fromEntries((cols ?? []).map((c) => [c.id as string, String(c.nome ?? '')]));
    }

    const eventos = rows.map((r) => ({
      id: r.id,
      criado_em: r.criado_em,
      acao: r.acao,
      ator_tipo: r.ator_tipo,
      ator_nome: r.ator_colaborador_id ? nomePorId[r.ator_colaborador_id] ?? '(removido)' : null,
      alvo_tipo: r.alvo_tipo,
      alvo_nome:
        r.alvo_tipo === 'colaborador' && r.alvo_id ? nomePorId[r.alvo_id] ?? '(removido)' : r.alvo_id,
      detalhes: r.detalhes,
      ip: r.ip,
    }));

    return NextResponse.json({ ok: true, eventos, total: eventos.length }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
