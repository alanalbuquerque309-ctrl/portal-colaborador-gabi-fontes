import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { domingoSemanaSaoPaulo, hojeEhDomingoSaoPaulo, segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { normalizePortalRole } from '@/lib/roles';
import {
  listarEquipeParaAvaliacaoSemanal,
  listarLideresDoColaborador,
} from '@/lib/colaborador-lideres';
import { colaboradorDeveAvaliarAdministradorEmpresa } from '@/lib/lideres-por-setor';

const DIMENSOES = ['n_exemplo', 'n_comunicacao', 'n_suporte', 'n_justica', 'n_clima'] as const;
type PapelAvaliacao = 'lider_direto' | 'rh_global' | 'admin_global' | 'subordinado_admin';
type AvaliadoRegra = { id: string; nome: string; role: string; papel: PapelAvaliacao };

function parseNota(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

function sanitizeJustificativa(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function roleLabel(role: string): string {
  const r = normalizePortalRole(role);
  if (r === 'colaborador') return 'Colaborador';
  if (r === 'gerente') return 'Gerente';
  if (r === 'master') return 'Chefia';
  if (r === 'admin') return 'Administrador';
  if (r === 'rh') return 'RH';
  return role || 'Liderança';
}

function papelLabel(papel: PapelAvaliacao): string {
  if (papel === 'lider_direto') return 'Chefe direto';
  if (papel === 'rh_global') return 'RH da empresa';
  if (papel === 'subordinado_admin') return 'Subordinado direto';
  return 'Administrador da empresa';
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extrairUnidadeSlug(eu: unknown): string | null {
  if (!eu || typeof eu !== 'object') return null;
  const row = eu as { unidades?: unknown; unidade?: unknown };
  const raw = row.unidades ?? row.unidade;
  const unidade = Array.isArray(raw) ? raw[0] : raw;
  if (unidade && typeof unidade === 'object' && 'slug' in unidade) {
    return String((unidade as { slug?: string }).slug ?? '') || null;
  }
  return null;
}

async function carregarAvaliadosPorRegra(
  supabase: ReturnType<typeof createAdminClient>,
  colaboradorId: string,
  liderDiretoId: string | null,
  meta?: { setor?: string | null; unidadeSlug?: string | null }
): Promise<AvaliadoRegra[]> {
  const out = new Map<string, AvaliadoRegra>();

  let setorCol = meta?.setor;
  let unidadeSlug = meta?.unidadeSlug;
  if (setorCol === undefined || unidadeSlug === undefined) {
    const { data: eu } = await supabase
      .from('colaboradores')
      .select('setor, unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();
    if (setorCol === undefined) {
      setorCol = (eu as { setor?: string | null } | null)?.setor ?? null;
    }
    if (unidadeSlug === undefined) {
      const unidade = Array.isArray((eu as { unidades?: unknown })?.unidades)
        ? (eu as { unidades: { slug?: string }[] }).unidades[0]
        : (eu as { unidades?: { slug?: string } | null })?.unidades;
      unidadeSlug =
        unidade && typeof unidade === 'object' && 'slug' in unidade
          ? String((unidade as { slug?: string }).slug ?? '')
          : null;
    }
  }

  const lideres = await listarLideresDoColaborador(supabase, colaboradorId, liderDiretoId, {
    apenasDaConfig: true,
  });
  for (const lider of lideres) {
    if (lider.id && lider.id !== colaboradorId) {
      out.set(lider.id, {
        id: lider.id,
        nome: lider.nome,
        role: lider.role,
        papel: 'lider_direto',
      });
    }
  }

  const { data: rhs } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .eq('role', 'rh')
    .neq('id', colaboradorId)
    .order('created_at', { ascending: true })
    .limit(1);
  const rh = rhs?.[0];
  if (rh?.id && !out.has(String(rh.id))) {
    out.set(String(rh.id), {
      id: String(rh.id),
      nome: String(rh.nome ?? ''),
      role: String((rh as { role?: string }).role ?? ''),
      papel: 'rh_global',
    });
  }

  const { data: admins } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .eq('role', 'admin')
    .neq('id', colaboradorId)
    .order('created_at', { ascending: true })
    .limit(1);
  const admin = admins?.[0];
  if (
    admin?.id &&
    !out.has(String(admin.id)) &&
    colaboradorDeveAvaliarAdministradorEmpresa(setorCol, unidadeSlug)
  ) {
    out.set(String(admin.id), {
      id: String(admin.id),
      nome: String(admin.nome ?? ''),
      role: String((admin as { role?: string }).role ?? ''),
      papel: 'admin_global',
    });
  }

  return Array.from(out.values());
}

async function carregarSubordinadosDoAdmin(
  supabase: ReturnType<typeof createAdminClient>,
  adminId: string,
  unidadeId: string | null
): Promise<AvaliadoRegra[]> {
  const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, adminId, unidadeId ?? '');
  return equipe
    .filter((c) => normalizePortalRole(c.role) === 'colaborador')
    .map((c) => ({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      role: String(c.role ?? 'colaborador'),
      papel: 'subordinado_admin' as const,
    }));
}

/** GET: líderes avaliáveis na unidade + estado da semana atual + aviso no último dia. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, nome, unidade_id, role, lider_id, setor, unidades(slug)')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    if (role !== 'colaborador' && role !== 'admin') {
      return NextResponse.json(
        { ok: false, erro: 'Avaliação disponível apenas para colaborador e administrador.' },
        { status: 403 }
      );
    }

    const uid = unidadeId || (eu as { unidade_id?: string }).unidade_id;
    if (!uid) {
      return NextResponse.json({ ok: false, erro: 'Unidade não definida' }, { status: 400 });
    }

    const semanaInicio = segundaSemanaSaoPaulo();
    const liderDiretoId = String((eu as { lider_id?: string | null }).lider_id ?? '') || null;
    const unidadeSlug = extrairUnidadeSlug(eu);
    const setorCol = (eu as { setor?: string | null }).setor ?? null;
    const avaliadosPermitidos =
      role === 'admin'
        ? await carregarSubordinadosDoAdmin(supabase, colaboradorId, uid ?? null)
        : await carregarAvaliadosPorRegra(supabase, colaboradorId, liderDiretoId, {
            setor: setorCol,
            unidadeSlug,
          });
    const ids = avaliadosPermitidos.map((l) => l.id);
    let jaAvaliados = new Set<string>();
    if (ids.length > 0) {
      const { data: rows } = await supabase
        .from('avaliacoes_lideranca')
        .select('avaliado_id')
        .eq('avaliador_id', colaboradorId)
        .eq('semana_inicio', semanaInicio)
        .in('avaliado_id', ids);
      jaAvaliados = new Set((rows ?? []).map((r) => r.avaliado_id as string));
    }

    const avaliados = avaliadosPermitidos.map((l) => ({
      id: l.id,
      nome: l.nome,
      role: l.role,
      role_label: roleLabel(l.role),
      papel: l.papel,
      papel_label: papelLabel(l.papel),
      ja_avaliado_esta_semana: jaAvaliados.has(l.id),
    }));

    const pendentes = avaliados.filter((a) => !a.ja_avaliado_esta_semana);
    const ultimoDiaSemana = hojeEhDomingoSaoPaulo();

    return NextResponse.json({
      ok: true,
      semana_inicio: semanaInicio,
      semana_fim: domingoSemanaSaoPaulo(),
      avaliados,
      labels: {
        n_exemplo: 'Exemplo e postura',
        n_comunicacao: 'Clareza na comunicação',
        n_suporte: 'Apoio e suporte técnico',
        n_justica: 'Justiça e feedback',
        n_clima: 'Clima e inteligência emocional',
      },
      help:
        role === 'admin'
          ? 'Administrador: avalie apenas seus subordinados diretos dos cargos operacionais permitidos (estoque, motorista e auxiliar administrativo). De 1 a 5. Identidade não exibida para o avaliado.'
          : 'Avaliação opcional para colaboradores. Você avalia cada chefe vinculado ao seu setor. Colaboradores de CD, Escritório, Motorista, Administração e RH também avaliam o administrador da empresa (Daniel). Uma avaliação por pessoa por semana. De 1 a 5. Anônima para o avaliado.',
      alerta_ultimo_dia: ultimoDiaSemana && pendentes.length > 0,
      pendentes_no_ultimo_dia: pendentes.length,
      avaliacao_opcional: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** POST: envia avaliação da semana. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const avaliadoId = typeof body.avaliado_id === 'string' ? body.avaliado_id.trim() : '';
  // Colaborador escolhe; padrão anônimo. O avaliador_id é sempre gravado (auditoria de sócio).
  const anonimo = body.anonimo !== false;
  const notas: Record<string, number> = {};
  for (const k of DIMENSOES) {
    const p = parseNota(body[k]);
    if (p === null) {
      return NextResponse.json({ ok: false, erro: `Nota inválida: ${k} (use 1 a 5)` }, { status: 400 });
    }
    notas[k] = p;
  }
  const temNotaBaixa = Object.values(notas).some((nota) => nota <= 3);
  const justificativaNotaBaixa = sanitizeJustificativa(body.justificativa_nota_baixa);

  if (!avaliadoId) {
    return NextResponse.json({ ok: false, erro: 'avaliado_id obrigatório' }, { status: 400 });
  }
  if (temNotaBaixa && justificativaNotaBaixa.length < 10) {
    return NextResponse.json(
      { ok: false, erro: 'Explique em poucas palavras o motivo da nota 3 ou menor.' },
      { status: 400 }
    );
  }
  if (justificativaNotaBaixa.length > 500) {
    return NextResponse.json(
      { ok: false, erro: 'Justificativa muito longa (máx. 500 caracteres).' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role, lider_id, setor, unidades(slug)')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    if (role !== 'colaborador' && role !== 'admin') {
      return NextResponse.json({ ok: false, erro: 'Apenas colaborador e administrador.' }, { status: 403 });
    }

    const uid = unidadeId || (eu as { unidade_id?: string }).unidade_id;
    const semanaInicio = segundaSemanaSaoPaulo();
    const liderDiretoId = String((eu as { lider_id?: string | null }).lider_id ?? '') || null;
    const unidadeSlug = extrairUnidadeSlug(eu);
    const setorCol = (eu as { setor?: string | null }).setor ?? null;
    const permitidos =
      role === 'admin'
        ? await carregarSubordinadosDoAdmin(supabase, colaboradorId, uid ?? null)
        : await carregarAvaliadosPorRegra(supabase, colaboradorId, liderDiretoId, {
            setor: setorCol,
            unidadeSlug,
          });
    const permitidosSet = new Set(permitidos.map((p) => p.id));
    if (!permitidosSet.has(avaliadoId)) {
      return NextResponse.json(
        { ok: false, erro: 'Este perfil não está na sua lista semanal de avaliação.' },
        { status: 403 }
      );
    }
    if (avaliadoId === colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Não é possível avaliar a si mesmo' }, { status: 400 });
    }

    const payloadNovo = {
      avaliador_id: colaboradorId,
      avaliado_id: avaliadoId,
      unidade_id: uid,
      semana_inicio: semanaInicio,
      anonimo,
      n_exemplo: notas.n_exemplo,
      n_comunicacao: notas.n_comunicacao,
      n_suporte: notas.n_suporte,
      n_justica: notas.n_justica,
      n_clima: notas.n_clima,
      justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa : null,
      // Compatibilidade com schema antigo (até migração completa).
      n_fala_escuta: notas.n_comunicacao,
      n_apoio: notas.n_suporte,
      n_ambiente: notas.n_clima,
      n_organizacao: notas.n_exemplo,
    };

    let { error: insErr } = await supabase.from('avaliacoes_lideranca').insert(payloadNovo);
    if (insErr && /column .*n_exemplo.*does not exist/i.test(insErr.message)) {
      const payloadLegado = {
        avaliador_id: colaboradorId,
        avaliado_id: avaliadoId,
        unidade_id: uid,
        semana_inicio: semanaInicio,
        anonimo,
        n_fala_escuta: notas.n_comunicacao,
        n_apoio: notas.n_suporte,
        n_ambiente: notas.n_clima,
        n_organizacao: notas.n_exemplo,
        justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa : null,
      };
      const retry = await supabase.from('avaliacoes_lideranca').insert(payloadLegado);
      insErr = retry.error;
    }

    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json(
          { ok: false, erro: 'Você já avaliou esta pessoa nesta semana.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, semana_inicio: semanaInicio });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
