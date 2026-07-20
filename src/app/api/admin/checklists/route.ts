import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { podeVerHistoricoChecklistsRede } from '@/lib/checklists/access';
import { listarChecklistsSemana } from '@/lib/checklists/service';
import { CHECKLIST_TEMPLATES } from '@/lib/checklists/templates';
import { rotuloDataChecklist, rotuloDiaSemana, rotuloTurno } from '@/lib/checklists/dia-semana';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Consulta checklists da rede (sob demanda). Sócios/admin na fase prévia. */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const adminSession = cookieStore.get('admin_session')?.value;

  if (!colaboradorId && !adminSession) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    let role = 'colaborador';

    if (colaboradorId && colaboradorId !== 'pending') {
      const { data: col } = await supabase
        .from('colaboradores')
        .select('role')
        .eq('id', colaboradorId)
        .maybeSingle();
      role = normalizePortalRole((col as { role?: string } | null)?.role);
    } else if (adminSession) {
      role = 'admin';
    }

    if (!podeVerHistoricoChecklistsRede(role)) {
      return NextResponse.json({ ok: false, erro: 'Acesso negado.' }, { status: 403, headers: NO_STORE });
    }

    const url = new URL(req.url);
    const unidadeId = url.searchParams.get('unidade_id')?.trim() || null;
    const tipo = url.searchParams.get('tipo')?.trim() || null;

    const { data: unidades } = await supabase
      .from('unidades')
      .select('id, nome, slug')
      .neq('slug', 'matriz')
      .order('nome');

    const registros = await listarChecklistsSemana(supabase, { unidadeId, tipo });

    const templatesMap = Object.fromEntries(CHECKLIST_TEMPLATES.map((t) => [t.tipo, t.titulo]));

    const linhas = registros.map((r) => ({
      ...r,
      tipo_titulo: templatesMap[r.tipo] ?? r.tipo,
      dia_semana_rotulo: r.data_referencia
        ? rotuloDataChecklist(r.data_referencia)
        : rotuloDiaSemana(r.dia_semana),
      turno_rotulo: rotuloTurno(r.turno),
    }));

    return NextResponse.json(
      {
        ok: true,
        preview_socios: false,
        unidades: unidades ?? [],
        registros: linhas,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
