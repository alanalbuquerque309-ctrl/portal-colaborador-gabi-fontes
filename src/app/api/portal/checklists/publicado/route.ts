import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolverSessaoChecklist, unidadeIdParam } from '@/lib/checklists/auth-sessao';
import { podeAcessarChecklistsOperacionais } from '@/lib/checklists/access';
import {
  templateChecklistPorTipo,
  templateVisivelParaUnidade,
  tiposChecklistValidos,
  todosIdsItensTurno,
} from '@/lib/checklists/templates';
import {
  buscarExibicaoPublicada,
  listarHistoricoPublicado7Dias,
  listarSlotsDia,
} from '@/lib/checklists/publicacao';
import { contagemStatusItens } from '@/lib/checklists/service';
import {
  dataOperacionalSaoPaulo,
  rotuloDataChecklist,
  rotuloTurno,
} from '@/lib/checklists/dia-semana';
import type { ChecklistTipo } from '@/lib/checklists/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Checklist publicado + histórico dos últimos 7 dias (janela rolante). */
export async function GET(req: Request) {
  const auth = await resolverSessaoChecklist();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }
  if (!podeAcessarChecklistsOperacionais(auth.sessao.role)) {
    return NextResponse.json({ ok: false, erro: 'Acesso negado.' }, { status: 403, headers: NO_STORE });
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get('tipo')?.trim() ?? 'gerencia_diaria_mesquita';
  const unidadeId = unidadeIdParam(auth.sessao, url.searchParams.get('unidade_id'));

  if (!tiposChecklistValidos().includes(tipo as ChecklistTipo)) {
    return NextResponse.json({ ok: false, erro: 'Checklist inválido.' }, { status: 400, headers: NO_STORE });
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
      return NextResponse.json({ ok: false, erro: 'Checklist não disponível para esta unidade.' }, { status: 403 });
    }

    const dataHoje = dataOperacionalSaoPaulo();
    const exibicao = await buscarExibicaoPublicada(supabase, {
      unidadeId,
      tipo: template.tipo,
    });
    const historico = await listarHistoricoPublicado7Dias(supabase, {
      unidadeId,
      tipo: template.tipo,
    });

    const slotsHoje = await listarSlotsDia(supabase, {
      unidadeId,
      tipo: template.tipo,
      dataReferencia: dataHoje,
    });
    const rascunhos = slotsHoje
      .filter((s) => !s.publicado_em)
      .map((s) => {
        const ids = todosIdsItensTurno(template, s.turno);
        const c = contagemStatusItens(s.respostas.status_itens ?? {}, ids);
        return {
          turno: s.turno,
          turno_rotulo: rotuloTurno(s.turno),
          colaborador_nome: s.colaborador_nome ?? null,
          updated_at: s.updated_at,
          ok: c.ok,
          pendente: c.pendente,
          respondidos: c.respondidos,
          total: c.total,
        };
      });

    const hojePublicado = Boolean(exibicao?.eh_hoje);

    return NextResponse.json(
      {
        ok: true,
        template: {
          tipo: template.tipo,
          titulo: template.titulo,
          descricao: template.descricao,
          secoes: template.secoes,
        },
        unidade: {
          id: unidadeId,
          nome: String((unidade as { nome?: string }).nome ?? ''),
          slug,
        },
        data_hoje: dataHoje,
        dia_hoje_rotulo: rotuloDataChecklist(dataHoje),
        hoje_publicado: hojePublicado,
        publicado: exibicao
          ? {
              data_referencia: exibicao.data_referencia,
              dia_semana: exibicao.dia_semana,
              dia_semana_rotulo: rotuloDataChecklist(exibicao.data_referencia),
              eh_hoje: exibicao.eh_hoje,
              publicado_em: exibicao.publicado_em,
              publicado_por_nome: exibicao.publicado_por_nome,
              respostas: exibicao.respostas,
              ok: exibicao.ok,
              pendente: exibicao.pendente,
              total: exibicao.total,
              turnos_publicados: exibicao.registros.map((r) => ({
                turno: r.turno,
                publicado_em: r.publicado_em,
                publicado_por_nome: r.publicado_por_nome,
              })),
            }
          : null,
        historico: historico.map((h) => ({
          data_referencia: h.data_referencia,
          dia_semana_rotulo: rotuloDataChecklist(h.data_referencia),
          publicado_em: h.publicado_em,
          publicado_por_nome: h.publicado_por_nome,
          ok: h.ok,
          pendente: h.pendente,
          total: h.total,
          eh_hoje: h.eh_hoje,
          respostas: h.respostas,
        })),
        rascunhos,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
