import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  erroColunaAutorAviso,
  nomeAutorAvisoExibicao,
  resolverAutorPublicacaoAviso,
} from '@/lib/avisos-autor';
import {
  isPublicoAvisoKey,
  labelPublicoAviso,
  publicoLegacyFromUnidadeSlug,
  resolverPublicoAviso,
  slugUnidadeReferenciaPublico,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';

const SELECT_AVISOS =
  'id, titulo, conteudo, data_publicacao, ativo, exige_confirmacao, unidade_id, publico_alvo, publicado_por_id, publicado_por_nome, unidades(nome, slug)';
const SELECT_AVISOS_SEM_AUTOR =
  'id, titulo, conteudo, data_publicacao, ativo, exige_confirmacao, unidade_id, publico_alvo, unidades(nome, slug)';
const SELECT_AVISOS_SEM_PUBLICO =
  'id, titulo, conteudo, data_publicacao, ativo, exige_confirmacao, unidade_id, unidades(nome, slug)';

async function unidadeIdPorSlug(supabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  return data?.id ? String(data.id) : null;
}

function resolverPublicoDoBody(body: {
  publico_alvo?: string;
  unidade_slug?: string;
}): PublicoAvisoKey | null {
  if (isPublicoAvisoKey(body.publico_alvo)) return body.publico_alvo;
  if (body.unidade_slug?.trim()) return publicoLegacyFromUnidadeSlug(body.unidade_slug);
  return null;
}

function mapAvisoAdmin(a: Record<string, unknown>) {
  const unidade = a.unidades as { nome?: string; slug?: string } | null;
  const unidadeSlug = unidade?.slug ?? '';
  const publico = resolverPublicoAviso(
    a.publico_alvo as string | null | undefined,
    unidadeSlug
  );
  const autor = nomeAutorAvisoExibicao({
    publicado_por_nome: a.publicado_por_nome as string | null | undefined,
  });
  return {
    id: a.id,
    titulo: a.titulo,
    conteudo: a.conteudo,
    data_publicacao: a.data_publicacao,
    ativo: a.ativo === true,
    exige_confirmacao: a.exige_confirmacao === true,
    unidade_id: a.unidade_id,
    unidade_nome: unidade?.nome ?? '',
    unidade_slug: unidadeSlug,
    publico_alvo: publico,
    publico_label: labelPublicoAviso(publico),
    publicado_por_id: a.publicado_por_id ? String(a.publicado_por_id) : null,
    publicado_por_nome: autor || null,
  };
}

/** Lista avisos ativos. */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;

    const primario = await supabase
      .from('avisos')
      .select(SELECT_AVISOS)
      .order('data_publicacao', { ascending: false });
    data = primario.data as unknown[] | null;
    error = primario.error;

    if (error && erroColunaAutorAviso(error.message)) {
      const r2 = await supabase
        .from('avisos')
        .select(SELECT_AVISOS_SEM_AUTOR)
        .order('data_publicacao', { ascending: false });
      data = r2.data as unknown[] | null;
      error = r2.error;
    }
    if (error && /publico_alvo/i.test(error.message)) {
      const r3 = await supabase
        .from('avisos')
        .select(SELECT_AVISOS_SEM_PUBLICO)
        .order('data_publicacao', { ascending: false });
      data = r3.data as unknown[] | null;
      error = r3.error;
    }
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const avisos = ((data ?? []) as Record<string, unknown>[]).map(mapAvisoAdmin);

    return NextResponse.json({ ok: true, avisos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Cria aviso. */
export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: {
    titulo?: string;
    conteudo?: string;
    unidade_id?: string;
    unidade_slug?: string;
    publico_alvo?: string;
    exige_confirmacao?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { titulo, conteudo, unidade_id, exige_confirmacao } = body;
  const publico = resolverPublicoDoBody(body);
  if (!titulo?.trim() || !publico) {
    return NextResponse.json({ ok: false, erro: 'Título e público são obrigatórios' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let unidadeIdResolvido = unidade_id;
    if (!unidadeIdResolvido) {
      unidadeIdResolvido =
        (await unidadeIdPorSlug(supabase, slugUnidadeReferenciaPublico(publico))) ?? undefined;
    }
    if (!unidadeIdResolvido) {
      return NextResponse.json({ ok: false, erro: 'Unidade de referência inválida' }, { status: 400 });
    }

    const autor = await resolverAutorPublicacaoAviso(supabase);

    const payloadBase: Record<string, unknown> = {
      titulo: titulo.trim(),
      conteudo: conteudo?.trim() || null,
      unidade_id: unidadeIdResolvido,
      ativo: true,
      exige_confirmacao: exige_confirmacao === true,
      publicado_por_id: autor.id,
      publicado_por_nome: autor.nome,
    };

    let insert = await supabase
      .from('avisos')
      .insert({ ...payloadBase, publico_alvo: publico })
      .select('id, titulo')
      .single();

    if (insert.error && erroColunaAutorAviso(insert.error.message)) {
      const { publicado_por_id: _a, publicado_por_nome: _b, ...semAutor } = payloadBase;
      insert = await supabase
        .from('avisos')
        .insert({ ...semAutor, publico_alvo: publico })
        .select('id, titulo')
        .single();
    }

    if (insert.error && /publico_alvo/i.test(insert.error.message)) {
      const { publico_alvo: _p, ...semPublico } = { ...payloadBase, publico_alvo: publico };
      insert = await supabase.from('avisos').insert(semPublico).select('id, titulo').single();
    }

    if (insert.error) return NextResponse.json({ ok: false, erro: insert.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, aviso: insert.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
