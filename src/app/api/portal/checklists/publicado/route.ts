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
import { buscarExibicaoPublicada, listarSlotsDia } from '@/lib/checklists/publicacao';
import { contagemStatusItens } from '@/lib/checklists/service';
import { diaSemanaOperacionalSaoPaulo, rotuloDiaSemana, rotuloTurno } from '@/lib/checklists/dia-semana';
import type { ChecklistTipo } from '@/lib/checklists/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Checklist publicado visível no portal (última publicação da loja). */
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

    const exibicao = await buscarExibicaoPublicada(supabase, {
      unidadeId,
      tipo: template.tipo,
    });

    const diaHoje = diaSemanaOperacionalSaoPaulo();
    const slotsHoje = await listarSlotsDia(supabase, {
      unidadeId,
      tipo: template.tipo,
      diaSemana: diaHoje,
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
        publicado: exibicao
          ? {
              dia_semana: exibicao.dia_semana,
              dia_semana_rotulo: rotuloDiaSemana(exibicao.dia_semana),
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
        rascunhos,
        dia_hoje_rotulo: rotuloDiaSemana(diaHoje),
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
