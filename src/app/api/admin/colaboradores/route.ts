import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized, requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { isSetorCadastroValido } from '@/lib/tenant/org-catalog';
import {
  normalizarSlugUnidadeOperacional,
  ROLES_CADASTRO,
  SLUGS_UNIDADE_OCULTOS,
} from '@/lib/constants/colaborador-org';
import { hashPassword } from '@/lib/password';
import { SENHA_PADRAO_INICIAL } from '@/lib/senha-portal';
import { syncTelefoneLoginFromTelefone } from '@/lib/telefone';
import { sincronizarVinculosLiderancaColaborador } from '@/lib/sincronizar-vinculos-lideranca';
import { AUDIT_ACOES, registrarAuditoria } from '@/lib/audit-log';
import { isUnidadeSlugCadastroValidoServer } from '@/lib/tenant/settings-server';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } as const;

function isMissingTelefoneLoginColumnError(err: { message?: string } | null | undefined): boolean {
  const msg = String(err?.message ?? '').toLowerCase();
  return msg.includes('telefone_login') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

function dataIsoValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Lista colaboradores. Apenas admins autenticados. */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json(
      { ok: false, erro: 'Não autorizado' },
      { status: 401, headers: NO_STORE }
    );
  }
  try {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : 'Variáveis do Supabase ausentes';
      return NextResponse.json(
        { ok: false, erro: `${msg}. Configure SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL na Vercel.` },
        { status: 503, headers: NO_STORE }
      );
    }

    const { data: rows, error, count } = await supabase
      .from('colaboradores')
      .select('id, nome, cpf, email, telefone, cargo, setor, onboarding_completo, role, unidade_id', {
        count: 'exact',
      })
      .order('nome');

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
    }

    const list = rows ?? [];
    const unidadeIds = Array.from(
      new Set(list.map((r) => r.unidade_id).filter((id): id is string => typeof id === 'string' && id.length > 0))
    );
    let unidadePorId: Record<string, { nome: string; slug: string | null }> = {};
    if (unidadeIds.length > 0) {
      const { data: unRows, error: uErr } = await supabase
        .from('unidades')
        .select('id, nome, slug')
        .in('id', unidadeIds);
      if (uErr) {
        return NextResponse.json({ ok: false, erro: uErr.message }, { status: 500, headers: NO_STORE });
      }
      unidadePorId = Object.fromEntries(
        (unRows ?? []).map((u) => [u.id as string, { nome: String(u.nome ?? ''), slug: u.slug != null ? String(u.slug) : null }])
      );
    }

    const colaboradores = list.map((r) => {
      const uid = r.unidade_id as string | null | undefined;
      const u = uid && unidadePorId[uid] ? unidadePorId[uid] : { nome: '-', slug: null as string | null };
      return {
        ...r,
        unidades: { nome: u.nome, slug: u.slug },
      };
    });

    const totalSupabase = typeof count === 'number' ? count : list.length;

    return NextResponse.json(
      { ok: true, colaboradores, total_supabase: totalSupabase },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}

/** Cadastra colaborador. Apenas admin, RH e sócios. */
export async function POST(req: Request) {
  const authPost = await requireAdminCadastroEditApi();
  if (!authPost.ok) return authPost.response;

  let body: {
    nome?: string; cpf?: string; email?: string; telefone?: string;
    endereco?: string; data_admissao?: string; data_nascimento?: string; cargo?: string; setor?: string | null;
    unidade_id?: string; unidade_slug?: string; role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { nome, cpf, email, telefone, endereco, data_admissao, data_nascimento, cargo, setor, unidade_id, unidade_slug, role } = body;
  const roleFinal =
    role && (ROLES_CADASTRO as readonly string[]).includes(role) ? role : 'colaborador';

  if (!nome?.trim()) {
    return NextResponse.json({ ok: false, erro: 'Nome é obrigatório' }, { status: 400 });
  }
  if (!unidade_id && !unidade_slug) {
    return NextResponse.json({ ok: false, erro: 'Unidade é obrigatória' }, { status: 400 });
  }

  const setorFinal = setor === null || setor === undefined ? '' : String(setor).trim();
  if (!setorFinal) {
    return NextResponse.json({ ok: false, erro: 'Setor é obrigatório' }, { status: 400 });
  }
  if (!isSetorCadastroValido(setorFinal)) {
    return NextResponse.json({ ok: false, erro: 'Setor inválido' }, { status: 400 });
  }

  const admIso = data_admissao?.trim()?.slice(0, 10) ?? '';
  if (!admIso) {
    return NextResponse.json(
      { ok: false, erro: 'Data de admissão é obrigatória (contratação).' },
      { status: 400 }
    );
  }
  if (!dataIsoValida(admIso)) {
    return NextResponse.json({ ok: false, erro: 'Data de admissão inválida.' }, { status: 400 });
  }

  const telefoneLogin = syncTelefoneLoginFromTelefone(telefone);
  if (!telefoneLogin) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          'Celular com DDD é obrigatório para o login no portal (10 ou 11 dígitos). Verifique o número informado.',
      },
      { status: 400 }
    );
  }

  const nascIso = data_nascimento?.trim()?.slice(0, 10) ?? '';
  if (nascIso && admIso === nascIso) {
    return NextResponse.json(
      {
        ok: false,
        erro: 'Data de nascimento não pode ser igual à data de admissão. Corrija no cadastro.',
      },
      { status: 400 }
    );
  }

  const cpfRaw = String(cpf ?? '').replace(/\D/g, '');
  let cpfValor: string | null = null;
  if (cpfRaw.length > 0) {
    if (cpfRaw.length !== 11) {
      return NextResponse.json({ ok: false, erro: 'CPF deve ter 11 dígitos ou ficar em branco' }, { status: 400 });
    }
    cpfValor = cpfRaw;
  }

  try {
    const supabase = createAdminClient();
    let unidadeIdResolvido = unidade_id;
    let unidadeSlugResolvido: string | null = null;

    if (unidadeIdResolvido) {
      const { data: porId } = await supabase
        .from('unidades')
        .select('id, slug')
        .eq('id', unidadeIdResolvido)
        .maybeSingle();
      if (!porId?.id) {
        return NextResponse.json({ ok: false, erro: 'Unidade inválida' }, { status: 400 });
      }
      unidadeSlugResolvido = normalizarSlugUnidadeOperacional(String(porId.slug ?? ''));
      if (!unidadeSlugResolvido || (SLUGS_UNIDADE_OCULTOS as readonly string[]).includes(String(porId.slug))) {
        // Aceita ID de Quiosque legado mapeando para Barra
        if (String(porId.slug) === 'quiosque') {
          const { data: barra } = await supabase.from('unidades').select('id, slug').eq('slug', 'barra').maybeSingle();
          if (!barra?.id) {
            return NextResponse.json({ ok: false, erro: 'Unidade Barra não encontrada' }, { status: 400 });
          }
          unidadeIdResolvido = barra.id;
          unidadeSlugResolvido = 'barra';
        } else {
          return NextResponse.json({ ok: false, erro: 'Unidade inválida para cadastro' }, { status: 400 });
        }
      } else if (!(await isUnidadeSlugCadastroValidoServer(unidadeSlugResolvido))) {
        return NextResponse.json({ ok: false, erro: 'Unidade inválida para cadastro' }, { status: 400 });
      }
    } else if (unidade_slug) {
      const slugCanon = normalizarSlugUnidadeOperacional(unidade_slug);
      if (!slugCanon || !(await isUnidadeSlugCadastroValidoServer(slugCanon))) {
        return NextResponse.json({ ok: false, erro: 'Unidade inválida' }, { status: 400 });
      }
      unidadeSlugResolvido = slugCanon;
      const { data: porSlug } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', slugCanon)
        .maybeSingle();
      if (porSlug?.id) {
        unidadeIdResolvido = porSlug.id;
      } else {
        const UNIDADES_PADRAO: { nome: string; slug: string }[] = [
          { nome: 'Mesquita', slug: 'mesquita' },
          { nome: 'Barra', slug: 'barra' },
          { nome: 'Nova Iguaçu', slug: 'nova-iguacu' },
          { nome: 'Fábrica', slug: 'fabrica' },
          { nome: 'Administrativo', slug: 'administrativo' },
        ];
        const def = UNIDADES_PADRAO.find((u) => u.slug === slugCanon);
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
    // Apenas sócios pulam o onboarding; todos os demais fazem vídeo + quizzes + manuais.
    const acessoSemOnboarding = roleFinal === 'socio';

    const senhaPadraoHash = hashPassword(SENHA_PADRAO_INICIAL);
    const obrigaOnboarding = !acessoSemOnboarding;

    const payload: Record<string, unknown> = {
      nome: nome.trim(),
      cpf: cpfValor,
      email: email?.trim() || null,
      unidade_id: unidadeIdResolvido,
      role: roleFinal,
      onboarding_completo: acessoSemOnboarding,
      data_admissao: admIso,
      setor: setorFinal,
    };
    if (obrigaOnboarding) {
      payload.senha_hash = senhaPadraoHash;
      payload.forca_troca_senha = true;
    }
    if (telefone?.trim()) {
      payload.telefone = telefone.trim();
      payload.telefone_login = telefoneLogin;
    }
    if (endereco?.trim()) payload.endereco = endereco.trim();
    if (data_nascimento?.trim()) payload.data_nascimento = data_nascimento.trim();
    if (cargo?.trim()) payload.cargo = cargo.trim();

    let { data, error } = await supabase
      .from('colaboradores')
      .insert(payload)
      .select('id, nome')
      .single();

    if (error && obrigaOnboarding && payload.forca_troca_senha) {
      const msg = String(error.message ?? '').toLowerCase();
      if (msg.includes('forca_troca_senha') || msg.includes('column')) {
        const fallback = { ...payload };
        delete fallback.forca_troca_senha;
        const retry = await supabase.from('colaboradores').insert(fallback).select('id, nome').single();
        data = retry.data;
        error = retry.error;
      }
    }
    if (error && isMissingTelefoneLoginColumnError(error)) {
      const fallback = { ...payload };
      delete fallback.telefone_login;
      const retry = await supabase.from('colaboradores').insert(fallback).select('id, nome').single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') {
        const msg = String(error.message ?? '').toLowerCase();
        if (msg.includes('telefone_login') || msg.includes('uq_colaboradores_telefone_login')) {
          return NextResponse.json(
            { ok: false, erro: 'Já existe colaborador com este celular (login).' },
            { status: 400 }
          );
        }
        return NextResponse.json({ ok: false, erro: 'CPF já cadastrado' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    let lideres_vinculados: string[] = [];
    if (data?.id && roleFinal === 'colaborador' && setorFinal) {
      const sync = await sincronizarVinculosLiderancaColaborador(supabase, String(data.id));
      lideres_vinculados = sync.lideres_ids;
    }

    if (data?.id) {
      await registrarAuditoria(supabase, {
        acao: AUDIT_ACOES.COLAB_CRIAR,
        alvoTipo: 'colaborador',
        alvoId: String(data.id),
        unidadeId: unidadeIdResolvido,
        detalhes: {
          tipo: 'contratacao',
          data_admissao: admIso,
          setor: setorFinal,
          unidade_slug: unidadeSlugResolvido,
          role: roleFinal,
        },
        req,
      });
    }

    return NextResponse.json({ ok: true, colaborador: data, lideres_vinculados });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: 'Erro ao cadastrar' },
      { status: 500 }
    );
  }
}
