import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolverSessaoChecklist } from '@/lib/checklists/auth-sessao';
import { podeAcessarChecklistsOperacionais } from '@/lib/checklists/access';
import { configSetorVistoria } from '@/lib/checklists/setores-vistoria';
import type { ChecklistSetorVistoria, ChecklistVistoriaStatus } from '@/lib/checklists/types';
import { diaSemanaOperacionalSaoPaulo, rotuloDiaSemana } from '@/lib/checklists/dia-semana';
import { listarVistoriaSetoresDia, salvarVistoriaSetor } from '@/lib/checklists/vistoria-service';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const SETORES_VALIDOS = new Set<string>(['estoque', 'asg', 'cozinha', 'balcao', 'caixa']);

/** Painel de vistoria: status dos checklists dos setores no dia. */
export async function GET(req: Request) {
  const auth = await resolverSessaoChecklist();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }

  if (!podeAcessarChecklistsOperacionais(auth.sessao.role)) {
    return NextResponse.json(
      { ok: false, erro: 'Use o painel admin para consultar checklists da rede.' },
      { status: 403, headers: NO_STORE }
    );
  }

  const url = new URL(req.url);
  const unidadeId = (url.searchParams.get('unidade_id') ?? auth.sessao.unidadeId ?? '').trim();
  if (!unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Informe a unidade.' }, { status: 400, headers: NO_STORE });
  }

  const dia = diaSemanaOperacionalSaoPaulo();

  try {
    const supabase = createAdminClient();
    const { data: unidade } = await supabase
      .from('unidades')
      .select('id, nome, slug')
      .eq('id', unidadeId)
      .maybeSingle();

    if (!unidade) {
      return NextResponse.json({ ok: false, erro: 'Unidade não encontrada.' }, { status: 404, headers: NO_STORE });
    }

    const slug = String((unidade as { slug?: string }).slug ?? '');
    if (slug !== 'mesquita') {
      return NextResponse.json(
        { ok: false, erro: 'Vistoria de setores disponível só no piloto Mesquita.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const setores = await listarVistoriaSetoresDia(supabase, { unidadeId, diaSemana: dia });

    return NextResponse.json(
      {
        ok: true,
        dia_semana: dia,
        dia_semana_rotulo: rotuloDiaSemana(dia),
        unidade: {
          id: unidadeId,
          nome: String((unidade as { nome?: string }).nome ?? ''),
          slug,
        },
        setores,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}

/** Gerência marca conferência de um setor. */
export async function POST(req: Request) {
  const auth = await resolverSessaoChecklist();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }

  if (!podeAcessarChecklistsOperacionais(auth.sessao.role)) {
    return NextResponse.json({ ok: false, erro: 'Sem permissão.' }, { status: 403, headers: NO_STORE });
  }

  let body: { unidade_id?: string; setor?: string; status?: string; observacoes?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const unidadeId = (body.unidade_id ?? auth.sessao.unidadeId ?? '').trim();
  const setor = (body.setor ?? '').trim();
  const status = (body.status ?? 'conferido').trim() as ChecklistVistoriaStatus;
  const observacoes = typeof body.observacoes === 'string' ? body.observacoes.trim() || null : null;

  if (!unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Informe a unidade.' }, { status: 400, headers: NO_STORE });
  }
  if (!SETORES_VALIDOS.has(setor)) {
    return NextResponse.json({ ok: false, erro: 'Setor inválido.' }, { status: 400, headers: NO_STORE });
  }
  if (status !== 'conferido' && status !== 'pendente') {
    return NextResponse.json({ ok: false, erro: 'Status inválido.' }, { status: 400, headers: NO_STORE });
  }

  const cfg = configSetorVistoria(setor);
  if (!cfg) {
    return NextResponse.json({ ok: false, erro: 'Setor não configurado.' }, { status: 400, headers: NO_STORE });
  }

  const dia = diaSemanaOperacionalSaoPaulo();

  try {
    const supabase = createAdminClient();
    const colaboradorId = auth.sessao.colaboradorId;
    if (!colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Sessão sem colaborador.' }, { status: 401, headers: NO_STORE });
    }

    const registro = await salvarVistoriaSetor(supabase, {
      unidadeId,
      setor: setor as ChecklistSetorVistoria,
      diaSemana: dia,
      colaboradorId,
      status,
      observacoes,
      tipoChecklist: cfg.tipo_checklist,
    });

    return NextResponse.json(
      {
        ok: true,
        mensagem: status === 'conferido' ? `${cfg.label} conferido.` : `${cfg.label} marcado como pendência.`,
        registro,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
