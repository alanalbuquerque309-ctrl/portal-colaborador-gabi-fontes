import type { createAdminClient } from '@/lib/supabase/admin';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';
import { assiduidadeIsentaSemana, assiduidadeLegacySemanalRemovida } from '@/lib/avaliacao-diaria';
import { buildMapaAvaliacaoDireta } from '@/lib/avaliacao-direta';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import {
  colaboradorElegivelVisitaRh,
  isAvaliacaoDeVisitaRh,
  nomeEhDanielTransversal,
} from '@/lib/avaliacao-rh-visita-access';
import { construirConjuntoIdsRh } from '@/lib/avaliacao-semanal-agregacao';
import { assiduidadeDoBanco, ehLicencaOuAfastamentoAvaliacao } from '@/lib/avaliacao-semanal-shared';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { normalizePortalRole } from '@/lib/roles';
import {
  paridadeNoMes,
  rotuloParidade,
  mesDeDataIso,
} from '@/lib/plantao-12x36';
import {
  formatarIntervaloSemanaPtBR,
  inicioSemanaSegundaFeiraLocal,
  isDateIsoAvaliacao,
  semanaAvaliacaoEquipePadraoISO,
} from '@/lib/semana-referencia';
import { SELECT_AVALIACAO_META, SELECT_AVALIACAO_META_SEM_IGNORAR } from '@/lib/avaliacoes-justificativa-compat';
import { ehSextaSaoPaulo, segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { colaboradorDeFeriasNasLinhas } from '@/lib/avaliacao-ferias-semana';
import { colaboradorDeLicencaOuAfastamentoNasLinhas } from '@/lib/avaliacao-licenca-semana';
import { semanasReferenciaCobrancaAvaliacaoLider } from '@/lib/avaliacao-semana-cobranca';
import { colaboradorForaAvaliacaoSemanalEquipe } from '@/lib/colaborador-fora-operacao-presencial';
import { colaboradorFechouSemanaPorAlgumLider } from '@/lib/avaliacao-fechamento-lider';
import type {
  FiltroPendenciasSemana,
  ItemPendenciaSemana,
  PapelAvaliadorEsperado,
  ResponsavelLider,
  StatusResponsavelLider,
  TipoPendenciaItem,
} from '@/lib/avaliacao-pendentes-semana-shared';

export {
  agregarLideresComPendenciaDeEnvio,
  type FiltroPendenciasSemana,
  type ItemPendenciaSemana,
  type PapelAvaliadorEsperado,
  type ResponsavelLider,
  type StatusResponsavelLider,
  type TipoPendenciaItem,
} from '@/lib/avaliacao-pendentes-semana-shared';

export type ResultadoPendenciasSemana = {
  data_referencia: string;
  intervalo: string;
  resumo: {
    sem_lider: number;
    sem_rh_complemento: number;
    sem_rh_rede: number;
    /** Todos os líderes marcaram fora do plantão e ninguém fechou a semana. */
    criticos: number;
    /** Sem avaliação de líder e (quando couber) sem Visita RH — alerta de sexta. */
    criticos_sem_avaliacao: number;
  };
  meta: {
    eh_sexta: boolean;
    alerta_critico_sexta: boolean;
    /** Segunda-feira da semana avaliada (semana passada operacional, SP). */
    semana_atual: string;
    /** Linhas em `avaliacoes_diarias` na semana monitorada (qualquer avaliador). */
    avaliacoes_registradas: number;
  };
  itens: ItemPendenciaSemana[];
};

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type AvaliacaoRow = {
  colaborador_id: string;
  avaliador_id: string;
  assiduidade: string | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
  ignorada?: boolean | null;
  avaliador_role?: string | null;
  updated_at?: string | null;
};

type ColabInfo = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_id: string;
  unidade_nome: string | null;
  unidade_slug: string | null;
  role: string | null;
  tipo_escala: string | null;
};

type AvaliadorEsperado = {
  lider_id: string;
  lider_nome: string;
  papel: PapelAvaliadorEsperado;
  paridadeBase?: string | null;
  paridadeMesRef?: string | null;
};

function avaliacaoFechaSemanaLider(row: AvaliacaoRow, rhIds: Set<string>): boolean {
  if (avaliacaoEstaIgnorada(row)) return false;
  if (isAvaliacaoDeVisitaRh(row.avaliador_id, row.avaliador_role, rhIds)) return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return false;
  if (assiduidadeLegacySemanalRemovida(a)) return false;
  if (a === 'ferias') return true;
  if (ehLicencaOuAfastamentoAvaliacao(row.assiduidade, row.justificativa_nota_baixa)) return true;
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
  if (ehLicencaOuAfastamentoAvaliacao(row.assiduidade, row.justificativa_nota_baixa)) return true;
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

function nomeComParidade(r: ResponsavelLider): string {
  return r.paridade ? `${r.lider_nome} (${rotuloParidade(r.paridade)})` : r.lider_nome;
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
        label: `${nomeComParidade(pendentes[0])} (${quem} marcou fora do plantão)`,
        critico: false,
      };
    }
    return { label: nomeComParidade(pendentes[0]), critico: false };
  }
  if (pendentes.length > 1) {
    const nomes = pendentes
      .map((p) => (p.paridade ? `${p.lider_nome.split(/\s+/)[0]} (${rotuloParidade(p.paridade)})` : p.lider_nome.split(/\s+/)[0]))
      .join(' ou ');
    return { label: `${nomes} (plantão 12x36)`, critico: false };
  }
  return { label: '—', critico: false };
}

type ParidadeFonte = { base: string | null; mesRef: string | null };

async function buildGerentesPorUnidade(
  supabase: SupabaseAdmin
): Promise<{
  gerentesPorUnidade: Map<string, Set<string>>;
  paridadePorLider: Map<string, ParidadeFonte>;
}> {
  const out = new Map<string, Set<string>>();
  const paridadePorLider = new Map<string, ParidadeFonte>();

  const selPar = 'unidade_id, lider_id, plantao_paridade, plantao_paridade_mes_ref';
  const selBase = 'unidade_id, lider_id';
  const run = (sel: string) =>
    supabase
      .from('lideres_por_setor')
      .select(sel)
      .eq('setor', SETOR_TODOS_NA_UNIDADE)
      .eq('ativo', true);

  let res = await run(selPar);
  if (res.error && /plantao_paridade|column .* does not exist/i.test(res.error.message)) {
    res = await run(selBase);
  }
  if (res.error) {
    if (/lideres_por_setor|does not exist/i.test(res.error.message)) {
      return { gerentesPorUnidade: out, paridadePorLider };
    }
    throw new Error(res.error.message);
  }

  for (const row of (res.data ?? []) as unknown as Record<string, unknown>[]) {
    const uid = String(row.unidade_id ?? '');
    const lid = String(row.lider_id ?? '');
    if (!uid || !lid) continue;
    if (!out.has(uid)) out.set(uid, new Set());
    out.get(uid)!.add(lid);
    paridadePorLider.set(lid, {
      base: row.plantao_paridade != null ? String(row.plantao_paridade) : null,
      mesRef: row.plantao_paridade_mes_ref != null ? String(row.plantao_paridade_mes_ref) : null,
    });
  }
  return { gerentesPorUnidade: out, paridadePorLider };
}

async function buildMapaAvaliadoresEsperados(
  supabase: SupabaseAdmin
): Promise<Map<string, AvaliadorEsperado[]>> {
  const mapaDirect = await buildMapaAvaliacaoDireta(supabase);
  const { gerentesPorUnidade, paridadePorLider } = await buildGerentesPorUnidade(supabase);

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

      const parFonte = paridadePorLider.get(String(lider.id));
      porColaborador.get(cid)!.set(String(lider.id), {
        lider_id: String(lider.id),
        lider_nome: String(lider.nome ?? ''),
        papel: inferirPapel(cid, String(lider.id), gerentes, mapaDirect.avaliadoresPorAlvo),
        paridadeBase: parFonte?.base ?? null,
        paridadeMesRef: parFonte?.mesRef ?? null,
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

  const selects = [
    `${SELECT_AVALIACAO_META}, updated_at`,
    `${SELECT_AVALIACAO_META_SEM_IGNORAR}, updated_at`,
  ];
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
      .select('colaborador_id, avaliador_id, assiduidade, media_dia, justificativa_nota_baixa, updated_at')
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
    updated_at: raw.updated_at != null ? String(raw.updated_at) : null,
  }));
}

/** Carrega avaliações da semana de cobrança + semana corrente (envio na segunda). */
async function carregarAvaliacoesCobrancaLider(
  supabase: SupabaseAdmin,
  dataRefPrincipal: string,
  colaboradorIds: string[]
): Promise<AvaliacaoRow[]> {
  const semanas = semanasReferenciaCobrancaAvaliacaoLider();
  if (semanas.length === 1) {
    return carregarAvaliacoesSemana(supabase, dataRefPrincipal, colaboradorIds);
  }

  const out: AvaliacaoRow[] = [];
  for (const sem of semanas) {
    const rows = await carregarAvaliacoesSemana(supabase, sem, colaboradorIds);
    out.push(...rows);
  }
  return out;
}

async function carregarColaboradoresInfo(
  supabase: SupabaseAdmin,
  ids: string[],
  unidadeId?: string
): Promise<Map<string, ColabInfo>> {
  if (ids.length === 0) return new Map();

  let query = supabase
    .from('colaboradores')
    .select('id, nome, setor, role, tipo_escala, unidade_id, unidades(nome, slug)')
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
      tipo_escala: (c as { tipo_escala?: string | null }).tipo_escala ?? null,
    });
  }
  return out;
}

function escolherMelhorAvaliacaoDoLider(rows: AvaliacaoRow[], liderId: string): AvaliacaoRow | null {
  const doLider = rows.filter((r) => r.avaliador_id === liderId && !avaliacaoEstaIgnorada(r));
  if (doLider.length === 0) return null;

  const comFechamento = doLider.filter((r) => {
    const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
    return a !== 'fora_plantao';
  });
  const pool = comFechamento.length > 0 ? comFechamento : doLider;

  pool.sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  return pool[0] ?? null;
}

function statusResponsavel(
  liderId: string,
  rows: AvaliacaoRow[],
  rhIds: Set<string>
): StatusResponsavelLider {
  const melhor = escolherMelhorAvaliacaoDoLider(rows, liderId);
  if (!melhor) return 'pendente';
  if (avaliacaoFechaSemanaLider(melhor, rhIds)) return 'ja_avaliou';
  if (avaliacaoForaPlantaoLider(melhor, rhIds)) return 'marcou_fora_plantao';
  return 'pendente';
}

function colaboradorSemAvaliacaoAlguma(
  semLider: boolean,
  semRhVisita: boolean,
  elegivelRh: boolean
): boolean {
  if (!semLider) return false;
  return elegivelRh ? semRhVisita : true;
}

/** Semana monitorada nas pendências: semana passada (igual à tela do líder), salvo override explícito. */
export async function resolverDataRefPendentes(
  _supabase: SupabaseAdmin,
  dataIso?: string
): Promise<string> {
  const raw = dataIso?.trim() ?? '';
  if (raw && isDateIsoAvaliacao(raw)) {
    return inicioSemanaSegundaFeiraLocal(raw);
  }
  return semanaAvaliacaoEquipePadraoISO();
}

export async function calcularPendenciasSemana(
  supabase: SupabaseAdmin,
  opts: {
    dataIso?: string;
    unidadeId?: string;
    unidadeSlug?: string;
    filtro?: FiltroPendenciasSemana;
    busca?: string;
    rhAvaliadorId?: string;
  }
): Promise<ResultadoPendenciasSemana> {
  const dataRef = await resolverDataRefPendentes(supabase, opts.dataIso);
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

  const { data: todosColaboradores } = await supabase
    .from('colaboradores')
    .select('id, nome, role, setor, tipo_escala, unidade_id');

  const rhIds = construirConjuntoIdsRh(
    (todosColaboradores ?? []).map((c) => ({
      id: String(c.id),
      role: (c as { role?: string | null }).role,
      setor: (c as { setor?: string | null }).setor,
      nome: (c as { nome?: string | null }).nome,
    }))
  );

  const colsRedeBase = unidadeId
    ? (todosColaboradores ?? []).filter((c) => String(c.unidade_id ?? '') === unidadeId)
    : (todosColaboradores ?? []);
  const idsRede = colsRedeBase
    .filter((c) => {
      const role = normalizePortalRole((c as { role?: string | null }).role);
      if (role !== 'colaborador') return false;
      if (nomeEhDanielTransversal((c as { nome?: string | null }).nome)) return false;
      if (colaboradorForaAvaliacaoSemanalEquipe(c as { tipo_escala?: string | null })) return false;
      return true;
    })
    .map((c) => String(c.id));
  colaboradorIds = Array.from(new Set([...colaboradorIds, ...idsRede]));

  if (unidadeId) {
    const idsUn = new Set(
      (todosColaboradores ?? [])
        .filter((c) => String(c.unidade_id ?? '') === unidadeId)
        .map((c) => String(c.id))
    );
    colaboradorIds = colaboradorIds.filter((id) => idsUn.has(id));
  }

  const colabInfo = await carregarColaboradoresInfo(supabase, colaboradorIds, unidadeId || undefined);
  colaboradorIds = colaboradorIds.filter((id) => {
    const c = colabInfo.get(id);
    if (!c || normalizePortalRole(c.role) !== 'colaborador') return false;
    return !colaboradorForaAvaliacaoSemanalEquipe(c);
  });

  const avaliacoes = await carregarAvaliacoesCobrancaLider(supabase, dataRef, colaboradorIds);

  const avalPorColab = new Map<string, AvaliacaoRow[]>();
  for (const a of avaliacoes) {
    const list = avalPorColab.get(a.colaborador_id) ?? [];
    list.push(a);
    avalPorColab.set(a.colaborador_id, list);
  }

  const filtro = opts.filtro ?? 'pendentes';
  const buscaNorm = opts.busca?.trim().toLowerCase() ?? '';
  const ehSexta = ehSextaSaoPaulo();
  const semanaAtual = dataRef;
  const itens: ItemPendenciaSemana[] = [];
  const resumo = {
    sem_lider: 0,
    sem_rh_complemento: 0,
    sem_rh_rede: 0,
    criticos: 0,
    criticos_sem_avaliacao: 0,
  };

  for (const cid of colaboradorIds) {
    const info = colabInfo.get(cid);
    if (!info) continue;

    if (buscaNorm) {
      const hay = `${info.nome} ${info.setor ?? ''} ${info.unidade_nome ?? ''}`.toLowerCase();
      if (!hay.includes(buscaNorm)) continue;
    }

    const rows = avalPorColab.get(cid) ?? [];
    if (colaboradorDeFeriasNasLinhas(rows)) continue;
    if (colaboradorDeLicencaOuAfastamentoNasLinhas(rows)) continue;

    const esperados = mapaEsperados.get(cid) ?? [];

    const temNotaGerente =
      esperados.length === 0 || colaboradorFechouSemanaPorAlgumLider(rows, rhIds);
    const temRh = rows.some((r) => avaliacaoFechaSemanaRh(r, rhIds));
    const elegivelRh = colaboradorElegivelVisitaRh(
      { id: cid, role: info.role, nome: info.nome },
      opts.rhAvaliadorId ?? 'rh-placeholder'
    );

    const responsaveis: ResponsavelLider[] = esperados.map((e) => ({
      lider_id: e.lider_id,
      lider_nome: e.lider_nome,
      papel: e.papel,
      status: statusResponsavel(e.lider_id, rows, rhIds),
      paridade: paridadeNoMes(e.paridadeBase, e.paridadeMesRef, mesDeDataIso(dataRef)),
    }));

    const { label: responsavel_lider_label, critico } = montarLabelResponsavel(responsaveis);
    const semLider = esperados.length > 0 && !temNotaGerente;
    const semRhVisita = elegivelRh && !temRh;
    const semRhComplemento = temNotaGerente && semRhVisita;
    const pendente = semLider || semRhVisita;

    if (!pendente) continue;

    if (semLider) resumo.sem_lider++;
    if (semRhComplemento) resumo.sem_rh_complemento++;
    if (semRhVisita) resumo.sem_rh_rede++;
    if (semLider && critico) resumo.criticos++;

    const semAvaliacao = colaboradorSemAvaliacaoAlguma(semLider, semRhVisita, elegivelRh);
    if (semAvaliacao) resumo.criticos_sem_avaliacao++;

    let tipo: TipoPendenciaItem | null = null;
    if (semLider && critico) tipo = 'critico_fora_plantao';
    else if (semAvaliacao && ehSexta) tipo = 'critico_sem_avaliacao';
    else if (semLider && semRhVisita) tipo = 'sem_lider_e_rh';
    else if (semLider) tipo = 'sem_lider';
    else if (semRhVisita) tipo = 'sem_rh';

    const incluir =
      filtro === 'pendentes' || filtro === 'todos'
        ? true
        : filtro === 'critico_sexta'
          ? semAvaliacao && ehSexta
          : filtro === 'gerente'
            ? semLider
            : filtro === 'rh_complemento'
              ? semRhComplemento
              : semRhVisita;

    if (!incluir || !tipo) continue;

    itens.push({
      colaborador_id: cid,
      colaborador_nome: info.nome,
      setor: info.setor,
      unidade_nome: info.unidade_nome,
      unidade_slug: info.unidade_slug,
      tipo,
      responsaveis_lider: semLider ? responsaveis.filter((r) => r.status !== 'ja_avaliou') : [],
      responsavel_lider_label: semLider ? responsavel_lider_label : '—',
      responsavel_rh_label: semRhVisita
        ? 'Keila (Visita RH)'
        : temRh && semLider
          ? 'RH ok — falta gerente'
          : null,
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
    meta: {
      eh_sexta: ehSexta,
      alerta_critico_sexta: ehSexta && resumo.criticos_sem_avaliacao > 0,
      semana_atual: semanaAtual,
      avaliacoes_registradas: avaliacoes.length,
    },
    itens,
  };
}
