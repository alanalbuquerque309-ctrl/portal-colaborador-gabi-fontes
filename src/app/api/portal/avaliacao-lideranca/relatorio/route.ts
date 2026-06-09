import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { listarAvaliacoesLiderancaRelatorio } from '@/lib/avaliacoes-lideranca-relatorio';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { normalizePortalRole } from '@/lib/roles';

type RelatorioQuery = {
  unidadeSlug: string | null;
  inicio: string | null;
  fim: string | null;
  limite: number;
};

function parseRelatorioQuery(searchParams: URLSearchParams): RelatorioQuery {
  return {
    unidadeSlug: searchParams.get('unidade_slug')?.trim() || null,
    inicio: searchParams.get('inicio')?.trim() || null,
    fim: searchParams.get('fim')?.trim() || null,
    limite: Number(searchParams.get('limite')) || 2000,
  };
}

async function responderRelatorioLideranca(query: RelatorioQuery) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const cookieRole = cookieStore.get('portal_role')?.value ?? null;
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('role, nome, cpf')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    const viewerNome = String((eu as { nome?: string }).nome ?? '');
    const viewerCpf = String((eu as { cpf?: string | null }).cpf ?? '');
    if (!podeVerRelatoriosAvaliacoesCompletos(role)) {
      return NextResponse.json(
        {
          ok: false,
          erro: 'Sem permissão. Sócio, administrativo, master ou gerente podem consultar este relatório.',
        },
        { status: 403 }
      );
    }

    const { itens, nota, auditoria_socio, viewer_role, erro } = await listarAvaliacoesLiderancaRelatorio(
      supabase,
      {
        viewerColaboradorId: colaboradorId,
        viewerRole: role,
        viewerNome,
        viewerCpf,
        viewerRoleCookie: cookieRole,
        unidadeSlug: query.unidadeSlug,
        inicio: query.inicio,
        fim: query.fim,
        limite: query.limite,
      }
    );

    if (erro) {
      const status = erro === 'Unidade não encontrada' ? 400 : 500;
      return NextResponse.json({ ok: false, erro }, { status });
    }

    return NextResponse.json(
      {
        ok: true,
        nota,
        auditoria_socio,
        viewer_role,
        viewer_nome: viewerNome,
        viewer_cpf_mascara: viewerCpf ? `***${viewerCpf.slice(-4)}` : '',
        itens,
        total: itens.length,
        api: 'relatorio-lideranca-v2-post',
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
          Pragma: 'no-cache',
          Vary: 'Cookie',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** GET legado — preferir POST no cliente (evita cache do PWA). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return responderRelatorioLideranca(parseRelatorioQuery(searchParams));
}

/** POST — relatório de liderança (não cacheado pelo service worker). */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const q = new URLSearchParams();
  if (body.unidade_slug) q.set('unidade_slug', String(body.unidade_slug));
  if (body.inicio) q.set('inicio', String(body.inicio));
  if (body.fim) q.set('fim', String(body.fim));
  if (body.limite) q.set('limite', String(body.limite));
  return responderRelatorioLideranca(parseRelatorioQuery(q));
}
