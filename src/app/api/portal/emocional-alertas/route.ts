import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { canVisualizarAlertasEmocional } from '@/lib/emocional-alertas-access';
import { EMOCOES_ALERTA_GESTAO, metaEmocao } from '@/lib/emocional-opcoes';

function hojeLocalIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function authGestorEmocional() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const role = normalizePortalRole(cookieStore.get('portal_role')?.value);
  if (!colaboradorId || colaboradorId === 'pending') {
    return { erro: NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 }) };
  }
  if (!canVisualizarAlertasEmocional(role, colaboradorId)) {
    return { erro: NextResponse.json({ ok: false, erro: 'Sem permissão' }, { status: 403 }) };
  }
  return { colaboradorId, role };
}

/** Alertas do dia: colaboradores que marcaram emoção que pede atenção da gestão. */
export async function GET() {
  const auth = await authGestorEmocional();
  if ('erro' in auth && auth.erro) return auth.erro;
  const { colaboradorId } = auth as { colaboradorId: string };

  const hoje = hojeLocalIso();

  try {
    const supabase = createAdminClient();

    const { data: vistos, error: errVistos } = await supabase
      .from('emocional_alertas_vistos')
      .select('colaborador_id')
      .eq('viewer_colaborador_id', colaboradorId)
      .eq('data', hoje);

    if (errVistos) return NextResponse.json({ ok: false, erro: errVistos.message }, { status: 500 });

    const idsVistos = new Set((vistos ?? []).map((v) => String(v.colaborador_id)));

    const { data, error } = await supabase
      .from('emocional_registro')
      .select(
        'emocao, data, created_at, colaborador_id, colaboradores(nome, setor, unidades(nome))'
      )
      .eq('data', hoje)
      .in('emocao', [...EMOCOES_ALERTA_GESTAO])
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const alertas = (data ?? [])
      .filter((row) => !idsVistos.has(String((row as { colaborador_id?: string }).colaborador_id ?? '')))
      .map((row: Record<string, unknown>) => {
      const col = row.colaboradores as
        | { nome?: string; setor?: string | null; unidades?: { nome?: string } | { nome?: string }[] }
        | null;
      const un = col?.unidades;
      const unidadeNome = Array.isArray(un) ? un[0]?.nome : un?.nome;
      const meta = metaEmocao(String(row.emocao ?? ''));
      return {
        colaborador_id: String(row.colaborador_id ?? ''),
        nome: String(col?.nome ?? 'Colaborador'),
        setor: col?.setor ? String(col.setor) : null,
        unidade_nome: unidadeNome ? String(unidadeNome) : null,
        emocao: String(row.emocao ?? ''),
        emocao_label: meta?.label ?? String(row.emocao ?? ''),
        emoji: meta?.emoji ?? '⚠️',
        data: String(row.data ?? hoje),
        registrado_em: row.created_at ? String(row.created_at) : null,
      };
    });

    return NextResponse.json({
      ok: true,
      data_referencia: hoje,
      total: alertas.length,
      alertas,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Marca alertas do dia como vistos para quem clicou em OK (só some para esse gestor). */
export async function POST(req: Request) {
  const auth = await authGestorEmocional();
  if ('erro' in auth && auth.erro) return auth.erro;
  const { colaboradorId: viewerId } = auth as { colaboradorId: string };

  const hoje = hojeLocalIso();
  let body: { colaborador_ids?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const idsBody = Array.isArray(body.colaborador_ids)
    ? body.colaborador_ids.map((id) => String(id).trim()).filter(Boolean)
    : [];

  try {
    const supabase = createAdminClient();

    let idsMarcar = idsBody;
    if (idsMarcar.length === 0) {
      const { data: registros, error: errReg } = await supabase
        .from('emocional_registro')
        .select('colaborador_id')
        .eq('data', hoje)
        .in('emocao', [...EMOCOES_ALERTA_GESTAO]);
      if (errReg) return NextResponse.json({ ok: false, erro: errReg.message }, { status: 500 });
      idsMarcar = (registros ?? []).map((r) => String(r.colaborador_id));
    }

    if (idsMarcar.length === 0) {
      return NextResponse.json({ ok: true, marcados: 0 });
    }

    const rows = idsMarcar.map((colaborador_id) => ({
      viewer_colaborador_id: viewerId,
      colaborador_id,
      data: hoje,
    }));

    const { error } = await supabase.from('emocional_alertas_vistos').upsert(rows, {
      onConflict: 'viewer_colaborador_id,colaborador_id,data',
      ignoreDuplicates: true,
    });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, marcados: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
