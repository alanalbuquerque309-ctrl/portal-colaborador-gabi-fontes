import type { createAdminClient } from '@/lib/supabase/admin';
import {
  ESCALAS_DOCUMENTO_JUNHO_2026,
  folgaDiasParaTexto,
  gerarMes,
  normalizarNomeEscala,
  type ConfigEscala,
} from '@/lib/escala-calendario';

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

function acharColaborador(rows: ColabRow[], chavesNome: string[]): ColabRow | undefined {
  const keys = new Set(chavesNome.map(normalizarNomeEscala));
  return rows.find((r) => keys.has(normalizarNomeEscala(r.nome)));
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

  for (const perfil of ESCALAS_DOCUMENTO_JUNHO_2026) {
    const col = acharColaborador(cols, perfil.chavesNome);
    if (!col) {
      naoEncontrados.push(perfil.chavesNome.join(' / '));
      continue;
    }

    const dias = gerarMes(perfil.config, ANO, MES);

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

    await supabase
      .from('escalas')
      .delete()
      .eq('colaborador_id', col.id)
      .gte('data', DE)
      .lte('data', ATE);

    const payloads = dias.map((dia) => ({
      colaborador_id: col.id,
      data: dia.data,
      hora_entrada: dia.folga ? '00:00' : '08:00',
      hora_saida: dia.folga ? '00:00' : '17:00',
      observacao: dia.observacao,
    }));

    const { error: errIns } = await supabase.from('escalas').upsert(payloads, {
      onConflict: 'colaborador_id,data',
    });

    if (errIns) {
      erros.push(`${col.nome} escalas: ${errIns.message}`);
      continue;
    }

    aplicados += 1;
    diasGravados += dias.length;
  }

  return {
    ok: erros.length === 0,
    aplicados,
    dias_gravados: diasGravados,
    nao_encontrados: naoEncontrados,
    erros,
  };
}
