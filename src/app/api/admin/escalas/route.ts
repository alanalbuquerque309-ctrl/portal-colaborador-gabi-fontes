import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  hojeIsoOperacao,
  listarEscalasPortalColaborador,
  primeiroDiaMesIso,
  ultimoDiaMesIso,
} from '@/lib/escala-portal';

function situacaoDia(observacao: string | null, entrada: string, saida: string): 'folga' | 'trabalho' {
  const obs = String(observacao ?? '').toLowerCase();
  if (obs.includes('folga') || (entrada === '00:00' && saida === '00:00')) return 'folga';
  return 'trabalho';
}

function parseMesReferencia(mes: string | null): { de: string; ate: string; label: string } {
  const hoje = hojeIsoOperacao();
  const ref = (mes ?? hoje.slice(0, 7)).trim();
  const m = /^(\d{4})-(\d{2})$/.exec(ref);
  if (!m) {
    const de = primeiroDiaMesIso(hoje);
    return { de, ate: ultimoDiaMesIso(de), label: de.slice(0, 7) };
  }
  const de = `${m[1]}-${m[2]}-01`;
  return { de, ate: ultimoDiaMesIso(de), label: `${m[1]}-${m[2]}` };
}

type ColabRow = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_nome: string;
  unidade_slug: string;
};

/** Lista escalas do mês com filtros (unidade, setor, colaborador). */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const colaboradorId = searchParams.get('colaborador_id')?.trim() || '';
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() || '';
  const setor = searchParams.get('setor')?.trim() || '';
  const incluirGeradas = searchParams.get('incluir_geradas') !== '0';
  const { de, ate, label: mesRef } = parseMesReferencia(searchParams.get('mes'));

  try {
    const supabase = createAdminClient();

    let colabQuery = supabase
      .from('colaboradores')
      .select('id, nome, setor, unidade_id, unidades(nome, slug)')
      .or('role.eq.colaborador,role.eq.admin,role.eq.gerente,role.eq.rh,role.eq.master,role.is.null')
      .order('nome');

    if (colaboradorId) colabQuery = colabQuery.eq('id', colaboradorId);
    if (setor) colabQuery = colabQuery.eq('setor', setor);

    const { data: colabsRaw, error: errColab } = await colabQuery;
    if (errColab) return NextResponse.json({ ok: false, erro: errColab.message }, { status: 500 });

    const colaboradores: ColabRow[] = (colabsRaw ?? [])
      .map((c: Record<string, unknown>) => {
        const un = c.unidades as { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
        const u = Array.isArray(un) ? un[0] : un;
        return {
          id: String(c.id ?? ''),
          nome: String(c.nome ?? ''),
          setor: (c.setor as string | null) ?? null,
          unidade_nome: String(u?.nome ?? ''),
          unidade_slug: String(u?.slug ?? ''),
        };
      })
      .filter((c) => !unidadeSlug || c.unidade_slug === unidadeSlug);

    if (colaboradores.length === 0) {
      return NextResponse.json({
        ok: true,
        mes: mesRef,
        periodo: { de, ate },
        escalas: [],
        total: 0,
      });
    }

    const ids = colaboradores.map((c) => c.id);
    const colabPorId = new Map(colaboradores.map((c) => [c.id, c]));

    const { data: rows, error } = await supabase
      .from('escalas')
      .select('id, data, hora_entrada, hora_saida, observacao, colaborador_id')
      .in('colaborador_id', ids)
      .gte('data', de)
      .lte('data', ate)
      .order('data', { ascending: true });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const porChave = new Map<string, Record<string, unknown>>();

    for (const e of rows ?? []) {
      const cid = String(e.colaborador_id);
      const data = String(e.data);
      const col = colabPorId.get(cid);
      if (!col) continue;
      porChave.set(`${cid}|${data}`, {
        id: String(e.id),
        data,
        colaborador_id: cid,
        colaborador_nome: col.nome,
        setor: col.setor,
        unidade_nome: col.unidade_nome,
        unidade_slug: col.unidade_slug,
        situacao: situacaoDia(
          (e.observacao as string | null) ?? null,
          String(e.hora_entrada ?? ''),
          String(e.hora_saida ?? '')
        ),
        fonte: 'banco',
      });
    }

    if (incluirGeradas && colaboradores.length <= 120) {
      for (const col of colaboradores) {
        const { escalas: geradas } = await listarEscalasPortalColaborador(supabase, col.id, {
          deIso: de,
          ateIso: ate,
        });
        for (const g of geradas) {
          const chave = `${col.id}|${g.data}`;
          if (porChave.has(chave)) continue;
          porChave.set(chave, {
            id: g.id,
            data: g.data,
            colaborador_id: col.id,
            colaborador_nome: col.nome,
            setor: col.setor,
            unidade_nome: col.unidade_nome,
            unidade_slug: col.unidade_slug,
            situacao: situacaoDia(g.observacao, g.hora_entrada, g.hora_saida),
            fonte: g.fonte,
          });
        }
      }
    }

    const escalas = Array.from(porChave.values()).sort((a, b) => {
      const da = String(a.data);
      const db = String(b.data);
      if (da !== db) return da.localeCompare(db);
      return String(a.colaborador_nome).localeCompare(String(b.colaborador_nome), 'pt-BR');
    });

    return NextResponse.json({
      ok: true,
      mes: mesRef,
      periodo: { de, ate },
      escalas,
      total: escalas.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Cria escala(s). Aceita array para cadastro em lote. */
export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: {
    escalas?: Array<{
      colaborador_id: string;
      data: string;
      hora_entrada: string;
      hora_saida: string;
      observacao?: string;
    }>;
    colaborador_id?: string;
    data?: string;
    hora_entrada?: string;
    hora_saida?: string;
    observacao?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const itens = body.escalas ?? (body.colaborador_id && body.data ? [body] : []);
  if (itens.length === 0) {
    return NextResponse.json(
      { ok: false, erro: 'Envie escalas ou colaborador_id, data, hora_entrada, hora_saida' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const payloads = itens.map((i) => ({
      colaborador_id: i.colaborador_id,
      data: i.data,
      hora_entrada: i.hora_entrada || '08:00',
      hora_saida: i.hora_saida || '14:00',
      observacao: i.observacao?.trim() || null,
    }));

    const { data, error } = await supabase
      .from('escalas')
      .upsert(payloads, {
        onConflict: 'colaborador_id,data',
      })
      .select('id');

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ids: (data ?? []).map((r) => r.id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
