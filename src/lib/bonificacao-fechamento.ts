import type { createAdminClient } from '@/lib/supabase/admin';
import { calcularIndicesBonificacao, type EntradaIndiceBonificacao } from '@/lib/bonificacao-indice';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

function primeiroDiaMes(iso: string): string {
  const [y, m] = iso.split('-');
  return `${y}-${m}-01`;
}

function ultimoDiaMes(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0);
  const mm = String(last.getMonth() + 1).padStart(2, '0');
  const dd = String(last.getDate()).padStart(2, '0');
  return `${last.getFullYear()}-${mm}-${dd}`;
}

export async function montarFechamentoBonificacao(
  supabase: SupabaseAdmin,
  opts: { mesReferencia: string; unidadeId?: string | null }
) {
  const inicio = primeiroDiaMes(opts.mesReferencia);
  const fim = ultimoDiaMes(opts.mesReferencia);

  let qColab = supabase
    .from('colaboradores')
    .select('id, nome, setor, role, unidade_id, operacao_apto')
    .eq('role', 'colaborador');

  if (opts.unidadeId) {
    qColab = qColab.eq('unidade_id', opts.unidadeId);
  }

  const { data: colaboradores, error: errColab } = await qColab;
  if (errColab) {
    if (/operacao_apto/i.test(errColab.message)) {
      throw new Error(
        'Coluna operacao_apto ausente. Aplique a migration 035_operacao_apto.sql no Supabase.'
      );
    }
    throw new Error(errColab.message);
  }

  const ids = (colaboradores ?? []).map((c) => String(c.id));
  if (ids.length === 0) {
    return { inicio, fim, linhas: [] as ReturnType<typeof calcularIndicesBonificacao> };
  }

  const { data: avalRows, error: errAval } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, data_referencia, assiduidade, media_dia')
    .in('colaborador_id', ids)
    .gte('data_referencia', inicio)
    .lte('data_referencia', fim);

  if (errAval) throw new Error(errAval.message);

  const avalPorColab = new Map<string, EntradaIndiceBonificacao['semanas']>();
  for (const row of avalRows ?? []) {
    const cid = String(row.colaborador_id);
    const list = avalPorColab.get(cid) ?? [];
    list.push({
      data_referencia: String(row.data_referencia),
      assiduidade: row.assiduidade as string | null,
      media_dia: row.media_dia as number | null,
    });
    avalPorColab.set(cid, list);
  }

  let trofeusPorColab = new Map<string, number>();
  const { data: trofeusRows, error: errTrof } = await supabase
    .from('trofeus_entre_pares')
    .select('destinatario_id')
    .in('destinatario_id', ids)
    .gte('semana_inicio', inicio)
    .lte('semana_inicio', fim);

  if (errTrof && !/trofeus_entre_pares/i.test(errTrof.message)) {
    throw new Error(errTrof.message);
  }
  if (!errTrof) {
    for (const row of trofeusRows ?? []) {
      const cid = String(row.destinatario_id);
      trofeusPorColab.set(cid, (trofeusPorColab.get(cid) ?? 0) + 1);
    }
  }

  const entradas: EntradaIndiceBonificacao[] = (colaboradores ?? []).map((c) => {
    const id = String(c.id);
    const operacaoAptoCol = c as { operacao_apto?: boolean };
    return {
      id,
      nome: String(c.nome ?? ''),
      setor: (c.setor as string | null) ?? null,
      operacao_apto: operacaoAptoCol.operacao_apto === true,
      semanas: avalPorColab.get(id) ?? [],
      trofeus_recebidos_mes: trofeusPorColab.get(id) ?? 0,
    };
  });

  const linhas = calcularIndicesBonificacao(entradas);
  const somaIndices = linhas.reduce((s, l) => s + l.indice_final, 0);

  return {
    inicio,
    fim,
    linhas: linhas.map((l) => ({
      ...l,
      peso_sugerido_pct:
        somaIndices > 0 ? Math.round((l.indice_final / somaIndices) * 10000) / 100 : 0,
    })),
  };
}
