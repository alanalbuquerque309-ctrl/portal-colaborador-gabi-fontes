import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminLiderancaMapaApi } from '@/lib/admin-auth';
import {
  listarVagasSubstituicaoLider,
  substituirLiderFuncoes,
} from '@/lib/substituir-lider-funcoes';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Preview das vagas que seriam transferidas. */
export async function GET(req: Request) {
  const auth = await requireAdminLiderancaMapaApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const liderAntigoId = searchParams.get('lider_antigo_id')?.trim() ?? '';
  const liderNovoId = searchParams.get('lider_novo_id')?.trim() ?? '';
  const unidadeId = searchParams.get('unidade_id')?.trim() ?? '';
  const setor = searchParams.get('setor')?.trim() ?? '';

  if (!isUuid(liderAntigoId)) {
    return NextResponse.json({ ok: false, erro: 'lider_antigo_id obrigatório' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { vagas, erro } = await listarVagasSubstituicaoLider(supabase, {
      liderAntigoId,
      liderNovoId: liderNovoId || liderAntigoId,
      unidadeId: unidadeId || null,
      setor: setor || null,
    });
    if (erro) return NextResponse.json({ ok: false, erro }, { status: 400 });

    const unidadeIds = Array.from(new Set(vagas.map((v) => v.unidade_id)));
    const { data: unidades } = await supabase.from('unidades').select('id, nome, slug').in('id', unidadeIds);
    const unidadePorId = Object.fromEntries((unidades ?? []).map((u) => [String(u.id), u]));

    const { data: antigo } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .eq('id', liderAntigoId)
      .maybeSingle();

    let novoNome: string | null = null;
    if (liderNovoId && isUuid(liderNovoId)) {
      const { data: novo } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .eq('id', liderNovoId)
        .maybeSingle();
      novoNome = novo?.nome ? String(novo.nome) : null;
    }

    return NextResponse.json({
      ok: true,
      lider_antigo: { id: liderAntigoId, nome: antigo?.nome ?? '' },
      lider_novo: liderNovoId && isUuid(liderNovoId) ? { id: liderNovoId, nome: novoNome ?? '' } : null,
      total_vagas: vagas.length,
      vagas: vagas.map((v) => {
        const u = unidadePorId[v.unidade_id];
        return {
          id: v.id,
          unidade_id: v.unidade_id,
          unidade_nome: u?.nome ?? '',
          unidade_slug: u?.slug ?? '',
          setor: v.setor,
          plantao_paridade: v.plantao_paridade,
        };
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Transfere todas as funções do líder antigo para o novo. */
export async function POST(req: Request) {
  const auth = await requireAdminLiderancaMapaApi();
  if (!auth.ok) return auth.response;

  let body: {
    lider_antigo_id?: string;
    lider_novo_id?: string;
    unidade_id?: string;
    setor?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const liderAntigoId = String(body.lider_antigo_id ?? '').trim();
  const liderNovoId = String(body.lider_novo_id ?? '').trim();
  if (!isUuid(liderAntigoId) || !isUuid(liderNovoId)) {
    return NextResponse.json({ ok: false, erro: 'IDs inválidos' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await substituirLiderFuncoes(supabase, {
      liderAntigoId,
      liderNovoId,
      unidadeId: body.unidade_id?.trim() || null,
      setor: body.setor?.trim() || null,
    });

    if (resultado.erro) {
      return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
