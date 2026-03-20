import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

const ROLES = ['colaborador', 'admin', 'socio'] as const;

const UNIDADES_PADRAO: { nome: string; slug: string }[] = [
  { nome: 'Matriz (todas as lojas)', slug: 'matriz' },
  { nome: 'Mesquita', slug: 'mesquita' },
  { nome: 'Barra', slug: 'barra' },
  { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
];

async function resolverUnidadeId(
  supabase: ReturnType<typeof createAdminClient>,
  unidade_id?: string,
  unidade_slug?: string
): Promise<string | null> {
  if (unidade_id) return unidade_id;
  if (!unidade_slug) return null;
  const { data: porSlug } = await supabase.from('unidades').select('id').eq('slug', unidade_slug).maybeSingle();
  if (porSlug?.id) return porSlug.id;
  const def = UNIDADES_PADRAO.find((u) => u.slug === unidade_slug);
  if (!def) return null;
  const { data: ins } = await supabase.from('unidades').insert({ nome: def.nome, slug: def.slug }).select('id').single();
  return ins?.id ?? null;
}

/** Detalhe de um colaborador para edição. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }
  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select(
        'id, nome, cpf, email, telefone, endereco, data_admissao, cargo, onboarding_completo, role, unidade_id, unidades(slug, nome)'
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, colaborador: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Atualiza colaborador (incluindo função / admin). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }
  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  let body: {
    nome?: string;
    email?: string | null;
    telefone?: string | null;
    endereco?: string | null;
    data_admissao?: string | null;
    cargo?: string | null;
    unidade_id?: string;
    unidade_slug?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: existe } = await supabase.from('colaboradores').select('id').eq('id', id).maybeSingle();
    if (!existe) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.nome !== undefined) {
      const n = String(body.nome).trim();
      if (!n) {
        return NextResponse.json({ ok: false, erro: 'Nome é obrigatório' }, { status: 400 });
      }
      payload.nome = n;
    }
    if (body.email !== undefined) payload.email = body.email?.trim() || null;
    if (body.telefone !== undefined) payload.telefone = body.telefone?.trim() || null;
    if (body.endereco !== undefined) payload.endereco = body.endereco?.trim() || null;
    if (body.data_admissao !== undefined) payload.data_admissao = body.data_admissao?.trim() || null;
    if (body.cargo !== undefined) payload.cargo = body.cargo?.trim() || null;

    if (body.role !== undefined) {
      const role = body.role;
      if (!ROLES.includes(role as (typeof ROLES)[number])) {
        return NextResponse.json({ ok: false, erro: 'Função inválida' }, { status: 400 });
      }
      payload.role = role;
      if (role === 'socio' || role === 'admin') {
        payload.onboarding_completo = true;
        payload.termo_aceite_em = new Date().toISOString();
      }
    }

    if (body.unidade_id !== undefined || body.unidade_slug !== undefined) {
      const uid = await resolverUnidadeId(supabase, body.unidade_id, body.unidade_slug);
      if (!uid) {
        return NextResponse.json({ ok: false, erro: 'Unidade inválida' }, { status: 400 });
      }
      payload.unidade_id = uid;
    }

    if (Object.keys(payload).length <= 1) {
      return NextResponse.json({ ok: false, erro: 'Nada para atualizar' }, { status: 400 });
    }

    const { error } = await supabase.from('colaboradores').update(payload).eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
