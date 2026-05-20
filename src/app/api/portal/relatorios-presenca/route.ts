import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { normalizePortalRole } from '@/lib/roles';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Lista colaboradores sem uso do portal há N dias (padrão 7). Sócio e admin. */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const role = cookieStore.get('portal_role')?.value ?? '';
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }
  if (!podeVerRelatoriosAvaliacoesCompletos(role)) {
    return NextResponse.json({ ok: false, erro: 'Sem permissão' }, { status: 403, headers: NO_STORE });
  }

  const { searchParams } = new URL(req.url);
  const diasParam = parseInt(searchParams.get('dias') ?? '7', 10);
  const diasLimite = Number.isFinite(diasParam) && diasParam >= 1 ? Math.min(diasParam, 90) : 7;
  const unidadeSlug = searchParams.get('unidade')?.trim() ?? '';

  try {
    const supabase = createAdminClient();

    let unidadeId: string | null = null;
    if (unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id').eq('slug', unidadeSlug).maybeSingle();
      unidadeId = u?.id ? String(u.id) : null;
    }

    let qCols = supabase
      .from('colaboradores')
      .select('id, nome, cargo, setor, role, unidade_id, onboarding_completo, unidades(nome, slug)')
      .eq('onboarding_completo', true)
      .in('role', ['colaborador', 'gerente', 'master', 'rh'])
      .order('nome', { ascending: true })
      .limit(2000);

    if (unidadeId) qCols = qCols.eq('unidade_id', unidadeId);

    const { data: cols, error: errCols } = await qCols;
    if (errCols) {
      return NextResponse.json({ ok: false, erro: errCols.message }, { status: 500, headers: NO_STORE });
    }

    const ids = (cols ?? []).map((c) => String(c.id));
    const presencaPorId: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: pres } = await supabase
        .from('portal_presenca')
        .select('colaborador_id, ultimo_ping_at')
        .in('colaborador_id', ids);
      for (const p of pres ?? []) {
        presencaPorId[String(p.colaborador_id)] = String(p.ultimo_ping_at ?? '');
      }
    }

    const linhas = (cols ?? []).map((c) => {
      const id = String(c.id);
      const ultimo = presencaPorId[id] ?? null;
      const dias = diasDesde(ultimo);
      const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
      return {
        id,
        nome: String(c.nome ?? ''),
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        setor: (c as { setor?: string | null }).setor ?? null,
        role: normalizePortalRole((c as { role?: string }).role),
        unidade_nome: unidade?.nome ? String(unidade.nome) : '',
        unidade_slug: unidade?.slug ? String(unidade.slug) : '',
        ultimo_acesso_at: ultimo,
        dias_sem_acesso: dias,
        sem_registro: !ultimo,
      };
    });

    const inativos = linhas.filter((l) => l.sem_registro || (l.dias_sem_acesso != null && l.dias_sem_acesso >= diasLimite));

    return NextResponse.json({
      ok: true,
      dias_limite: diasLimite,
      total_cadastros: linhas.length,
      total_inativos: inativos.length,
      inativos,
      todos: linhas,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
