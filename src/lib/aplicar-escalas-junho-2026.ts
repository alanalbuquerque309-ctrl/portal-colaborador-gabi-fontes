import type { createAdminClient } from '@/lib/supabase/admin';
import { nomeCoincide } from '@/lib/avaliacao-direta';
import { slugsDoGrupoMural } from '@/lib/mural-unidade-grupo';
import {
  ESCALAS_DOCUMENTO_JUNHO_2026,
  folgaDiasParaTexto,
  gerarMes,
  parseFolgaDiasTexto,
  type ConfigEscala,
} from '@/lib/escala-calendario';

function parseFolgaDiasFromRow(row: { escala_folga_dias?: string | null }) {
  return parseFolgaDiasTexto(row.escala_folga_dias);
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const ANO = 2026;
const MES = 6;
const DE = `${ANO}-06-01`;
const ATE = `${ANO}-06-30`;

type ColabRow = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_slug: string;
};

function acharColaborador(
  rows: ColabRow[],
  chavesNome: string[],
  unidadeSlug?: string
): ColabRow | undefined {
  const slugs =
    unidadeSlug && slugsDoGrupoMural(unidadeSlug).length > 1
      ? slugsDoGrupoMural(unidadeSlug)
      : unidadeSlug
        ? [unidadeSlug]
        : [];
  const pool =
    slugs.length > 0 ? rows.filter((r) => slugs.includes(r.unidade_slug)) : rows;
  const busca = pool.length > 0 ? pool : rows;

  for (const chave of chavesNome) {
    const hits = busca.filter((r) => nomeCoincide(r.nome, chave));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1 && unidadeSlug) {
      const naUnidade = hits.filter((r) => r.unidade_slug === unidadeSlug);
      if (naUnidade.length === 1) return naUnidade[0];
    }
    if (hits.length > 0) return hits[0];
  }
  return undefined;
}

async function materializarJunhoNoBanco(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  config: ConfigEscala
): Promise<number> {
  const dias = gerarMes(config, ANO, MES);
  await supabase
    .from('escalas')
    .delete()
    .eq('colaborador_id', colaboradorId)
    .gte('data', DE)
    .lte('data', ATE);

  const payloads = dias.map((dia) => ({
    colaborador_id: colaboradorId,
    data: dia.data,
    hora_entrada: dia.folga ? '00:00' : '08:00',
    hora_saida: dia.folga ? '00:00' : '17:00',
    observacao: dia.observacao,
  }));

  const { error } = await supabase.from('escalas').upsert(payloads, {
    onConflict: 'colaborador_id,data',
  });
  if (error) throw new Error(error.message);
  return dias.length;
}

function folgaTextoDeConfig(config: ConfigEscala): string {
  return folgaDiasParaTexto(config.folgaDiasSemana, config.folgaDomingoSemanal);
}

/** Grava junho/2026 conforme documento «Folgas de domingo» (cadastro + tabela escalas). */
export async function aplicarEscalasJunho2026(supabase: SupabaseAdmin): Promise<{
  ok: boolean;
  aplicados: number;
  dias_gravados: number;
  nao_encontrados: string[];
  erros: string[];
}> {
  const naoEncontrados: string[] = [];
  const erros: string[] = [];
  let aplicados = 0;
  let diasGravados = 0;

  const { data: colsRaw, error: errCols } = await supabase
    .from('colaboradores')
    .select('id, nome, setor, unidades(slug)')
    .or('role.eq.colaborador,role.eq.admin,role.eq.gerente,role.eq.rh,role.eq.master,role.is.null');

  if (errCols) {
    if (/tipo_escala|column|does not exist/i.test(errCols.message)) {
      return {
        ok: false,
        aplicados: 0,
        dias_gravados: 0,
        nao_encontrados: [],
        erros: ['Migration 036 (tipo_escala) não aplicada no Supabase. Rode o SQL 036_tipo_escala_colaborador.sql.'],
      };
    }
    return {
      ok: false,
      aplicados: 0,
      dias_gravados: 0,
      nao_encontrados: [],
      erros: [errCols.message],
    };
  }

  const cols: ColabRow[] = (colsRaw ?? []).map((c: Record<string, unknown>) => {
    const un = c.unidades as { slug?: string } | { slug?: string }[] | null;
    const u = Array.isArray(un) ? un[0] : un;
    return {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      setor: (c.setor as string | null) ?? null,
      unidade_slug: String(u?.slug ?? ''),
    };
  });

  const idsDocumento = new Set<string>();

  for (const perfil of ESCALAS_DOCUMENTO_JUNHO_2026) {
    const col = acharColaborador(cols, perfil.chavesNome, perfil.unidadeSlug);
    if (!col) {
      naoEncontrados.push(perfil.chavesNome.join(' / '));
      continue;
    }
    idsDocumento.add(col.id);

    const { error: errUpd } = await supabase
      .from('colaboradores')
      .update({
        tipo_escala: perfil.config.tipo,
        escala_folga_dias: folgaTextoDeConfig(perfil.config),
        ...(perfil.setor ? { setor: perfil.setor } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', col.id);

    if (errUpd) {
      erros.push(`${col.nome}: ${errUpd.message}`);
      continue;
    }

    try {
      const n = await materializarJunhoNoBanco(supabase, col.id, perfil.config);
      aplicados += 1;
      diasGravados += n;
    } catch (e) {
      erros.push(`${col.nome} escalas: ${e instanceof Error ? e.message : 'erro'}`);
    }
  }

  const { data: comTipo } = await supabase
    .from('colaboradores')
    .select('id, nome, tipo_escala, escala_folga_dias')
    .in('tipo_escala', ['5x2', '6x1']);

  for (const row of comTipo ?? []) {
    const id = String(row.id);
    if (idsDocumento.has(id)) continue;
    const tipo = String(row.tipo_escala);
    if (tipo !== '5x2' && tipo !== '6x1') continue;
    const { folgaDiasSemana, folgaDomingoSemanal } = parseFolgaDiasFromRow(row);
    const config: ConfigEscala = {
      tipo,
      folgaDiasSemana,
      folgaDomingoSemanal,
    };
    try {
      const n = await materializarJunhoNoBanco(supabase, id, config);
      aplicados += 1;
      diasGravados += n;
    } catch (e) {
      erros.push(`${row.nome} (cadastro): ${e instanceof Error ? e.message : 'erro'}`);
    }
  }

  return {
    ok: erros.length === 0 && aplicados > 0,
    aplicados,
    dias_gravados: diasGravados,
    nao_encontrados: naoEncontrados,
    erros:
      aplicados === 0 && erros.length === 0
        ? [
            'Nenhum colaborador do documento foi encontrado no cadastro (conferir nomes no Supabase).',
            ...naoEncontrados.map((n) => `Não achado: ${n}`),
          ]
        : erros,
  };
}
