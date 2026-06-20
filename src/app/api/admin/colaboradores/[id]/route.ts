import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext, requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { podeEditarCpfColaboradorAdmin } from '@/lib/admin-access';
import { isSetorValido } from '@/lib/constants/colaborador-org';
import { validateCpf } from '@/lib/utils/cpf';
import { syncTelefoneLoginFromTelefone } from '@/lib/telefone';
import { normalizePortalRole } from '@/lib/roles';
import { podeSerLider } from '@/lib/pode-ser-lider';
import { sincronizarVinculosLiderancaColaborador } from '@/lib/sincronizar-vinculos-lideranca';

/** Inclui `master` (tratado como gerente no app) para não quebrar cadastros antigos. */
const ROLES_EDITAVEIS = ['colaborador', 'admin', 'socio', 'gerente', 'master'] as const;

const UNIDADES_PADRAO: { nome: string; slug: string }[] = [
  { nome: 'Mesquita', slug: 'mesquita' },
  { nome: 'Barra', slug: 'barra' },
  { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
  { nome: 'Fábrica', slug: 'fabrica' },
  { nome: 'Administrativo', slug: 'administrativo' },
  /** Legado — não oferecido no cadastro novo; mantém edição de quem já estava em Matriz. */
  { nome: 'Matriz (todas as lojas)', slug: 'matriz' },
];

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isMissingTelefoneLoginColumnError(err: { message?: string } | null | undefined): boolean {
  const msg = String(err?.message ?? '').toLowerCase();
  return msg.includes('telefone_login') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizarLideresIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return Array.from(new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean)));
}

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
  const authGet = await requireAdminCadastroEditApi();
  if (!authGet.ok) return authGet.response;
  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select(
        'id, nome, cpf, email, telefone, endereco, data_nascimento, data_admissao, cargo, setor, onboarding_completo, role, unidade_id, lider_id, unidades(slug, nome)'
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const lideresIds = new Set<string>();
    const liderLegado = (data as { lider_id?: string | null }).lider_id;
    if (liderLegado) lideresIds.add(String(liderLegado));
    const { data: vinculos } = await supabase
      .from('colaboradores_lideres')
      .select('lider_id')
      .eq('colaborador_id', id)
      .eq('ativo', true);
    for (const v of vinculos ?? []) {
      if (v.lider_id) lideresIds.add(String(v.lider_id));
    }

    return NextResponse.json({ ok: true, colaborador: { ...data, lideres_ids: Array.from(lideresIds) } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Atualiza colaborador (incluindo função / admin). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authPatch = await requireAdminCadastroEditApi();
  if (!authPatch.ok) return authPatch.response;
  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  let body: {
    nome?: string;
    cpf?: string | null;
    email?: string | null;
    telefone?: string | null;
    endereco?: string | null;
    data_admissao?: string | null;
    data_nascimento?: string | null;
    cargo?: string | null;
    setor?: string | null;
    unidade_id?: string;
    unidade_slug?: string;
    role?: string;
    lider_id?: string | null;
    lideres_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: existe } = await supabase
      .from('colaboradores')
      .select('id, role')
      .eq('id', id)
      .maybeSingle();
    if (!existe) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }
    const roleAnterior = String((existe as { role?: string }).role ?? 'colaborador').toLowerCase();
    const roleProximo =
      body.role !== undefined ? String(body.role).trim().toLowerCase() : roleAnterior;

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

    if (body.cpf !== undefined) {
      const ctx = await getAdminViewerContext();
      const senhaAdmin = ctx?.kind === 'password_session';
      const roleViewer = ctx?.kind === 'portal' ? ctx.role : null;
      if (!podeEditarCpfColaboradorAdmin(roleViewer, senhaAdmin)) {
        return NextResponse.json(
          { ok: false, erro: 'Somente sócios ou administrador podem alterar CPF.' },
          { status: 403 }
        );
      }

      const cpfRaw =
        body.cpf === null || String(body.cpf).trim() === ''
          ? ''
          : String(body.cpf).replace(/\D/g, '');

      if (!cpfRaw) {
        payload.cpf = null;
      } else {
        if (!validateCpf(cpfRaw)) {
          return NextResponse.json(
            { ok: false, erro: 'CPF inválido. Verifique os dígitos.' },
            { status: 400 }
          );
        }
        const { data: outroCpf } = await supabase
          .from('colaboradores')
          .select('id, nome')
          .eq('cpf', cpfRaw)
          .neq('id', id)
          .maybeSingle();
        if (outroCpf) {
          return NextResponse.json(
            {
              ok: false,
              erro: `Este CPF já está cadastrado para ${String((outroCpf as { nome?: string }).nome ?? 'outro colaborador')}.`,
            },
            { status: 400 }
          );
        }
        payload.cpf = cpfRaw;
      }
    }

    if (body.email !== undefined) payload.email = body.email?.trim() || null;
    if (body.telefone !== undefined) {
      const telRaw = body.telefone?.trim() || null;
      payload.telefone = telRaw;
      const telLogin = syncTelefoneLoginFromTelefone(telRaw);
      payload.telefone_login = telLogin;
      if (telRaw && !telLogin) {
        return NextResponse.json(
          {
            ok: false,
            erro: 'Celular inválido para login (use DDD + número, 10 ou 11 dígitos).',
          },
          { status: 400 }
        );
      }
    }
    if (body.endereco !== undefined) payload.endereco = body.endereco?.trim() || null;
    if (body.data_admissao !== undefined) payload.data_admissao = body.data_admissao?.trim() || null;
    if (body.data_nascimento !== undefined) payload.data_nascimento = body.data_nascimento?.trim() || null;

    if (body.data_nascimento !== undefined || body.data_admissao !== undefined) {
      const { data: atual } = await supabase
        .from('colaboradores')
        .select('data_nascimento, data_admissao')
        .eq('id', id)
        .maybeSingle();
      const admFinal = String(
        body.data_admissao !== undefined ? body.data_admissao?.trim() || '' : (atual?.data_admissao ?? '')
      ).slice(0, 10);
      const nascFinal = String(
        body.data_nascimento !== undefined ? body.data_nascimento?.trim() || '' : (atual?.data_nascimento ?? '')
      ).slice(0, 10);
      if (admFinal && nascFinal && admFinal === nascFinal) {
        return NextResponse.json(
          {
            ok: false,
            erro: 'Data de nascimento não pode ser igual à data de admissão. Corrija no cadastro.',
          },
          { status: 400 }
        );
      }
    }
    if (body.cargo !== undefined) payload.cargo = body.cargo?.trim() || null;

    if (body.setor !== undefined) {
      const s = body.setor === null || body.setor === '' ? null : String(body.setor).trim();
      if (s && !isSetorValido(s)) {
        return NextResponse.json({ ok: false, erro: 'Setor inválido' }, { status: 400 });
      }
      payload.setor = s;
    }

    if (body.role !== undefined) {
      const role = String(body.role).trim();
      if (!ROLES_EDITAVEIS.includes(role as (typeof ROLES_EDITAVEIS)[number])) {
        return NextResponse.json({ ok: false, erro: 'Função inválida' }, { status: 400 });
      }
      payload.role = role;
      if (role === 'socio') {
        payload.onboarding_completo = true;
        payload.termo_aceite_em = new Date().toISOString();
      }
      if (role === 'gerente' || role === 'master' || role === 'admin' || role === 'socio') {
        payload.lider_id = null;
      }
    }

    const perfilSemLiderDireto = ['gerente', 'master', 'admin', 'socio'];
    const lideresRecebidos = body.lideres_ids !== undefined
      ? normalizarLideresIds(body.lideres_ids)
      : body.lider_id !== undefined
        ? normalizarLideresIds(body.lider_id ? [body.lider_id] : [])
        : null;

    if (lideresRecebidos !== null && !perfilSemLiderDireto.includes(roleProximo)) {
      for (const lid of lideresRecebidos) {
        if (!isUuid(lid)) {
          return NextResponse.json({ ok: false, erro: 'Líder inválido' }, { status: 400 });
        }
        if (lid === id) {
          return NextResponse.json({ ok: false, erro: 'Colaborador não pode ser líder de si mesmo' }, { status: 400 });
        }
        const { data: leadRow } = await supabase
          .from('colaboradores')
          .select('id, unidade_id, role, cargo')
          .eq('id', lid)
          .maybeSingle();
        if (!leadRow) {
          return NextResponse.json({ ok: false, erro: 'Líder não encontrado' }, { status: 400 });
        }
        if (!podeSerLider((leadRow as { role?: string | null }).role ?? null, (leadRow as { cargo?: string | null }).cargo ?? null)) {
          return NextResponse.json(
            { ok: false, erro: 'O líder selecionado não está na lista de lideranças permitidas.' },
            { status: 400 }
          );
        }
      }
      payload.lider_id = lideresRecebidos[0] ?? null;
    } else if (lideresRecebidos !== null && perfilSemLiderDireto.includes(roleProximo)) {
      payload.lider_id = null;
    }
    const limparLideresPorPerfil = body.role !== undefined && perfilSemLiderDireto.includes(roleProximo);

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

    let { data: atualizado, error } = await supabase
      .from('colaboradores')
      .update(payload)
      .eq('id', id)
      .select('id, role, lider_id')
      .single();

    if (error && isMissingTelefoneLoginColumnError(error)) {
      const retryPayload = { ...payload };
      delete retryPayload.telefone_login;
      const retry = await supabase
        .from('colaboradores')
        .update(retryPayload)
        .eq('id', id)
        .select('id, role, lider_id')
        .single();
      atualizado = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') {
        const msg = String(error.message ?? '').toLowerCase();
        if (msg.includes('telefone_login') || msg.includes('uq_colaboradores_telefone_login')) {
          return NextResponse.json(
            { ok: false, erro: 'Já existe outro colaborador com este celular (login).' },
            { status: 400 }
          );
        }
        if (msg.includes('cpf')) {
          return NextResponse.json(
            { ok: false, erro: 'Este CPF já está cadastrado para outro colaborador.' },
            { status: 400 }
          );
        }
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!atualizado) {
      return NextResponse.json(
        { ok: false, erro: 'Nenhuma linha foi atualizada. Tente novamente ou verifique o id.' },
        { status: 409 }
      );
    }

    if (lideresRecebidos !== null || limparLideresPorPerfil) {
      await supabase
        .from('colaboradores_lideres')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('colaborador_id', id);

      if (lideresRecebidos !== null && !perfilSemLiderDireto.includes(roleProximo) && lideresRecebidos.length > 0) {
        const { error: vincErr } = await supabase.from('colaboradores_lideres').upsert(
          lideresRecebidos.map((liderId) => ({
            colaborador_id: id,
            lider_id: liderId,
            ativo: true,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'colaborador_id,lider_id' }
        );
        if (vincErr) {
          return NextResponse.json({ ok: false, erro: vincErr.message }, { status: 500 });
        }
      }
    }

    let lideres_vinculados: string[] | undefined;
    const roleFinal = String((atualizado as { role?: string }).role ?? roleProximo).toLowerCase();
    const setorAlterado = body.setor !== undefined;
    const unidadeAlterada = body.unidade_id !== undefined || body.unidade_slug !== undefined;
    if (
      lideresRecebidos === null &&
      !perfilSemLiderDireto.includes(roleFinal) &&
      (setorAlterado || unidadeAlterada || body.role !== undefined)
    ) {
      const sync = await sincronizarVinculosLiderancaColaborador(supabase, id);
      lideres_vinculados = sync.lideres_ids;
    }

    return NextResponse.json({ ok: true, colaborador: atualizado, lideres_vinculados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
