import type { createAdminClient } from '@/lib/supabase/admin';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';
import { assiduidadeIsentaSemana, assiduidadeLegacySemanalRemovida } from '@/lib/avaliacao-diaria';
import { buildMapaAvaliacaoDireta } from '@/lib/avaliacao-direta';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import {
  colaboradorElegivelVisitaRh,
  isAvaliacaoDeVisitaRh,
} from '@/lib/avaliacao-rh-visita-access';
import { construirConjuntoIdsRh } from '@/lib/avaliacao-semanal-agregacao';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { normalizePortalRole } from '@/lib/roles';
import {
  formatarIntervaloSemanaPtBR,
  inicioSemanaSegundaFeiraLocal,
  isDateIsoAvaliacao,
} from '@/lib/semana-referencia';
import { SELECT_AVALIACAO_META, SELECT_AVALIACAO_META_SEM_IGNORAR } from '@/lib/avaliacoes-justificativa-compat';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type PapelAvaliadorEsperado = 'gerente_loja' | 'lider_setor' | 'avaliacao_direta';
export type StatusResponsavelLider = 'pendente' | 'marcou_fora_plantao' | 'ja_avaliou';
export type TipoPendenciaItem =
  | 'sem_lider'
  | 'sem_rh'
  | 'sem_lider_e_rh'
  | 'critico_fora_plantao';

export type ResponsavelLider = {
  lider_id: string;
  lider_nome: string;
  papel: PapelAvaliadorEsperado;
  status: StatusResponsavelLider;
};

export type ItemPendenciaSemana = {
  colaborador_id: string;
  colaborador_nome: string;
  setor: string | null;
  unidade_nome: string | null;
  unidade_slug: string | null;
  tipo: TipoPendenciaItem;
  responsaveis_lider: ResponsavelLider[];
  responsavel_lider_label: string;
  responsavel_rh_label: string | null;
  detalhe: string | null;
  tem_nota_gerente: boolean;
};

export type ResultadoPendenciasSemana = {
  data_referencia: string;
  intervalo: string;
  resumo: {
    sem_lider: number;
    sem_rh_complemento: number;
    sem_rh_rede: number;
    criticos: number;
  };
  itens: ItemPendenciaSemana[];
};

type AvaliacaoRow = {
  colaborador_id: string;
  avaliador_id: string;
  assiduidade: string | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
  ignorada?: boolean | null;
  avaliador_role?: string | null;
};

type ColabInfo = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_id: string;
  unidade_nome: string | null;
  unidade_slug: string | null;
  role: string | null;
};

type AvaliadorEsperado = {
  lider_id: string;
  lider_nome: string;
  papel: PapelAvaliadorEsperado;
};

function avaliacaoFechaSemanaLider(row: AvaliacaoRow, rhIds: Set<string>): boolean {
  if (avaliacaoEstaIgnorada(row)) return false;
  if (isAvaliacaoDeVisitaRh(row.avaliador_id, row.avaliador_role, rhIds)) return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return false;
  if (assiduidadeLegacySemanalRemovida(a)) return false;
  if (a === 'falta_injustificada') return true;
  return row.media_dia != null && !Number.isNaN(Number(row.media_dia));
}

function avaliacaoForaPlantaoLider(row: AvaliacaoRow, rhIds: Set<string>): boolean {
  if (avaliacaoEstaIgnorada(row)) return false;
  if (isAvaliacaoDeVisitaRh(row.avaliador_id, row.avaliador_role, rhIds)) return false;
  return assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa) === 'fora_plantao';
}

function avaliacaoFechaSemanaRh(row: AvaliacaoRow, rhIds: Set<string>): boolean {
  if (avaliacaoEstaIgnorada(row)) return false;
  if (!isAvaliacaoDeVisitaRh(row.avaliador_id, row.avaliador_role, rhIds)) return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (assiduidadeIsentaSemana(a)) return true;
  return row.media_dia != null && !Number.isNaN(Number(row.media_dia));
}

function inferirPapel(
  colaboradorId: string,
  liderId: string,
  gerentesUnidade: Set<string>,
  mapaExclusivo: Map<string, Set<string>>
): PapelAvaliadorEsperado {
  const exclusivos = mapaExclusivo.get(colaboradorId);
  if (exclusivos?.has(liderId)) return 'avaliacao_direta';
  if (gerentesUnidade.has(liderId)) return 'gerente_loja';
  return 'lider_setor';
}

function montarLabelResponsavel(responsaveis: ResponsavelLider[]): { label: string; critico: boolean } {
  const pendentes = responsaveis.filter((r) => r.status === 'pendente');
  const fora = responsaveis.filter((r) => r.status === 'marcou_fora_plantao');

  if (pendentes.length === 0 && fora.length > 0) {
    return { label: 'Ninguém fechou (todos marcaram fora do plantão)', critico: true };
  }
  if (pendentes.length === 1) {
    if (fora.length > 0) {
      const quem = fora.map((f) => f.lider_nome.split(/\s+/)[0]).join(', ');
      return {
        label: `${pendentes[0].lider_nome} (${quem} marcou fora do plantão)`,
        critico: false,
      };
    }
    return { label: pendentes[0].lider_nome, critico: false };
  }
  if (pendentes.length > 1) {
    const nomes = pendentes.map((p) => p.lider_nome.split(/\s+/)[0]).join(' ou ');
    return { label: `${nomes} (plantão 12x36)`, critico: false };
  }
  return { label: '—', critico: false };
}

async function buildGerentesPorUnidade(
  supabase: SupabaseAdmin
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const { data, error } = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, lider_id')
    .eq('setor', SETOR_TODOS_NA_UNIDADE)
    .eq('ativo', true);
  if (error) {
    if (/lideres_por_setor|does not exist/i.test(error.message)) return out;
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    const uid = String(row.unidade_id ?? '');
    const lid = String(row.lider_id ?? '');
    if (!uid || !lid) continue;
    if (!out.has(uid)) out.set(uid, new Set());
    out.get(uid)!.add(lid);
  }
  return out;
}

async function buildMapaAvaliadoresEsperados(
  supabase: SupabaseAdmin
): Promise<Map<string, AvaliadorEsperado[]>> {
  const mapaDirect = await buildMapaAvaliacaoDireta(supabase);
  const gerentesPorUnidade = await buildGerentesPorUnidade(supabase);

  const { data: lpsRows, error: lpsErr } = await supabase
    .from('lideres_por_setor')
    .select('lider_id')
    .eq('ativo', true);
  if (lpsErr && !/lideres_por_setor|does not exist/i.test(lpsErr.message)) {
    throw new Error(lpsErr.message);
  }

  const liderIds = Array.from(
    new Set((lpsRows ?? []).map((r) => String(r.lider_id ?? '')).filter(Boolean))
  );

  const porColaborador = new Map<string, Map<string, AvaliadorEsperado>>();
  const colabUnidade = new Map<string, string>();

  for (const liderId of liderIds) {
    const { data: lider } = await supabase
      .from('colaboradores')
      .select('id, nome, role, unidade_id')
      .eq('id', liderId)
      .maybeSingle();
    if (!lider?.id) continue;

    const pode = await podeUsarAvaliacaoEquipeSemanal(
      supabase,
      String(lider.id),
      (lider as { role?: string }).role
    );
    if (!pode) continue;

    const unidadeId = String(lider.unidade_id ?? '');
    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, String(lider.id), unidadeId);

    for (const m of equipe) {
      const cid = m.id;
      if (!porColaborador.has(cid)) porColaborador.set(cid, new Map());
      if (!colabUnidade.has(cid)) colabUnidade.set(cid, unidadeId);

      const uidColab = colabUnidade.get(cid) ?? unidadeId;
      const gerentes = gerentesPorUnidade.get(uidColab) ?? new Set<string>();

      porColaborador.get(cid)!.set(String(lider.id), {
        lider_id: String(lider.id),
        lider_nome: String(lider.nome ?? ''),
        papel: inferirPapel(cid, String(lider.id), gerentes, mapaDirect.avaliadoresPorAlvo),
      });
    }
  }

  const cids = Array.from(porColaborador.keys());
  if (cids.length > 0) {
    const { data: colsUn } = await supabase
      .from('colaboradores')
      .select('id, unidade_id')
      .in('id', cids);
    for (const c of colsUn ?? []) {
      if (c.unidade_id) colabUnidade.set(String(c.id), String(c.unidade_id));
    }
    for (const cid of cids) {
      const uidColab = colabUnidade.get(cid);
      if (!uidColab) continue;
      const gerentes = gerentesPorUnidade.get(uidColab) ?? new Set<string>();
      const inner = porColaborador.get(cid);
      if (!inner) continue;
      for (const [lid, av] of Array.from(inner.entries())) {
        inner.set(lid, {
          ...av,
          papel: inferirPapel(cid, lid, gerentes, mapaDirect.avaliadoresPorAlvo),
        });
      }
    }
  }

  const out = new Map<string, AvaliadorEsperado[]>();
  for (const [cid, inner] of Array.from(porColaborador.entries())) {
    out.set(
      cid,
      Array.from(inner.values()).sort((a, b) => a.lider_nome.localeCompare(b.lider_nome, 'pt-BR'))
    );
  }
  return out;
}

async function carregarAvaliacoesSemana(
  supabase: SupabaseAdmin,
  dataRef: string,
  colaboradorIds: string[]
): Promise<AvaliacaoRow[]> {
  if (colaboradorIds.length === 0) return [];

  const selects = [SELECT_AVALIACAO_META, SELECT_AVALIACAO_META_SEM_IGNORAR];
  let rawRows: Record<string, unknown>[] | null = null;

  for (const sel of selects) {
    const res = await supabase
      .from('avaliacoes_diarias')
      .select(sel)
      .eq('data_referencia', dataRef)
      .in('colaborador_id', colaboradorIds);

    if (!res.error) {
      rawRows = (res.data ?? []) as unknown as Record<string, unknown>[];
      break;
    }
    const msg = res.error.message.toLowerCase();
    if (!msg.includes('does not exist') && !msg.includes('schema cache')) {
      throw new Error(res.error.message);
    }
  }

  if (!rawRows) {
    const fallback = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, avaliador_id, assiduidade, media_dia, justificativa_nota_baixa')
      .eq('data_referencia', dataRef)
      .in('colaborador_id', colaboradorIds);
    if (fallback.error) throw new Error(fallback.error.message);
    rawRows = (fallback.data ?? []) as unknown as Record<string, unknown>[];
  }

  const avaliadorIds = Array.from(new Set(rawRows.map((r) => String(r.avaliador_id ?? '')).filter(Boolean)));
  const rolesPorId = new Map<string, string>();
  if (avaliadorIds.length > 0) {
    const { data: avs } = await supabase.from('colaboradores').select('id, role').in('id', avaliadorIds);
    for (const a of avs ?? []) {
      rolesPorId.set(String(a.id), String((a as { role?: string }).role ?? ''));
    }
  }

  return rawRows.map((raw) => ({
    colaborador_id: String(raw.colaborador_id),
    avaliador_id: String(raw.avaliador_id),
    assiduidade: (raw.assiduidade as string | null) ?? null,
    media_dia: raw.media_dia != null ? Number(raw.media_dia) : null,
    justificativa_nota_baixa: (raw.justificativa_nota_baixa as string | null) ?? null,
    ignorada: raw.ignorada as boolean | null | undefined,
    avaliador_role: rolesPorId.get(String(raw.avaliador_id)) ?? null,
  }));
}

async function carregarColaboradoresInfo(
  supabase: SupabaseAdmin,
  ids: string[],
  unidadeId?: string
): Promise<Map<string, ColabInfo>> {
  if (ids.length === 0) return new Map();

  let query = supabase
    .from('colaboradores')
    .select('id, nome, setor, role, unidade_id, unidades(nome, slug)')
    .in('id', ids);
  if (unidadeId) query = query.eq('unidade_id', unidadeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const out = new Map<string, ColabInfo>();
  for (const c of data ?? []) {
    const un = c.unidades as { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
    const u = Array.isArray(un) ? un[0] : un;
    out.set(String(c.id), {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      setor: (c.setor as string | null) ?? null,
      unidade_id: String(c.unidade_id ?? ''),
      unidade_nome: u?.nome ? String(u.nome) : null,
      unidade_slug: u?.slug ? String(u.slug) : null,
      role: (c.role as string | null) ?? null,
    });
  }
  return out;
}

function statusResponsavel(
  liderId: string,
  rows: AvaliacaoRow[],
  rhIds: Set<string>
): StatusResponsavelLider {
  const doLider = rows.filter((r) => r.avaliador_id === liderId);
  if (doLider.some((r) => avaliacaoFechaSemanaLider(r, rhIds))) return 'ja_avaliou';
  if (doLider.some((r) => avaliacaoForaPlantaoLider(r, rhIds))) return 'marcou_fora_plantao';
  return 'pendente';
}

export type FiltroPendenciasSemana = 'gerente' | 'rh_complemento' | 'rh_rede' | 'todos';

export async function calcularPendenciasSemana(
  supabase: SupabaseAdmin,
  opts: {
    dataIso: string;
    unidadeId?: string;
    unidadeSlug?: string;
    filtro?: FiltroPendenciasSemana;
    busca?: string;
    rhAvaliadorId?: string;
  }
): Promise<ResultadoPendenciasSemana> {
  const dataRef = inicioSemanaSegundaFeiraLocal(opts.dataIso);
  if (!isDateIsoAvaliacao(dataRef)) {
    throw new Error('Data inválida');
  }

  let unidadeId = opts.unidadeId?.trim() || '';
  if (!unidadeId && opts.unidadeSlug?.trim()) {
    const { data: u } = await supabase
      .from('unidades')
      .select('id')
      .eq('slug', opts.unidadeSlug.trim())
      .maybeSingle();
    if (u?.id) unidadeId = String(u.id);
  }

  const mapaEsperados = await buildMapaAvaliadoresEsperados(supabase);
  let colaboradorIds = Array.from(mapaEsperados.keys());

  if (unidadeId) {
    const { data: colsUn } = await supabase.from('colaboradores').select('id').eq('unidade_id', unidadeId);
    const idsUn = new Set((colsUn ?? []).map((c) => String(c.id)));
    colaboradorIds = colaboradorIds.filter((id) => idsUn.has(id));
  }

  const colabInfo = await carregarColaboradoresInfo(supabase, colaboradorIds, unidadeId || undefined);
  colaboradorIds = colaboradorIds.filter((id) => {
    const c = colabInfo.get(id);
    return c && normalizePortalRole(c.role) === 'colaborador';
  });

  const avaliacoes = await carregarAvaliacoesSemana(supabase, dataRef, colaboradorIds);

  const { data: todosAvaliadores } = await supabase
    .from('colaboradores')
    .select('id, role, setor, nome');
  const rhIds = construirConjuntoIdsRh(todosAvaliadores ?? []);

  const avalPorColab = new Map<string, AvaliacaoRow[]>();
  for (const a of avaliacoes) {
    const list = avalPorColab.get(a.colaborador_id) ?? [];
    list.push(a);
    avalPorColab.set(a.colaborador_id, list);
  }

  const filtro = opts.filtro ?? 'todos';
  const buscaNorm = opts.busca?.trim().toLowerCase() ?? '';
  const itens: ItemPendenciaSemana[] = [];
  const resumo = { sem_lider: 0, sem_rh_complemento: 0, sem_rh_rede: 0, criticos: 0 };

  for (const cid of colaboradorIds) {
    const info = colabInfo.get(cid);
    if (!info) continue;

    if (buscaNorm) {
      const hay = `${info.nome} ${info.setor ?? ''} ${info.unidade_nome ?? ''}`.toLowerCase();
      if (!hay.includes(buscaNorm)) continue;
    }

    const rows = avalPorColab.get(cid) ?? [];
    const esperados = mapaEsperados.get(cid) ?? [];

    const temNotaGerente = rows.some((r) => avaliacaoFechaSemanaLider(r, rhIds));
    const temRh = rows.some((r) => avaliacaoFechaSemanaRh(r, rhIds));
    const elegivelRh = colaboradorElegivelVisitaRh(
      { id: cid, role: info.role, nome: info.nome },
      opts.rhAvaliadorId ?? 'rh-placeholder'
    );

    const responsaveis: ResponsavelLider[] = esperados.map((e) => ({
      ...e,
      status: statusResponsavel(e.lider_id, rows, rhIds),
    }));

    const { label: responsavel_lider_label, critico } = montarLabelResponsavel(responsaveis);
    const semLider = !temNotaGerente;
    const semRhComplemento = temNotaGerente && elegivelRh && !temRh;
    const semRhRede = elegivelRh && !temRh;

    if (semLider) resumo.sem_lider++;
    if (semRhComplemento) resumo.sem_rh_complemento++;
    if (semRhRede) resumo.sem_rh_rede++;
    if (semLider && critico) resumo.criticos++;

    let tipo: TipoPendenciaItem | null = null;
    if (semLider && critico) tipo = 'critico_fora_plantao';
    else if (semLider && semRhRede) tipo = 'sem_lider_e_rh';
    else if (semLider) tipo = 'sem_lider';
    else if (semRhRede) tipo = 'sem_rh';

    const incluir =
      filtro === 'todos'
        ? semLider || semRhRede
        : filtro === 'gerente'
          ? semLider
          : filtro === 'rh_complemento'
            ? semRhComplemento
            : semRhRede;

    if (!incluir || !tipo) continue;

    itens.push({
      colaborador_id: cid,
      colaborador_nome: info.nome,
      setor: info.setor,
      unidade_nome: info.unidade_nome,
      unidade_slug: info.unidade_slug,
      tipo,
      responsaveis_lider: responsaveis.filter((r) => r.status !== 'ja_avaliou'),
      responsavel_lider_label: semLider ? responsavel_lider_label : '—',
      responsavel_rh_label: semRhRede || semRhComplemento ? 'Keila (Visita RH)' : null,
      detalhe:
        semLider && responsaveis.filter((r) => r.status === 'pendente').length > 1
          ? 'Mapa de liderança atual.'
          : null,
      tem_nota_gerente: temNotaGerente,
    });
  }

  itens.sort((a, b) => {
    const u = (a.unidade_nome ?? '').localeCompare(b.unidade_nome ?? '', 'pt-BR');
    if (u !== 0) return u;
    return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
  });

  return {
    data_referencia: dataRef,
    intervalo: formatarIntervaloSemanaPtBR(dataRef),
    resumo,
    itens,
  };
}
