import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  colaboradorRecebeAvisoPublico,
  resolverPublicoAviso,
} from '@/lib/avisos-publico';
import { avisoVisivelNoPortal } from '@/lib/avisos-vigencia';

const SELECT_AVISOS =
  'id, titulo, conteudo, data_publicacao, exige_confirmacao, unidade_id, publico_alvo, unidades(slug)';
const SELECT_AVISOS_SEM_PUBLICO =
  'id, titulo, conteudo, data_publicacao, exige_confirmacao, unidade_id, unidades(slug)';

/** Lista avisos para o colaborador logado conforme público-alvo. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const role = cookieStore.get('portal_role')?.value ?? '';

  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const verTodasLojas = ['socio', 'admin'].includes(role.toLowerCase());

    const { data: colab, error: errColab } = await supabase
      .from('colaboradores')
      .select('id, setor, role, unidade_id, unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errColab || !colab) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const unidadeRaw = (colab as { unidades?: unknown }).unidades;
    const unidadeObj = Array.isArray(unidadeRaw) ? unidadeRaw[0] : unidadeRaw;
    const unidadeSlug =
      unidadeObj && typeof unidadeObj === 'object' && 'slug' in unidadeObj
        ? String((unidadeObj as { slug?: string }).slug ?? '')
        : '';

    const primario = await supabase
      .from('avisos')
      .select(SELECT_AVISOS)
      .eq('ativo', true)
      .order('data_publicacao', { ascending: false });

    let avisosRows: Record<string, unknown>[] = [];
    if (primario.error && /publico_alvo/i.test(primario.error.message)) {
      const retry = await supabase
        .from('avisos')
        .select(SELECT_AVISOS_SEM_PUBLICO)
        .eq('ativo', true)
        .order('data_publicacao', { ascending: false });
      if (retry.error) return NextResponse.json({ ok: false, erro: retry.error.message }, { status: 500 });
      avisosRows = (retry.data ?? []) as unknown as Record<string, unknown>[];
    } else {
      if (primario.error) return NextResponse.json({ ok: false, erro: primario.error.message }, { status: 500 });
      avisosRows = (primario.data ?? []) as unknown as Record<string, unknown>[];
    }

    let avisos = avisosRows.filter((a: Record<string, unknown>) =>
      avisoVisivelNoPortal(a.data_publicacao as string | null | undefined)
    );

    if (!verTodasLojas) {
      avisos = avisos.filter((a: Record<string, unknown>) => {
        const unidadeAviso = a.unidades as { slug?: string } | null;
        const publico = resolverPublicoAviso(
          a.publico_alvo as string | null | undefined,
          unidadeAviso?.slug
        );
        return colaboradorRecebeAvisoPublico(
          {
            unidade_slug: unidadeSlug,
            setor: (colab as { setor?: string | null }).setor ?? null,
            role: (colab as { role?: string | null }).role ?? role,
          },
          publico
        );
      });
    } else {
      avisos = avisos.filter((a: Record<string, unknown>) => {
        const unidadeAviso = a.unidades as { slug?: string } | null;
        const publico = resolverPublicoAviso(
          a.publico_alvo as string | null | undefined,
          unidadeAviso?.slug
        );
        if (publico !== 'lideranca') return true;
        return colaboradorRecebeAvisoPublico(
          {
            unidade_slug: unidadeSlug,
            setor: (colab as { setor?: string | null }).setor ?? null,
            role: (colab as { role?: string | null }).role ?? role,
          },
          publico
        );
      });
    }

    const { data: confirmacoes } = await supabase
      .from('aviso_confirmacoes')
      .select('aviso_id')
      .eq('colaborador_id', colaboradorId);

    const confirmadosSet = new Set((confirmacoes ?? []).map((c) => String(c.aviso_id)));

    const resultado = avisos.map((a: Record<string, unknown>) => ({
      id: a.id,
      titulo: a.titulo,
      conteudo: a.conteudo,
      data_publicacao: a.data_publicacao,
      exige_confirmacao: a.exige_confirmacao === true,
      confirmado: confirmadosSet.has(String(a.id)),
    }));

    return NextResponse.json({ ok: true, avisos: resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
