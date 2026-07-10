import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolverSessaoChecklist, unidadeIdParam } from '@/lib/checklists/auth-sessao';
import { podeAcessarChecklistsOperacionais } from '@/lib/checklists/access';
import {
  templateChecklistPorTipo,
  templateVisivelParaUnidade,
  tiposChecklistValidos,
} from '@/lib/checklists/templates';
import {
  buscarChecklistSlot,
  normalizarRespostas,
  salvarChecklistSlot,
} from '@/lib/checklists/service';
import {
  listarSlotsDia,
  mesclarRespostasChecklist,
  outroTurno,
  particionarRespostasMultiTurno,
  pendenciasOutroTurnoParaFormulario,
} from '@/lib/checklists/publicacao';
import { diaSemanaOperacionalSaoPaulo, rotuloDiaSemana, rotuloTurno } from '@/lib/checklists/dia-semana';
import type { ChecklistTurno, ChecklistTipo } from '@/lib/checklists/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function turnoValido(v: string | null): v is ChecklistTurno {
  return v === 'manha' || v === 'tarde';
}

export async function GET(req: Request, ctx: { params: { tipo: string } }) {
  const auth = await resolverSessaoChecklist();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }
  if (!podeAcessarChecklistsOperacionais(auth.sessao.role)) {
    return NextResponse.json({ ok: false, erro: 'Acesso negado.' }, { status: 403, headers: NO_STORE });
  }

  const tipo = ctx.params.tipo?.trim();
  if (!tipo || !tiposChecklistValidos().includes(tipo as ChecklistTipo)) {
    return NextResponse.json({ ok: false, erro: 'Checklist inválido.' }, { status: 400, headers: NO_STORE });
  }

  const url = new URL(req.url);
  const turnoParam = url.searchParams.get('turno');
  const unidadeId = unidadeIdParam(auth.sessao, url.searchParams.get('unidade_id'));

  if (!turnoValido(turnoParam)) {
    return NextResponse.json({ ok: false, erro: 'Informe turno=manha ou turno=tarde.' }, { status: 400, headers: NO_STORE });
  }
  if (!unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Informe a unidade.' }, { status: 400, headers: NO_STORE });
  }

  const template = templateChecklistPorTipo(tipo);
  if (!template) {
    return NextResponse.json({ ok: false, erro: 'Modelo não encontrado.' }, { status: 404, headers: NO_STORE });
  }

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
    if (!templateVisivelParaUnidade(template, slug)) {
      return NextResponse.json(
        { ok: false, erro: 'Este checklist não se aplica a esta unidade.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const dia = diaSemanaOperacionalSaoPaulo();
    const registro = await buscarChecklistSlot(supabase, {
      unidadeId,
      tipo: template.tipo,
      turno: turnoParam,
      diaSemana: dia,
    });

    const slotsDia = await listarSlotsDia(supabase, {
      unidadeId,
      tipo: template.tipo,
      diaSemana: dia,
    });
    const pendenciasOutroTurno = pendenciasOutroTurnoParaFormulario(template, turnoParam, slotsDia);

    const respostasForm =
      registro?.respostas ??
      mesclarRespostasChecklist(
        ...slotsDia.filter((s) => s.turno !== turnoParam).map((s) => s.respostas)
      );

    return NextResponse.json(
      {
        ok: true,
        template,
        unidade: {
          id: unidadeId,
          nome: String((unidade as { nome?: string }).nome ?? ''),
          slug,
        },
        turno: turnoParam,
        turno_rotulo: rotuloTurno(turnoParam),
        dia_semana: dia,
        dia_semana_rotulo: rotuloDiaSemana(dia),
        registro,
        pendencias_outro_turno: pendenciasOutroTurno,
        respostas_sugeridas: respostasForm,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(req: Request, ctx: { params: { tipo: string } }) {
  const auth = await resolverSessaoChecklist();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }
  if (!podeAcessarChecklistsOperacionais(auth.sessao.role)) {
    return NextResponse.json({ ok: false, erro: 'Acesso negado.' }, { status: 403, headers: NO_STORE });
  }

  const tipo = ctx.params.tipo?.trim();
  if (!tipo || !tiposChecklistValidos().includes(tipo as ChecklistTipo)) {
    return NextResponse.json({ ok: false, erro: 'Checklist inválido.' }, { status: 400, headers: NO_STORE });
  }

  let body: {
    unidade_id?: string;
    turno?: string;
    respostas?: unknown;
    observacoes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido.' }, { status: 400, headers: NO_STORE });
  }

  const turno = body.turno?.trim() ?? '';
  if (!turnoValido(turno)) {
    return NextResponse.json({ ok: false, erro: 'Turno inválido.' }, { status: 400, headers: NO_STORE });
  }

  const unidadeId = unidadeIdParam(auth.sessao, body.unidade_id);
  if (!unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Informe a unidade.' }, { status: 400, headers: NO_STORE });
  }

  const template = templateChecklistPorTipo(tipo);
  if (!template) {
    return NextResponse.json({ ok: false, erro: 'Modelo não encontrado.' }, { status: 404, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: unidade } = await supabase
      .from('unidades')
      .select('id, slug')
      .eq('id', unidadeId)
      .maybeSingle();

    if (!unidade) {
      return NextResponse.json({ ok: false, erro: 'Unidade não encontrada.' }, { status: 404, headers: NO_STORE });
    }

    const slug = String((unidade as { slug?: string }).slug ?? '');
    if (!templateVisivelParaUnidade(template, slug)) {
      return NextResponse.json(
        { ok: false, erro: 'Este checklist não se aplica a esta unidade.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const dia = diaSemanaOperacionalSaoPaulo();
    // Rascunho: permite itens incompletos / pendente sem justificativa ainda.
    // Justificativa obrigatória só na publicação (rota /publicar).
    const respostas = normalizarRespostas(template.tipo, body.respostas);
    const observacoes =
      typeof body.observacoes === 'string' && body.observacoes.trim() ? body.observacoes.trim() : null;

    const particoes = particionarRespostasMultiTurno(template, turno, respostas);
    const outro = outroTurno(turno);
    const patchOutro = particoes[outro];
    const temPatchOutro = Object.keys(patchOutro.status_itens).length > 0;

    if (temPatchOutro) {
      await salvarChecklistSlot(supabase, {
        unidadeId,
        tipo: template.tipo,
        turno: outro,
        diaSemana: dia,
        colaboradorId: auth.sessao.colaboradorId,
        respostas: patchOutro,
        observacoes: null,
        mesclarComExistente: true,
      });
    }

    const registro = await salvarChecklistSlot(supabase, {
      unidadeId,
      tipo: template.tipo,
      turno,
      diaSemana: dia,
      colaboradorId: auth.sessao.colaboradorId,
      respostas: particoes[turno],
      observacoes,
      mesclarComExistente: true,
    });

    return NextResponse.json(
      {
        ok: true,
        mensagem: `Rascunho salvo para ${rotuloDiaSemana(dia)} (${rotuloTurno(turno)}). A liderança só vê depois de Publicar.`,
        registro,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
