import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { normalizePortalRole } from '@/lib/roles';
import { calcularRankingsTrofeusMuralDoColaborador } from '@/lib/mural-ranking-trofeus-pares';
import {
  isTrofeuParTipo,
  metaTrofeuPar,
  TROFEUS_PARES_CREDITOS_SEMANA,
  TROFEUS_PARES_TIPOS,
  TROFEU_PAR_LABELS,
} from '@/lib/trofeus-pares';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function tabelaInexistente(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('trofeus_entre_pares') && (m.includes('does not exist') || m.includes('schema cache'));
}

/** Estado do envio + mural de troféus da unidade na semana. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending' || !unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  const semanaInicio = segundaSemanaSaoPaulo();

  try {
    const supabase = createAdminClient();

    const { data: viewer, error: errViewer } = await supabase
      .from('colaboradores')
      .select('unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errViewer) {
      return NextResponse.json({ ok: false, erro: errViewer.message }, { status: 500, headers: NO_STORE });
    }

    const unidadeEmbed = viewer?.unidades as { slug?: string } | { slug?: string }[] | null | undefined;
    const unidadeSlug = Array.isArray(unidadeEmbed) ? unidadeEmbed[0]?.slug : unidadeEmbed?.slug;

    const { data: enviados, error: errEnv } = await supabase
      .from('trofeus_entre_pares')
      .select('id, destinatario_id, tipo, created_at')
      .eq('avaliador_id', colaboradorId)
      .eq('semana_inicio', semanaInicio)
      .order('created_at', { ascending: false });

    if (errEnv && tabelaInexistente(errEnv.message)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'trofeus_missing_table',
          erro: 'Tabela de troféus não criada. Rode a migração 033 no Supabase.',
        },
        { status: 503, headers: NO_STORE }
      );
    }
    if (errEnv) {
      return NextResponse.json({ ok: false, erro: errEnv.message }, { status: 500, headers: NO_STORE });
    }

    const creditosUsados = (enviados ?? []).length;
    const creditosRestantes = Math.max(0, TROFEUS_PARES_CREDITOS_SEMANA - creditosUsados);

    const { data: muralRaw, error: errMural } = await supabase
      .from('trofeus_entre_pares')
      .select('id, tipo, created_at, destinatario_id')
      .eq('unidade_id', unidadeId)
      .eq('semana_inicio', semanaInicio)
      .order('created_at', { ascending: false })
      .limit(80);

    if (errMural) {
      return NextResponse.json({ ok: false, erro: errMural.message }, { status: 500, headers: NO_STORE });
    }

    const idsNomes = new Set<string>();
    for (const r of enviados ?? []) idsNomes.add(String(r.destinatario_id));
    for (const r of muralRaw ?? []) idsNomes.add(String(r.destinatario_id));
    const nomePorId: Record<string, string> = {};
    if (idsNomes.size > 0) {
      const { data: nomes } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .in('id', Array.from(idsNomes));
      for (const n of nomes ?? []) nomePorId[String(n.id)] = String(n.nome ?? '');
    }

    const mapTrofeu = (r: { id: string; destinatario_id: string; tipo: string }) => {
      const tipo = String(r.tipo ?? '');
      const meta = metaTrofeuPar(tipo);
      return {
        id: String(r.id ?? ''),
        destinatario_id: String(r.destinatario_id ?? ''),
        destinatario_nome: nomePorId[String(r.destinatario_id)] ?? '',
        tipo,
        titulo: meta?.titulo ?? tipo,
        emoji: meta?.emoji ?? '🏅',
      };
    };

    const mural = (muralRaw ?? []).map((r) => ({
      ...mapTrofeu(r as { id: string; destinatario_id: string; tipo: string }),
      created_at: String((r as { created_at?: string }).created_at ?? ''),
    }));

    const { data: colegasRaw, error: errColegas } = await supabase
      .from('colaboradores')
      .select('id, nome, cargo, setor')
      .eq('unidade_id', unidadeId)
      .eq('role', 'colaborador')
      .eq('onboarding_completo', true)
      .neq('id', colaboradorId)
      .order('nome', { ascending: true })
      .limit(200);

    if (errColegas) {
      return NextResponse.json({ ok: false, erro: errColegas.message }, { status: 500, headers: NO_STORE });
    }

    const colegas_elegiveis = (colegasRaw ?? [])
      .filter((c) => normalizePortalRole((c as { role?: string }).role) === 'colaborador')
      .map((c) => ({
        id: String(c.id),
        nome: String(c.nome ?? ''),
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        setor: (c as { setor?: string | null }).setor ?? null,
      }));

    let ranking_trofeus = null;
    try {
      ranking_trofeus = await calcularRankingsTrofeusMuralDoColaborador(
        supabase,
        unidadeSlug ? String(unidadeSlug) : null
      );
    } catch {
      ranking_trofeus = null;
    }

    return NextResponse.json({
      ok: true,
      semana_inicio: semanaInicio,
      creditos_semana: TROFEUS_PARES_CREDITOS_SEMANA,
      creditos_usados: creditosUsados,
      creditos_restantes: creditosRestantes,
      enviados: (enviados ?? []).map((r) =>
        mapTrofeu(r as { id: string; destinatario_id: string; tipo: string })
      ),
      mural_unidade: mural,
      ranking_trofeus,
      colegas_elegiveis,
      tipos: TROFEUS_PARES_TIPOS.map((t) => ({ id: t, ...TROFEU_PAR_LABELS[t] })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}

/** Envia troféu a um colega (máx. 3/semana, 1 por pessoa). */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending' || !unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  let body: { destinatario_id?: string; tipo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }

  const destinatarioId = String(body.destinatario_id ?? '').trim();
  const tipo = String(body.tipo ?? '').trim();
  if (!destinatarioId || !isTrofeuParTipo(tipo)) {
    return NextResponse.json({ ok: false, erro: 'destinatario_id e tipo válidos são obrigatórios' }, { status: 400, headers: NO_STORE });
  }
  if (destinatarioId === colaboradorId) {
    return NextResponse.json({ ok: false, erro: 'Não é possível enviar troféu para si mesmo' }, { status: 400, headers: NO_STORE });
  }

  const semanaInicio = segundaSemanaSaoPaulo();

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, role, unidade_id, onboarding_completo')
      .eq('id', colaboradorId)
      .single();
    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }
    const role = normalizePortalRole((eu as { role?: string }).role);
    if (role !== 'colaborador') {
      return NextResponse.json(
        { ok: false, erro: 'Troféus entre pares são apenas para colaboradores' },
        { status: 403, headers: NO_STORE }
      );
    }
    if (!(eu as { onboarding_completo?: boolean }).onboarding_completo) {
      return NextResponse.json({ ok: false, erro: 'Conclua o onboarding antes de enviar troféus' }, { status: 403, headers: NO_STORE });
    }

    const { data: dest, error: errDest } = await supabase
      .from('colaboradores')
      .select('id, nome, unidade_id, role, onboarding_completo')
      .eq('id', destinatarioId)
      .single();
    if (errDest || !dest) {
      return NextResponse.json({ ok: false, erro: 'Colega não encontrado' }, { status: 404, headers: NO_STORE });
    }
    if (String(dest.unidade_id) !== String(unidadeId)) {
      return NextResponse.json({ ok: false, erro: 'Só é possível reconhecer colegas da sua unidade' }, { status: 403, headers: NO_STORE });
    }
    if (normalizePortalRole((dest as { role?: string }).role) !== 'colaborador') {
      return NextResponse.json({ ok: false, erro: 'Destinatário precisa ser colaborador da loja' }, { status: 400, headers: NO_STORE });
    }

    const { count } = await supabase
      .from('trofeus_entre_pares')
      .select('id', { count: 'exact', head: true })
      .eq('avaliador_id', colaboradorId)
      .eq('semana_inicio', semanaInicio);
    if ((count ?? 0) >= TROFEUS_PARES_CREDITOS_SEMANA) {
      return NextResponse.json(
        { ok: false, erro: `Você já usou os ${TROFEUS_PARES_CREDITOS_SEMANA} troféus desta semana.` },
        { status: 409, headers: NO_STORE }
      );
    }

    const { error: insErr } = await supabase.from('trofeus_entre_pares').insert({
      avaliador_id: colaboradorId,
      destinatario_id: destinatarioId,
      unidade_id: unidadeId,
      semana_inicio: semanaInicio,
      tipo,
    });

    if (insErr) {
      if (tabelaInexistente(insErr.message)) {
        return NextResponse.json(
          { ok: false, code: 'trofeus_missing_table', erro: 'Rode a migração 033 no Supabase.' },
          { status: 503, headers: NO_STORE }
        );
      }
      if (insErr.code === '23505') {
        return NextResponse.json(
          { ok: false, erro: 'Você já enviou troféu para esta pessoa nesta semana.' },
          { status: 409, headers: NO_STORE }
        );
      }
      return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500, headers: NO_STORE });
    }

    return NextResponse.json({ ok: true, semana_inicio: semanaInicio }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
