import type { ParidadePlantao } from '@/lib/plantao-12x36';

export type PapelAvaliadorEsperado = 'gerente_loja' | 'lider_setor' | 'avaliacao_direta';
export type StatusResponsavelLider = 'pendente' | 'marcou_fora_plantao' | 'ja_avaliou';
export type TipoPendenciaItem =
  | 'sem_lider'
  | 'sem_rh'
  | 'sem_lider_e_rh'
  | 'critico_fora_plantao'
  | 'critico_sem_avaliacao';

export type ResponsavelLider = {
  lider_id: string;
  lider_nome: string;
  papel: PapelAvaliadorEsperado;
  status: StatusResponsavelLider;
  paridade?: ParidadePlantao | null;
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

export type FiltroPendenciasSemana =
  | 'pendentes'
  | 'gerente'
  | 'rh_complemento'
  | 'rh_rede'
  | 'critico_sexta'
  | 'todos';

function lideresCobrancaPorItem(
  responsaveis: ResponsavelLider[],
  semLider: boolean
): ResponsavelLider[] {
  if (!semLider) return [];
  const pendentes = responsaveis.filter((r) => r.status === 'pendente');
  const pendentesGerente = pendentes.filter(
    (r) => r.papel === 'gerente_loja' || r.papel === 'avaliacao_direta'
  );

  if (pendentesGerente.length === 0) {
    return pendentes;
  }
  if (pendentesGerente.length === 1) {
    return pendentesGerente;
  }

  const plantaoCadastrado = pendentesGerente.some((r) => r.paridade != null);
  if (!plantaoCadastrado) {
    return pendentesGerente;
  }

  return pendentesGerente.filter((r) => r.paridade);
}

export function agregarLideresComPendenciaDeEnvio(
  itens: ItemPendenciaSemana[]
): Array<{ lider_id: string; lider_nome: string; total: number }> {
  const mapa = new Map<string, { lider_id: string; lider_nome: string; colabs: Set<string> }>();

  for (const item of itens) {
    const semLider =
      item.tipo === 'sem_lider' ||
      item.tipo === 'sem_lider_e_rh' ||
      item.tipo === 'critico_fora_plantao' ||
      item.tipo === 'critico_sem_avaliacao';
    if (!semLider) continue;

    for (const r of lideresCobrancaPorItem(item.responsaveis_lider, true)) {
      if (r.status !== 'pendente') continue;
      const cur = mapa.get(r.lider_id) ?? {
        lider_id: r.lider_id,
        lider_nome: r.lider_nome,
        colabs: new Set<string>(),
      };
      cur.colabs.add(item.colaborador_id);
      mapa.set(r.lider_id, cur);
    }
  }

  return Array.from(mapa.values())
    .map((e) => ({ lider_id: e.lider_id, lider_nome: e.lider_nome, total: e.colabs.size }))
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total || a.lider_nome.localeCompare(b.lider_nome, 'pt-BR'));
}
