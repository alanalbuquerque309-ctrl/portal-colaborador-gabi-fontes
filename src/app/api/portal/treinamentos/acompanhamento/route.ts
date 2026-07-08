import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  montarAcompanhamentoResumo,
  montarAcompanhamentoTreinamentos,
  montarDetalheAcompanhamentoItem,
  migration064TreinamentoPendente,
  itemAcompanhamentoParaResumo,
} from '@/lib/treinamento-acompanhamento';
import { authGestorTreinamento } from '@/lib/treinamento-gestao-auth';

/** Resumo ou detalhe de acompanhamento (gestão). */
export async function GET(req: Request) {
  const auth = await authGestorTreinamento();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const resumo = url.searchParams.get('resumo') !== '0';
  const escopoParam = url.searchParams.get('escopo');
  const escopo =
    escopoParam === 'anteriores' ? 'anteriores' : escopoParam === 'vigentes' ? 'vigentes' : 'vigentes';

  try {
    const supabase = createAdminClient();
    const migracao_064_pendente = await migration064TreinamentoPendente(supabase);

    if (resumo) {
      const { itens, ciclo_quinta_inicio, ciclo_quinta_rotulo } = await montarAcompanhamentoResumo(
        supabase,
        escopo
      );
      return NextResponse.json({
        ok: true,
        resumo: true,
        escopo,
        itens,
        vigentes: escopo === 'vigentes' ? itens : [],
        anteriores: escopo === 'anteriores' ? itens : [],
        ciclo_quinta_inicio,
        ciclo_quinta_rotulo,
        migracao_064_pendente,
      });
    }

    const acompanhamento = await montarAcompanhamentoTreinamentos(supabase, {
      escopo: escopo === 'anteriores' ? 'anteriores' : 'vigentes',
    });
    return NextResponse.json({
      ok: true,
      resumo: false,
      escopo,
      itens: acompanhamento.itens.map(itemAcompanhamentoParaResumo),
      vigentes: acompanhamento.vigentes.map(itemAcompanhamentoParaResumo),
      anteriores: acompanhamento.anteriores.map(itemAcompanhamentoParaResumo),
      ciclo_quinta_inicio: acompanhamento.ciclo_quinta_inicio,
      ciclo_quinta_rotulo: acompanhamento.ciclo_quinta_rotulo,
      migracao_064_pendente,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Nomes e listas completas de um treinamento (sob demanda). */
export async function POST(req: Request) {
  const auth = await authGestorTreinamento();
  if (!auth.ok) return auth.response;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = (body.id ?? '').trim();
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'Informe o id do treinamento.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const item = await montarDetalheAcompanhamentoItem(supabase, id);
    if (!item) {
      return NextResponse.json({ ok: false, erro: 'Treinamento não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
