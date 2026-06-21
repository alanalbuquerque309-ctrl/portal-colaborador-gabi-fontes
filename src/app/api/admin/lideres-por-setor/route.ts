import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized, requireAdminLiderancaMapaApi } from '@/lib/admin-auth';
import { isSetorValido, SETORES_PREDEFINIDOS, UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { podeSerLider } from '@/lib/pode-ser-lider';
import { sincronizarVinculosUnidadeSetor } from '@/lib/sincronizar-vinculos-lideranca';
import { ehParidadePlantao, mesAtualOperacao } from '@/lib/plantao-12x36';

const SEL_LIDERES_PARIDADE =
  'id, unidade_id, setor, lider_id, ativo, plantao_paridade, plantao_paridade_mes_ref, unidades(nome, slug)';
const SEL_LIDERES_BASE = 'id, unidade_id, setor, lider_id, ativo, unidades(nome, slug)';

/** Select com colunas de paridade; cai para o select base se a migration 042 ainda não foi aplicada. */
async function fetchLideres(
  build: (sel: string) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<{ data: Record<string, unknown>[]; error: { message: string } | null }> {
  const norm = (e: unknown): { message: string } | null => {
    if (!e) return null;
    if (typeof e === 'object' && 'message' in e) {
      return { message: String((e as { message: unknown }).message) };
    }
    return { message: 'Erro ao consultar lideres_por_setor' };
  };

  let res = await build(SEL_LIDERES_PARIDADE);
  let error = norm(res.error);
  if (error && /plantao_paridade|column .* does not exist/i.test(error.message)) {
    res = await build(SEL_LIDERES_BASE);
    error = norm(res.error);
  }
  return { data: (res.data as Record<string, unknown>[] | null) ?? [], error };
}

function setorConfigValido(setor: string): boolean {
  return setor === SETOR_TODOS_NA_UNIDADE || isSetorValido(setor);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function mapLinhas(
  data: Array<Record<string, unknown>>,
  nomePorId: Record<string, string>
) {
  return data.map((r) => {
    const unidade = Array.isArray(r.unidades) ? r.unidades[0] : r.unidades;
    return {
      id: String(r.id),
      unidade_id: String(r.unidade_id),
      unidade_nome: unidade && typeof unidade === 'object' && 'nome' in unidade ? String(unidade.nome) : '',
      unidade_slug:
        unidade && typeof unidade === 'object' && 'slug' in unidade ? String(unidade.slug) : '',
      setor: String(r.setor),
      lider_id: String(r.lider_id),
      lider_nome: nomePorId[String(r.lider_id)] ?? '',
      ativo: r.ativo === true,
      plantao_paridade: ehParidadePlantao(r.plantao_paridade as string) ? (r.plantao_paridade as string) : null,
      plantao_paridade_mes_ref:
        r.plantao_paridade_mes_ref != null ? String(r.plantao_paridade_mes_ref) : null,
    };
  });
}

async function resolverNomesLideres(
  supabase: ReturnType<typeof createAdminClient>,
  liderIds: string[]
) {
  if (liderIds.length === 0) return {};
  const { data: cols } = await supabase.from('colaboradores').select('id, nome').in('id', liderIds);
  return Object.fromEntries((cols ?? []).map((c) => [String(c.id), String(c.nome ?? '')]));
}

/** Lista por unidade ou resumo de todas as unidades (`?todas=1`). */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const todas = searchParams.get('todas') === '1';
  const unidadeId = searchParams.get('unidade_id')?.trim() ?? '';
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() ?? '';

  try {
    const supabase = createAdminClient();

    if (todas) {
      const { data, error } = await fetchLideres((sel) =>
        supabase.from('lideres_por_setor').select(sel).eq('ativo', true)
      );

      if (error) {
        if (/lideres_por_setor|does not exist/i.test(error.message)) {
          return NextResponse.json({
            ok: true,
            unidades: UNIDADES_CADASTRO.map((u) => ({
              slug: u.slug,
              nome: u.label,
              unidade_id: null,
              total_lideres: 0,
            })),
            linhas: [],
            aviso: 'Execute a migration 032_lideres_por_setor.sql no Supabase.',
          });
        }
        return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      }

      const liderIds = Array.from(
        new Set((data ?? []).map((r) => String(r.lider_id ?? '')).filter(Boolean))
      );
      const nomePorId = await resolverNomesLideres(supabase, liderIds);
      const linhas = mapLinhas(data ?? [], nomePorId);

      const porSlug = new Map<string, { slug: string; nome: string; unidade_id: string | null; total: number }>();
      for (const u of UNIDADES_CADASTRO) {
        porSlug.set(u.slug, { slug: u.slug, nome: u.label, unidade_id: null, total: 0 });
      }
      for (const l of linhas) {
        const slug = l.unidade_slug || 'outros';
        const entry = porSlug.get(slug) ?? {
          slug,
          nome: l.unidade_nome || slug,
          unidade_id: l.unidade_id,
          total: 0,
        };
        entry.unidade_id = entry.unidade_id || l.unidade_id;
        entry.total += 1;
        porSlug.set(slug, entry);
      }

      const { data: unidadesDb } = await supabase.from('unidades').select('id, nome, slug');
      for (const u of unidadesDb ?? []) {
        const slug = String(u.slug ?? '');
        if (!slug || !porSlug.has(slug)) continue;
        const e = porSlug.get(slug)!;
        e.unidade_id = String(u.id);
        e.nome = String(u.nome ?? e.nome);
      }

      return NextResponse.json({
        ok: true,
        unidades: Array.from(porSlug.values()).map((u) => ({
          slug: u.slug,
          nome: u.nome,
          unidade_id: u.unidade_id,
          total_lideres: u.total,
        })),
        linhas,
        setores: [...SETORES_PREDEFINIDOS],
      });
    }

    let uid = unidadeId;
    if (!uid && unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id, nome, slug').eq('slug', unidadeSlug).maybeSingle();
      uid = u?.id ? String(u.id) : '';
    }

    if (!uid) {
      return NextResponse.json(
        { ok: false, erro: unidadeSlug ? 'Unidade não encontrada' : 'Informe unidade_id ou unidade_slug' },
        { status: 400 }
      );
    }

    const { data, error } = await fetchLideres((sel) =>
      supabase
        .from('lideres_por_setor')
        .select(sel)
        .eq('unidade_id', uid)
        .order('setor', { ascending: true })
    );

    if (error) {
      if (/lideres_por_setor|does not exist/i.test(error.message)) {
        return NextResponse.json({
          ok: true,
          unidade_id: uid,
          linhas: [],
          setores: [...SETORES_PREDEFINIDOS],
          aviso: 'Execute a migration 032_lideres_por_setor.sql no Supabase.',
        });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const liderIds = Array.from(new Set((data ?? []).map((r) => String(r.lider_id ?? '')).filter(Boolean)));
    const nomePorId = await resolverNomesLideres(supabase, liderIds);
    const linhas = mapLinhas(data ?? [], nomePorId);
    const unidadeRow = linhas[0];

    return NextResponse.json({
      ok: true,
      unidade_id: uid,
      unidade_nome: unidadeRow?.unidade_nome ?? '',
      unidade_slug: unidadeRow?.unidade_slug ?? unidadeSlug,
      linhas,
      setores: [...SETORES_PREDEFINIDOS],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Regista líder para unidade + setor e sincroniza colaboradores. */
export async function POST(req: Request) {
  const auth = await requireAdminLiderancaMapaApi();
  if (!auth.ok) return auth.response;

  let body: { unidade_id?: string; unidade_slug?: string; setor?: string; lider_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const setor = String(body.setor ?? '').trim();
  const liderId = String(body.lider_id ?? '').trim();
  if (!setor || !setorConfigValido(setor) || !isUuid(liderId)) {
    return NextResponse.json({ ok: false, erro: 'Setor ou líder inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let unidadeId = body.unidade_id?.trim() ?? '';
    if (!unidadeId && body.unidade_slug) {
      const { data: u } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', body.unidade_slug.trim())
        .maybeSingle();
      unidadeId = u?.id ? String(u.id) : '';
    }
    if (!unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Unidade obrigatória' }, { status: 400 });
    }

    const { data: lider, error: errL } = await supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, unidade_id')
      .eq('id', liderId)
      .maybeSingle();
    if (errL || !lider) {
      return NextResponse.json({ ok: false, erro: 'Líder não encontrado' }, { status: 404 });
    }
    if (
      !podeSerLider(
        (lider as { role?: string }).role,
        (lider as { cargo?: string }).cargo,
        String(lider.nome ?? '')
      )
    ) {
      return NextResponse.json(
        { ok: false, erro: 'Este colaborador não pode ser líder de setor (função/cargo).' },
        { status: 400 }
      );
    }
    if (String(lider.unidade_id) !== unidadeId) {
      return NextResponse.json(
        { ok: false, erro: 'O líder deve pertencer à mesma unidade da configuração.' },
        { status: 400 }
      );
    }

    const { data: row, error } = await supabase
      .from('lideres_por_setor')
      .upsert(
        {
          unidade_id: unidadeId,
          setor,
          lider_id: liderId,
          ativo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'unidade_id,setor,lider_id' }
      )
      .select('id')
      .single();

    if (error) {
      if (/lideres_por_setor|does not exist/i.test(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Tabela lideres_por_setor ausente. Aplique migration 032 no Supabase.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const sync = await sincronizarVinculosUnidadeSetor(supabase, unidadeId, setor);

    return NextResponse.json({ ok: true, id: row?.id, colaboradores_sincronizados: sync.sincronizados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Edita vínculo (trocar líder ou setor) e sincroniza colaboradores. */
export async function PATCH(req: Request) {
  const auth = await requireAdminLiderancaMapaApi();
  if (!auth.ok) return auth.response;

  let body: { id?: string; lider_id?: string; setor?: string; plantao_paridade?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, erro: 'id inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: atual, error: errA } = await supabase
      .from('lideres_por_setor')
      .select('id, unidade_id, setor, lider_id')
      .eq('id', id)
      .maybeSingle();

    if (errA || !atual) {
      return NextResponse.json({ ok: false, erro: 'Vínculo não encontrado' }, { status: 404 });
    }

    const setorNovo = body.setor != null ? String(body.setor).trim() : String(atual.setor);
    const liderNovo = body.lider_id != null ? String(body.lider_id).trim() : String(atual.lider_id);

    if (!setorConfigValido(setorNovo) || !isUuid(liderNovo)) {
      return NextResponse.json({ ok: false, erro: 'Setor ou líder inválido' }, { status: 400 });
    }

    const unidadeId = String(atual.unidade_id);
    const setorAntigo = String(atual.setor);

    const { data: lider, error: errL } = await supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, unidade_id')
      .eq('id', liderNovo)
      .maybeSingle();
    if (errL || !lider) {
      return NextResponse.json({ ok: false, erro: 'Líder não encontrado' }, { status: 404 });
    }
    if (
      !podeSerLider(
        (lider as { role?: string }).role,
        (lider as { cargo?: string }).cargo,
        String(lider.nome ?? '')
      )
    ) {
      return NextResponse.json({ ok: false, erro: 'Este colaborador não pode ser líder.' }, { status: 400 });
    }
    if (String(lider.unidade_id) !== unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Líder deve ser da mesma unidade.' }, { status: 400 });
    }

    const updateBase = {
      setor: setorNovo,
      lider_id: liderNovo,
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    let avisoParidade: string | undefined;
    let updateObj: Record<string, unknown> = { ...updateBase };
    if (body.plantao_paridade !== undefined) {
      const p = String(body.plantao_paridade ?? '').trim();
      const paridade = ehParidadePlantao(p) ? p : null;
      updateObj = {
        ...updateBase,
        plantao_paridade: paridade,
        plantao_paridade_mes_ref: paridade ? mesAtualOperacao() : null,
      };
    }

    let { error } = await supabase.from('lideres_por_setor').update(updateObj).eq('id', id);
    if (error && /plantao_paridade|column .* does not exist/i.test(error.message)) {
      avisoParidade = 'Plantão não salvo: aplique a migration 042 no Supabase.';
      ({ error } = await supabase.from('lideres_por_setor').update(updateBase).eq('id', id));
    }

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const syncAntigo = await sincronizarVinculosUnidadeSetor(supabase, unidadeId, setorAntigo);
    const syncNovo =
      setorNovo !== setorAntigo
        ? await sincronizarVinculosUnidadeSetor(supabase, unidadeId, setorNovo)
        : { sincronizados: 0 };

    return NextResponse.json({
      ok: true,
      aviso: avisoParidade,
      colaboradores_sincronizados: syncAntigo.sincronizados + syncNovo.sincronizados,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Desativa vínculo e sincroniza colaboradores do setor. */
export async function DELETE(req: Request) {
  const auth = await requireAdminLiderancaMapaApi();
  if (!auth.ok) return auth.response;

  let body: { id?: string; unidade_id?: string; setor?: string; lider_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const id = body.id?.trim();

    let unidadeId = '';
    let setorCfg = '';

    if (id && isUuid(id)) {
      const { data: row } = await supabase
        .from('lideres_por_setor')
        .select('unidade_id, setor')
        .eq('id', id)
        .maybeSingle();
      if (row) {
        unidadeId = String(row.unidade_id);
        setorCfg = String(row.setor);
      }
      const { error } = await supabase
        .from('lideres_por_setor')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    } else {
      const setor = String(body.setor ?? '').trim();
      const liderId = String(body.lider_id ?? '').trim();
      unidadeId = String(body.unidade_id ?? '').trim();
      if (!unidadeId || !setor || !liderId) {
        return NextResponse.json({ ok: false, erro: 'Informe id ou unidade+setor+líder' }, { status: 400 });
      }
      setorCfg = setor;
      const { error } = await supabase
        .from('lideres_por_setor')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('unidade_id', unidadeId)
        .eq('setor', setor)
        .eq('lider_id', liderId);
      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    if (unidadeId && setorCfg) {
      const sync = await sincronizarVinculosUnidadeSetor(supabase, unidadeId, setorCfg);
      return NextResponse.json({ ok: true, colaboradores_sincronizados: sync.sincronizados });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
