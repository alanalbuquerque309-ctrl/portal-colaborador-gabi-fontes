import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';

const DIMENSOES = ['n_fala_escuta', 'n_apoio', 'n_ambiente', 'n_organizacao'] as const;

function parseNota(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

/** GET: líderes avaliáveis na unidade + estado da semana atual. */
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
      .select('id, nome, unidade_id, role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = String((eu as { role?: string }).role || '').toLowerCase();
    if (role !== 'colaborador') {
      return NextResponse.json(
        { ok: false, erro: 'Avaliação da liderança é apenas para colaboradores' },
        { status: 403 }
      );
    }

    const uid = unidadeId || (eu as { unidade_id?: string }).unidade_id;
    if (!uid) {
      return NextResponse.json({ ok: false, erro: 'Unidade não definida' }, { status: 400 });
    }

    const semanaInicio = segundaSemanaSaoPaulo();

    const { data: lideres, error: errLid } = await supabase
      .from('colaboradores')
      .select('id, nome, role')
      .eq('unidade_id', uid)
      .in('role', ['gerente', 'master', 'admin'])
      .neq('id', colaboradorId)
      .order('nome');

    if (errLid) {
      return NextResponse.json({ ok: false, erro: errLid.message }, { status: 500 });
    }

    const ids = (lideres ?? []).map((l) => l.id as string);
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

    const avaliados = (lideres ?? []).map((l) => ({
      id: l.id as string,
      nome: String(l.nome ?? ''),
      role: String((l as { role?: string }).role ?? ''),
      ja_avaliado_esta_semana: jaAvaliados.has(l.id as string),
    }));

    return NextResponse.json({
      ok: true,
      semana_inicio: semanaInicio,
      avaliados,
      labels: {
        n_fala_escuta: 'Fala e escuta',
        n_apoio: 'Apoio no dia a dia',
        n_ambiente: 'Ambiente e respeito',
        n_organizacao: 'Organização e materiais',
      },
      help: 'De 1 (precisa melhorar) a 5 (excelente). Uma avaliação por pessoa por semana.',
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
  const anonimo = body.anonimo === true;
  const notas: Record<string, number> = {};
  for (const k of DIMENSOES) {
    const p = parseNota(body[k]);
    if (p === null) {
      return NextResponse.json({ ok: false, erro: `Nota inválida: ${k} (use 1 a 5)` }, { status: 400 });
    }
    notas[k] = p;
  }

  if (!avaliadoId) {
    return NextResponse.json({ ok: false, erro: 'avaliado_id obrigatório' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = String((eu as { role?: string }).role || '').toLowerCase();
    if (role !== 'colaborador') {
      return NextResponse.json({ ok: false, erro: 'Apenas colaboradores' }, { status: 403 });
    }

    const uid = unidadeId || (eu as { unidade_id?: string }).unidade_id;
    const semanaInicio = segundaSemanaSaoPaulo();

    const { data: alvo, error: errAlvo } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role')
      .eq('id', avaliadoId)
      .single();

    if (errAlvo || !alvo) {
      return NextResponse.json({ ok: false, erro: 'Líder não encontrado' }, { status: 404 });
    }

    const roleAlvo = String((alvo as { role?: string }).role || '').toLowerCase();
    if (!['gerente', 'master', 'admin'].includes(roleAlvo)) {
      return NextResponse.json(
        { ok: false, erro: 'Avalie apenas gerentes ou equipe administrativa da unidade.' },
        { status: 400 }
      );
    }
    if ((alvo as { unidade_id?: string }).unidade_id !== uid) {
      return NextResponse.json({ ok: false, erro: 'Avaliado deve ser da mesma unidade' }, { status: 400 });
    }
    if (avaliadoId === colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Não é possível avaliar a si mesmo' }, { status: 400 });
    }

    const { error: insErr } = await supabase.from('avaliacoes_lideranca').insert({
      avaliador_id: colaboradorId,
      avaliado_id: avaliadoId,
      unidade_id: uid,
      semana_inicio: semanaInicio,
      anonimo,
      n_fala_escuta: notas.n_fala_escuta,
      n_apoio: notas.n_apoio,
      n_ambiente: notas.n_ambiente,
      n_organizacao: notas.n_organizacao,
    });

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
