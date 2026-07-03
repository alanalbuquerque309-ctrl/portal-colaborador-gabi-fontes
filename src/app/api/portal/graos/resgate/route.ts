import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole, podeParticiparGraosCafe } from '@/lib/roles';
import { buscarItensCatalogoGraosPorIds, complementoCentavosResgate } from '@/lib/graos/catalogo';
import { calcularSaldoGraos, debitarResgateGraos } from '@/lib/graos/movimentos';
import {
  avaliarElegibilidadeResgateSairCedo,
  itemCatalogoEhSairCedo,
} from '@/lib/graos/resgate-sair-cedo-elegibilidade';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function gerarCodigoResgate(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/** Confirma carrinho de resgate (irreversível). */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  let body: { itens?: Array<{ catalogo_id: string; quantidade?: number }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }

  const linhas = (body.itens ?? []).filter((i) => i.catalogo_id && (i.quantidade ?? 1) > 0);
  if (linhas.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Selecione ao menos um item.' }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('role, nome, tipo_escala')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (
      !colab ||
      !podeParticiparGraosCafe((colab as { role?: string }).role, {
        tipo_escala: (colab as { tipo_escala?: string | null }).tipo_escala,
      })
    ) {
      return NextResponse.json({ ok: false, erro: 'Apenas colaboradores podem resgatar.' }, { status: 403, headers: NO_STORE });
    }

    const ids = Array.from(new Set(linhas.map((l) => l.catalogo_id)));
    const porId = await buscarItensCatalogoGraosPorIds(supabase, ids);
    const itensResgate: Array<{ catalogo_id: string; nome: string; graos: number; qtd: number }> = [];
    let totalGraos = 0;
    let pedeSairCedo = false;

    for (const linha of linhas) {
      const item = porId.get(linha.catalogo_id);
      if (!item || !item.ativo) {
        return NextResponse.json({ ok: false, erro: 'Item inválido ou indisponível.' }, { status: 400, headers: NO_STORE });
      }
      if (itemCatalogoEhSairCedo(String(item.nome))) pedeSairCedo = true;
      const qtd = Math.min(10, Math.max(1, linha.quantidade ?? 1));
      const sub = item.graos * qtd;
      totalGraos += sub;
      itensResgate.push({
        catalogo_id: item.id,
        nome: item.nome,
        graos: item.graos,
        qtd,
      });
    }

    if (pedeSairCedo) {
      const elegSairCedo = await avaliarElegibilidadeResgateSairCedo(supabase, colaboradorId);
      if (!elegSairCedo.elegivel) {
        return NextResponse.json(
          { ok: false, erro: elegSairCedo.motivo ?? 'Sair 1h mais cedo não disponível para seu desempenho neste mês.' },
          { status: 403, headers: NO_STORE }
        );
      }
    }

    const saldo = await calcularSaldoGraos(supabase, colaboradorId);
    const complementoGraos = Math.max(0, totalGraos - saldo.confirmado);
    const graosDebitados = totalGraos - complementoGraos;
    const complementoCentavos = complementoCentavosResgate(complementoGraos);

    const codigo = gerarCodigoResgate();
    const resgateId = crypto.randomUUID();

    if (graosDebitados > 0) {
      const deb = await debitarResgateGraos(supabase, {
        colaboradorId,
        totalGraos: graosDebitados,
        refKey: `resgate:${resgateId}`,
        resgateId,
      });
      if (!deb.ok) {
        return NextResponse.json({ ok: false, erro: deb.erro }, { status: 400, headers: NO_STORE });
      }
    }

    const { error: errRes } = await supabase.from('graos_resgates').insert({
      id: resgateId,
      colaborador_id: colaboradorId,
      codigo,
      total_graos: graosDebitados,
      complemento_centavos: complementoCentavos,
      itens: itensResgate,
    });

    if (errRes) {
      return NextResponse.json({ ok: false, erro: errRes.message }, { status: 500, headers: NO_STORE });
    }

    return NextResponse.json(
      {
        ok: true,
        codigo,
        colaborador_nome: String((colab as { nome?: string }).nome ?? ''),
        total_graos: graosDebitados,
        complemento_centavos: complementoCentavos,
        itens: itensResgate,
        mensagem:
          complementoCentavos > 0
            ? `Mostre o código ao gerente. Complemento em dinheiro no caixa: R$ ${(complementoCentavos / 100).toFixed(2).replace('.', ',')}.`
            : 'Mostre o código ao gerente para validar na cafeteria.',
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
