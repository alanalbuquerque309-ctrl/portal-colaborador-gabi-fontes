import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authGestorEmocional } from '@/lib/emocional-gestao-auth';
import { alertasEmocionalEscopoRede } from '@/lib/emocional-alertas-access';
import { EMOCOES_ALERTA_GESTAO, metaEmocao } from '@/lib/emocional-opcoes';
import { dataCivilBr } from '@/lib/data-civil-br';
import { listarEquipeDoLider } from '@/lib/colaborador-lideres';
import { normalizePortalRole } from '@/lib/roles';

type AckLider = {
  viewer_id: string;
  viewer_nome: string;
  visto_em: string | null;
};

/** Alertas do dia: colaboradores que marcaram emoção que pede atenção da gestão. */
export async function GET() {
  const auth = await authGestorEmocional();
  if (!auth.ok) return auth.response;
  const { colaboradorId, role } = auth;

  const hoje = dataCivilBr();
  const escopoRede = alertasEmocionalEscopoRede(role, colaboradorId);

  try {
    const supabase = createAdminClient();

    /** Líder: só colaboradores dos seus setores (mesma lógica da avaliação). */
    let idsEquipeLider: Set<string> | null = null;
    if (!escopoRede) {
      try {
        const equipe = await listarEquipeDoLider(supabase, colaboradorId);
        idsEquipeLider = new Set(equipe.map((m) => m.id));
      } catch {
        idsEquipeLider = new Set();
      }
    }

    const { data: vistos, error: errVistos } = await supabase
      .from('emocional_alertas_vistos')
      .select('colaborador_id')
      .eq('viewer_colaborador_id', colaboradorId)
      .eq('data', hoje);

    if (errVistos) return NextResponse.json({ ok: false, erro: errVistos.message }, { status: 500 });

    const idsVistos = new Set((vistos ?? []).map((v) => String(v.colaborador_id)));

    const selects = [
      'emocao, motivo, data, created_at, colaborador_id, colaboradores(nome, setor, unidade_id, unidades(nome))',
      'emocao, data, created_at, colaborador_id, colaboradores(nome, setor, unidade_id, unidades(nome))',
    ] as const;

    let data: Record<string, unknown>[] | null = null;
    let error: { message: string } | null = null;

    for (const sel of selects) {
      const res = await supabase
        .from('emocional_registro')
        .select(sel)
        .eq('data', hoje)
        .in('emocao', [...EMOCOES_ALERTA_GESTAO])
        .order('created_at', { ascending: false });
      if (!res.error) {
        data = (res.data ?? []) as unknown as Record<string, unknown>[];
        error = null;
        break;
      }
      error = res.error;
      if (!/motivo|column .* does not exist|schema cache/i.test(res.error.message)) break;
    }

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const candidatos = (data ?? []).filter((row) => {
      const cid = String((row as { colaborador_id?: string }).colaborador_id ?? '');
      if (!cid || idsVistos.has(cid)) return false;
      if (idsEquipeLider) return idsEquipeLider.has(cid);
      return true;
    });

    const idsAlertas = candidatos.map((row) => String((row as { colaborador_id?: string }).colaborador_id));

    /** Para RH/admin/sócio: quem da liderança já deu OK (conversou). */
    const ackPorColaborador = new Map<string, AckLider[]>();
    if (escopoRede && idsAlertas.length > 0) {
      let vistosLideres: Array<{
        colaborador_id?: string;
        viewer_colaborador_id?: string;
        created_at?: string | null;
      }> | null = null;

      const q1 = await supabase
        .from('emocional_alertas_vistos')
        .select('colaborador_id, viewer_colaborador_id, created_at')
        .eq('data', hoje)
        .in('colaborador_id', idsAlertas)
        .neq('viewer_colaborador_id', colaboradorId);

      if (!q1.error) {
        vistosLideres = q1.data;
      } else {
        const q2 = await supabase
          .from('emocional_alertas_vistos')
          .select('colaborador_id, viewer_colaborador_id')
          .eq('data', hoje)
          .in('colaborador_id', idsAlertas)
          .neq('viewer_colaborador_id', colaboradorId);
        vistosLideres = q2.error ? [] : q2.data;
      }

      const viewerIds = Array.from(
        new Set((vistosLideres ?? []).map((v) => String(v.viewer_colaborador_id)).filter(Boolean))
      );

      if (viewerIds.length > 0) {
        const { data: viewers } = await supabase
          .from('colaboradores')
          .select('id, nome, role')
          .in('id', viewerIds);

        const viewerMeta = new Map(
          (viewers ?? []).map((v) => [
            String(v.id),
            {
              nome: String(v.nome ?? 'Líder'),
              role: normalizePortalRole((v as { role?: string }).role),
            },
          ])
        );

        for (const row of vistosLideres ?? []) {
          const cid = String(row.colaborador_id);
          const vid = String(row.viewer_colaborador_id);
          const meta = viewerMeta.get(vid);
          if (!meta) continue;
          if (meta.role !== 'gerente' && meta.role !== 'master') continue;
          const lista = ackPorColaborador.get(cid) ?? [];
          lista.push({
            viewer_id: vid,
            viewer_nome: meta.nome,
            visto_em: row.created_at ? String(row.created_at) : null,
          });
          ackPorColaborador.set(cid, lista);
        }
      }
    }

    const alertas = candidatos.map((row: Record<string, unknown>) => {
      const col = row.colaboradores as
        | {
            nome?: string;
            setor?: string | null;
            unidade_id?: string;
            unidades?: { nome?: string } | { nome?: string }[];
          }
        | null;
      const un = col?.unidades;
      const unidadeNome = Array.isArray(un) ? un[0]?.nome : un?.nome;
      const meta = metaEmocao(String(row.emocao ?? ''));
      const cid = String(row.colaborador_id ?? '');
      const ack = ackPorColaborador.get(cid) ?? [];
      return {
        colaborador_id: cid,
        nome: String(col?.nome ?? 'Colaborador'),
        setor: col?.setor ? String(col.setor) : null,
        unidade_nome: unidadeNome ? String(unidadeNome) : null,
        emocao: String(row.emocao ?? ''),
        emocao_label: meta?.label ?? String(row.emocao ?? ''),
        emoji: meta?.emoji ?? '⚠️',
        motivo: row.motivo != null && String(row.motivo).trim() ? String(row.motivo).trim() : null,
        data: String(row.data ?? hoje),
        registrado_em: row.created_at ? String(row.created_at) : null,
        lider_ok: ack.length > 0,
        lider_ok_por: ack.map((a) => a.viewer_nome),
        lider_ok_em: ack[0]?.visto_em ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      data_referencia: hoje,
      total: alertas.length,
      alertas,
      escopo: escopoRede ? 'rede' : 'setores',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Marca alertas do dia como vistos para quem clicou em OK (só some para esse gestor). */
export async function POST(req: Request) {
  const auth = await authGestorEmocional();
  if (!auth.ok) return auth.response;
  const { colaboradorId: viewerId, role } = auth;

  const hoje = dataCivilBr();
  const escopoRede = alertasEmocionalEscopoRede(role, viewerId);

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

    // Líder só pode dar OK nos da própria equipe/setor.
    if (!escopoRede && idsMarcar.length > 0) {
      try {
        const equipe = await listarEquipeDoLider(supabase, viewerId);
        const permitidos = new Set(equipe.map((m) => m.id));
        idsMarcar = idsMarcar.filter((id) => permitidos.has(id));
      } catch {
        idsMarcar = [];
      }
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
