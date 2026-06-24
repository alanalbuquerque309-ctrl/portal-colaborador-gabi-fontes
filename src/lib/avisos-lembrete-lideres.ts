import type { ItemPendenciaSemana, ResultadoPendenciasSemana } from '@/lib/avaliacao-pendentes-semana';
import { agregarLideresComPendenciaDeEnvio } from '@/lib/avaliacao-pendentes-semana';

export type LiderPendenteResumo = {
  lider_id: string;
  lider_nome: string;
  total: number;
  colaboradores: Array<{ nome: string; setor: string | null; unidade: string | null }>;
};

/** Líderes com colaboradores sem card de avaliação enviado na semana. */
export function agregarLideresComPendencia(itens: ItemPendenciaSemana[]): LiderPendenteResumo[] {
  const base = agregarLideresComPendenciaDeEnvio(itens);
  const nomesPorId = new Map<string, string>();
  for (const item of itens) {
    for (const r of item.responsaveis_lider) {
      nomesPorId.set(r.lider_id, r.lider_nome);
    }
  }

  const mapa = new Map<string, LiderPendenteResumo>();
  for (const row of base) {
    mapa.set(row.lider_id, {
      lider_id: row.lider_id,
      lider_nome: row.lider_nome,
      total: row.total,
      colaboradores: [],
    });
  }

  for (const item of itens) {
    const semLider =
      item.tipo === 'sem_lider' ||
      item.tipo === 'sem_lider_e_rh' ||
      item.tipo === 'critico_fora_plantao' ||
      item.tipo === 'critico_sem_avaliacao';
    if (!semLider) continue;
    for (const r of item.responsaveis_lider) {
      if (r.status !== 'pendente') continue;
      const entry = mapa.get(r.lider_id);
      if (!entry) continue;
      if (entry.colaboradores.some((c) => c.nome === item.colaborador_nome)) continue;
      entry.colaboradores.push({
        nome: item.colaborador_nome,
        setor: item.setor,
        unidade: item.unidade_nome,
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) =>
    b.total - a.total || a.lider_nome.localeCompare(b.lider_nome, 'pt-BR')
  );
}

export type PreviewAvisoLideres = {
  intervalo: string;
  data_referencia: string;
  titulo: string;
  conteudo: string;
  lideres: LiderPendenteResumo[];
  criticos_sem_avaliacao: number;
  total_pendentes_lider: number;
};

export function montarPreviewAvisoLideres(resultado: ResultadoPendenciasSemana): PreviewAvisoLideres {
  const lideres = agregarLideresComPendencia(resultado.itens);
  const totalPendentes = lideres.reduce((s, l) => s + l.total, 0);

  const linhasLideres = lideres.map((l) => {
    const nomes = l.colaboradores
      .map((c) => c.nome.split(/\s+/)[0])
      .slice(0, 8)
      .join(', ');
    const extra = l.colaboradores.length > 8 ? ` (+${l.colaboradores.length - 8})` : '';
    return `• ${l.lider_nome.split(/\s+/)[0]}: ${nomes}${extra}`;
  });

  const titulo = `Avaliações pendentes — semana ${resultado.intervalo}`;
  const conteudo = [
    `Semana ${resultado.intervalo}.`,
    '',
    'Ainda há colaboradores sem avaliação da liderança nesta semana. Acesse Avaliação Master no portal e conclua até hoje.',
    '',
    lideres.length > 0 ? 'Resumo por líder:' : 'Consulte Pendências da semana no admin.',
    ...linhasLideres,
    '',
    'Toque em Li e confirmo após revisar sua equipe ou registrar quem estava fora do plantão.',
  ].join('\n');

  return {
    intervalo: resultado.intervalo,
    data_referencia: resultado.data_referencia,
    titulo,
    conteudo,
    lideres,
    criticos_sem_avaliacao: resultado.resumo.criticos_sem_avaliacao,
    total_pendentes_lider: totalPendentes,
  };
}
