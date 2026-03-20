import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/** Lista colaboradores. Apenas admins autenticados. */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, cpf, email, telefone, cargo, onboarding_completo, role, unidades(nome)')
      .order('nome');
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, colaboradores: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Cadastra colaborador. Apenas admins autenticados. */
export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const ROLES = ['colaborador', 'admin', 'socio'] as const;
  let body: {
    nome?: string; cpf?: string; email?: string; telefone?: string;
    endereco?: string; data_admissao?: string; cargo?: string;
    unidade_id?: string; unidade_slug?: string; role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { nome, cpf, email, telefone, endereco, data_admissao, cargo, unidade_id, unidade_slug, role } = body;
  const roleFinal = role && ROLES.includes(role as (typeof ROLES)[number]) ? role : 'colaborador';
  if (!nome?.trim() || !cpf?.trim() || (!unidade_id && !unidade_slug)) {
    return NextResponse.json(
      { ok: false, erro: 'Nome, CPF e unidade são obrigatórios' },
      { status: 400 }
    );
  }

  const cpfLimpo = String(cpf).replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let unidadeIdResolvido = unidade_id;
    if (!unidadeIdResolvido && unidade_slug) {
      const { data: porSlug } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', unidade_slug)
        .maybeSingle();
      if (porSlug?.id) {
        unidadeIdResolvido = porSlug.id;
      } else {
        const UNIDADES_PADRAO: { nome: string; slug: string }[] = [
          { nome: 'Matriz (todas as lojas)', slug: 'matriz' },
          { nome: 'Mesquita', slug: 'mesquita' },
          { nome: 'Barra', slug: 'barra' },
          { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
        ];
        const def = UNIDADES_PADRAO.find((u) => u.slug === unidade_slug);
        if (def) {
          const { data: ins } = await supabase
            .from('unidades')
            .insert({ nome: def.nome, slug: def.slug })
            .select('id')
            .single();
          if (ins?.id) unidadeIdResolvido = ins.id;
        }
      }
    }
    if (!unidadeIdResolvido) {
      return NextResponse.json({ ok: false, erro: 'Unidade inválida' }, { status: 400 });
    }
    // Sócios e admins: acesso total desde o primeiro login (sem onboarding obrigatório)
    const acessoMaster = roleFinal === 'socio' || roleFinal === 'admin';

    const payload: Record<string, unknown> = {
      nome: nome.trim(),
      cpf: cpfLimpo,
      email: email?.trim() || null,
      unidade_id: unidadeIdResolvido,
      role: roleFinal,
      onboarding_completo: acessoMaster,
    };
    if (telefone?.trim()) payload.telefone = telefone.trim();
    if (endereco?.trim()) payload.endereco = endereco.trim();
    if (data_admissao?.trim()) payload.data_admissao = data_admissao.trim();
    if (cargo?.trim()) payload.cargo = cargo.trim();

    const { data, error } = await supabase
      .from('colaboradores')
      .insert(payload)
      .select('id, nome')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, erro: 'CPF já cadastrado' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, colaborador: data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: 'Erro ao cadastrar' },
      { status: 500 }
    );
  }
}
