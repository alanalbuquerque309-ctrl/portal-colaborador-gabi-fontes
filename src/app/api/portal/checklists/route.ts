import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolverSessaoChecklist } from '@/lib/checklists/auth-sessao';
import { checklistsLideresAtivos, podeAcessarChecklistsOperacionais } from '@/lib/checklists/access';
import { CHECKLIST_TEMPLATES, slugsUnidadesComChecklist, templateVisivelParaUnidade } from '@/lib/checklists/templates';
import { diaSemanaOperacionalSaoPaulo, rotuloDiaSemana } from '@/lib/checklists/dia-semana';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Lista modelos de checklist (sem histórico — carregar sob demanda). */
export async function GET() {
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

  const dia = diaSemanaOperacionalSaoPaulo();

  try {
    const supabase = createAdminClient();
    const { data: unidadesRaw } = await supabase
      .from('unidades')
      .select('id, nome, slug')
      .neq('slug', 'matriz')
      .order('nome');

    const slugsAtivos = slugsUnidadesComChecklist();
    let unidades = unidadesRaw ?? [];
    if (slugsAtivos.length > 0) {
      unidades = unidades.filter((u) => slugsAtivos.includes(String((u as { slug?: string }).slug ?? '')));
    }

    const templates = CHECKLIST_TEMPLATES.map((t) => ({
      tipo: t.tipo,
      titulo: t.titulo,
      descricao: t.descricao,
      turnos: t.turnos,
      exige_unidade_slug: t.exige_unidade_slug ?? [],
    }));

    return NextResponse.json(
      {
        ok: true,
        preview_socios: !checklistsLideresAtivos(),
        fase_piloto: slugsAtivos.length > 0,
        dia_semana: dia,
        dia_semana_rotulo: rotuloDiaSemana(dia),
        unidades,
        templates,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}

/** Histórico da semana (7 slots) — só quando solicitado. */
export async function POST(req: Request) {
  const auth = await resolverSessaoChecklist();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }

  let body: { unidade_id?: string; tipo?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const unidadeId = (body.unidade_id ?? auth.sessao.unidadeId ?? '').trim();
  if (!unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Informe a unidade.' }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { listarChecklistsSemana } = await import('@/lib/checklists/service');
    const tipo = body.tipo?.trim() || null;

    const { data: unidade } = await supabase
      .from('unidades')
      .select('id, nome, slug')
      .eq('id', unidadeId)
      .maybeSingle();

    if (!unidade) {
      return NextResponse.json({ ok: false, erro: 'Unidade não encontrada.' }, { status: 404, headers: NO_STORE });
    }

    const slug = String((unidade as { slug?: string }).slug ?? '');
    let registros = await listarChecklistsSemana(supabase, { unidadeId, tipo });

    if (tipo) {
      const template = CHECKLIST_TEMPLATES.find((t) => t.tipo === tipo);
      if (template && !templateVisivelParaUnidade(template, slug)) {
        registros = [];
      }
    } else {
      registros = registros.filter((r) => {
        const template = CHECKLIST_TEMPLATES.find((t) => t.tipo === r.tipo);
        return template ? templateVisivelParaUnidade(template, slug) : true;
      });
    }

    return NextResponse.json(
      {
        ok: true,
        unidade: {
          id: unidadeId,
          nome: String((unidade as { nome?: string }).nome ?? ''),
          slug,
        },
        registros,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
