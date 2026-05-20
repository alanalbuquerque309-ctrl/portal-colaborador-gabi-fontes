import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { isSetorValido, SETORES_PREDEFINIDOS } from '@/lib/constants/colaborador-org';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { podeSerLider } from '@/lib/pode-ser-lider';

function setorConfigValido(setor: string): boolean {
  return setor === SETOR_TODOS_NA_UNIDADE || isSetorValido(setor);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Lista configuração de líderes por unidade/setor. */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get('unidade_id')?.trim() ?? '';
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() ?? '';

  try {
    const supabase = createAdminClient();

    let uid = unidadeId;
    if (!uid && unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id').eq('slug', unidadeSlug).maybeSingle();
      uid = u?.id ? String(u.id) : '';
    }

    let query = supabase
      .from('lideres_por_setor')
      .select('id, unidade_id, setor, lider_id, ativo, unidades(nome, slug)')
      .order('setor', { ascending: true });

    if (!uid) {
      return NextResponse.json(
        { ok: false, erro: unidadeSlug ? 'Unidade não encontrada' : 'Informe unidade_id ou unidade_slug' },
        { status: 400 }
      );
    }

    query = query.eq('unidade_id', uid);

    const { data, error } = await query;
    if (error) {
      if (/lideres_por_setor|does not exist/i.test(error.message)) {
        return NextResponse.json({
          ok: true,
          unidade_id: uid,
          linhas: [],
          setores: [...SETORES_PREDEFINIDOS],
          aviso: 'Execute a migration 032_lideres_por_setor.sql no Supabase.',
        });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const liderIds = Array.from(new Set((data ?? []).map((r) => String(r.lider_id ?? '')).filter(Boolean)));
    let nomePorId: Record<string, string> = {};
    if (liderIds.length > 0) {
      const { data: cols } = await supabase.from('colaboradores').select('id, nome').in('id', liderIds);
      nomePorId = Object.fromEntries((cols ?? []).map((c) => [String(c.id), String(c.nome ?? '')]));
    }

    const linhas = (data ?? []).map((r) => {
      const unidade = Array.isArray(r.unidades) ? r.unidades[0] : r.unidades;
      return {
        id: String(r.id),
        unidade_id: String(r.unidade_id),
        unidade_nome: unidade?.nome ? String(unidade.nome) : '',
        unidade_slug: unidade?.slug ? String(unidade.slug) : '',
        setor: String(r.setor),
        lider_id: String(r.lider_id),
        lider_nome: nomePorId[String(r.lider_id)] ?? '',
        ativo: r.ativo === true,
      };
    });

    return NextResponse.json({
      ok: true,
      unidade_id: uid,
      linhas,
      setores: [...SETORES_PREDEFINIDOS],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Regista líder para unidade + setor. */
export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: { unidade_id?: string; unidade_slug?: string; setor?: string; lider_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const setor = String(body.setor ?? '').trim();
  const liderId = String(body.lider_id ?? '').trim();
  if (!setor || !setorConfigValido(setor) || !isUuid(liderId)) {
    return NextResponse.json({ ok: false, erro: 'Setor ou líder inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let unidadeId = body.unidade_id?.trim() ?? '';
    if (!unidadeId && body.unidade_slug) {
      const { data: u } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', body.unidade_slug.trim())
        .maybeSingle();
      unidadeId = u?.id ? String(u.id) : '';
    }
    if (!unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Unidade obrigatória' }, { status: 400 });
    }

    const { data: lider, error: errL } = await supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, unidade_id')
      .eq('id', liderId)
      .maybeSingle();
    if (errL || !lider) {
      return NextResponse.json({ ok: false, erro: 'Líder não encontrado' }, { status: 404 });
    }
    if (!podeSerLider((lider as { role?: string }).role, (lider as { cargo?: string }).cargo)) {
      return NextResponse.json(
        { ok: false, erro: 'Este colaborador não pode ser líder de setor (função/cargo).' },
        { status: 400 }
      );
    }
    if (String(lider.unidade_id) !== unidadeId) {
      return NextResponse.json(
        { ok: false, erro: 'O líder deve pertencer à mesma unidade da configuração.' },
        { status: 400 }
      );
    }

    const { data: row, error } = await supabase
      .from('lideres_por_setor')
      .upsert(
        {
          unidade_id: unidadeId,
          setor,
          lider_id: liderId,
          ativo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'unidade_id,setor,lider_id' }
      )
      .select('id')
      .single();

    if (error) {
      if (/lideres_por_setor|does not exist/i.test(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Tabela lideres_por_setor ausente. Aplique migration 032 no Supabase.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: row?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Desativa vínculo (body: { id } ou { unidade_id, setor, lider_id }). */
export async function DELETE(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: { id?: string; unidade_id?: string; setor?: string; lider_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const id = body.id?.trim();

    if (id && isUuid(id)) {
      const { error } = await supabase
        .from('lideres_por_setor')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const setor = String(body.setor ?? '').trim();
    const liderId = String(body.lider_id ?? '').trim();
    const unidadeId = String(body.unidade_id ?? '').trim();
    if (!unidadeId || !setor || !liderId) {
      return NextResponse.json({ ok: false, erro: 'Informe id ou unidade+setor+líder' }, { status: 400 });
    }

    const { error } = await supabase
      .from('lideres_por_setor')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('unidade_id', unidadeId)
      .eq('setor', setor)
      .eq('lider_id', liderId);

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
