import type { createAdminClient } from '@/lib/supabase/admin';



type SupabaseAdmin = ReturnType<typeof createAdminClient>;



const CRIT =

  'id, colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas';



/** Do mais completo ao mínimo (proatividade, justificativa, edição). */

function selectsAvaliacaoLeituraEmOrdem(): string[] {

  const out: string[] = [];

  for (const withPro of [true, false]) {

    for (const withJust of [true, false]) {

      for (const withEdicao of [true, false]) {

        let s = CRIT;

        if (withPro) s += ', nota_proatividade';

        s += ', media_dia';

        if (withJust) s += ', justificativa_nota_baixa';

        if (withEdicao) s += ', edicao_utilizada';

        out.push(s);

      }

    }

  }

  return out;

}



const SELECTS_LEITURA = selectsAvaliacaoLeituraEmOrdem();



function erroColunaAusente(msg: string): boolean {

  const m = msg.toLowerCase();

  return m.includes('does not exist') || m.includes('schema cache');

}



function faltaColunaJustificativa(msg: string): boolean {

  const m = msg.toLowerCase();

  return m.includes('justificativa_nota_baixa') && erroColunaAusente(msg);

}



function faltaColunaEdicao(msg: string): boolean {

  const m = msg.toLowerCase();

  return m.includes('edicao_utilizada') && erroColunaAusente(msg);

}



function faltaColunaProatividade(msg: string): boolean {

  const m = msg.toLowerCase();

  return m.includes('nota_proatividade') && erroColunaAusente(msg);

}



export type AvaliacaoDiariaLeitura = {

  id?: string;

  colaborador_id: string;

  assiduidade: string;

  nota_vestimenta: number | null;

  nota_pontualidade: number | null;

  nota_trabalho_equipe: number | null;

  nota_desempenho_tarefas: number | null;

  nota_proatividade?: number | null;

  media_dia: number | null;

  justificativa_nota_baixa?: string | null;

  edicao_utilizada?: boolean;

};



function normalizarLinhaLeitura(r: Record<string, unknown>): AvaliacaoDiariaLeitura {

  return {

    ...(r as AvaliacaoDiariaLeitura),

    nota_proatividade:

      r.nota_proatividade === undefined ? null : (r.nota_proatividade as number | null),

    edicao_utilizada: r.edicao_utilizada === true,

    justificativa_nota_baixa:

      r.justificativa_nota_baixa === undefined ? null : (r.justificativa_nota_baixa as string | null),

  };

}



async function queryAvaliacoesSemana(

  supabase: SupabaseAdmin,

  select: string,

  dataReferencia: string,

  colaboradorIds: string[],

  avaliadorId?: string | null

) {

  let q = supabase

    .from('avaliacoes_diarias')

    .select(select)

    .eq('data_referencia', dataReferencia)

    .in('colaborador_id', colaboradorIds);

  if (avaliadorId) q = q.eq('avaliador_id', avaliadorId);

  return q;

}



/** Lê avaliações da semana; omite colunas ainda não migradas no Supabase. */

export async function selectAvaliacoesDiariasPorColaboradores(

  supabase: SupabaseAdmin,

  dataReferencia: string,

  colaboradorIds: string[],

  avaliadorId?: string | null

): Promise<{ rows: AvaliacaoDiariaLeitura[]; error: string | null }> {

  if (colaboradorIds.length === 0) return { rows: [], error: null };



  let lastError: string | null = null;

  for (const select of SELECTS_LEITURA) {

    const res = await queryAvaliacoesSemana(supabase, select, dataReferencia, colaboradorIds, avaliadorId);

    if (!res.error) {

      return {

        rows: (res.data ?? []).map((r) =>
          normalizarLinhaLeitura(r as unknown as Record<string, unknown>)
        ),

        error: null,

      };

    }

    lastError = res.error.message;

    if (!erroColunaAusente(res.error.message)) {

      return { rows: [], error: res.error.message };

    }

  }



  return { rows: [], error: lastError };

}



function stripColunasAusentesInsert(

  row: Record<string, unknown>,

  msg: string

): Record<string, unknown> | null {

  let next = { ...row };

  if (faltaColunaProatividade(msg)) {

    const { nota_proatividade: _p, ...rest } = next;

    next = rest;

    return next;

  }

  if (faltaColunaJustificativa(msg)) {

    const { justificativa_nota_baixa: _j, ...rest } = next;

    next = rest;

    return next;

  }

  if (faltaColunaEdicao(msg)) {

    const { edicao_utilizada: _e, ...rest } = next;

    next = rest;

    return next;

  }

  return null;

}



/** Insert com justificativa; omite colunas opcionais se migration não aplicada. */

export async function insertAvaliacaoDiariaCompat(

  supabase: SupabaseAdmin,

  row: Record<string, unknown>

): Promise<{ error: string | null }> {

  let payload: Record<string, unknown> = { ...row };

  for (let i = 0; i < 6; i++) {

    const { error } = await supabase.from('avaliacoes_diarias').insert(payload);

    if (!error) return { error: null };

    if (!erroColunaAusente(error.message)) return { error: error.message };

    const stripped = stripColunasAusentesInsert(payload, error.message);

    if (!stripped) return { error: error.message };

    payload = stripped;

  }

  return { error: 'Não foi possível gravar a avaliação (schema desatualizado).' };

}



/** Atualiza avaliação existente (edição única); omite colunas opcionais se migration não aplicada. */

export async function updateAvaliacaoDiariaCompat(

  supabase: SupabaseAdmin,

  id: string,

  row: Record<string, unknown>

): Promise<{ error: string | null }> {

  let payload: Record<string, unknown> = { ...row, edicao_utilizada: true, updated_at: new Date().toISOString() };

  for (let i = 0; i < 6; i++) {

    const { error } = await supabase.from('avaliacoes_diarias').update(payload).eq('id', id);

    if (!error) return { error: null };

    if (!erroColunaAusente(error.message)) return { error: error.message };

    const stripped = stripColunasAusentesInsert(payload, error.message);

    if (!stripped) return { error: error.message };

    payload = stripped;

  }

  return { error: 'Não foi possível atualizar a avaliação (schema desatualizado).' };

}



export { faltaColunaJustificativa, faltaColunaEdicao, faltaColunaProatividade };


