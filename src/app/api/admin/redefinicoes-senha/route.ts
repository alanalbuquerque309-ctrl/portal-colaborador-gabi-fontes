import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } as const;

type SolicitacaoRow = {
  id: string;
  colaborador_id: string | null;
  unidade_id: string | null;
  nome_snapshot: string | null;
  telefone_informado: string | null;
  email_informado: string | null;
  status: string;
  criado_em: string;
};

/** Lista solicitações de redefinição de senha. Admin, RH ou sócios. */
export async function GET(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pendente';

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('solicitacoes_redefinicao_senha')
      .select('id, colaborador_id, unidade_id, nome_snapshot, telefone_informado, email_informado, status, criado_em')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (status !== 'todas') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      // Tabela ausente (migration 050 não aplicada): trata como lista vazia, não como erro fatal.
      const msg = String(error.message ?? '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json({ ok: true, solicitacoes: [], total: 0, migration_pendente: true }, { headers: NO_STORE });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
    }

    const rows = (data ?? []) as SolicitacaoRow[];
    const unidadeIds = Array.from(
      new Set(rows.map((r) => r.unidade_id).filter((id): id is string => typeof id === 'string' && id.length > 0))
    );
    let unidadePorId: Record<string, string> = {};
    if (unidadeIds.length > 0) {
      const { data: unRows } = await supabase.from('unidades').select('id, nome').in('id', unidadeIds);
      unidadePorId = Object.fromEntries((unRows ?? []).map((u) => [u.id as string, String(u.nome ?? '')]));
    }

    const solicitacoes = rows.map((r) => ({
      id: r.id,
      colaborador_id: r.colaborador_id,
      nome: r.nome_snapshot ?? '—',
      telefone: r.telefone_informado,
      email: r.email_informado,
      unidade: r.unidade_id ? unidadePorId[r.unidade_id] ?? '—' : '—',
      status: r.status,
      criado_em: r.criado_em,
    }));

    return NextResponse.json(
      { ok: true, solicitacoes, total: solicitacoes.length },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
