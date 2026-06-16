import { metaTrofeuPar } from '@/lib/trofeus-pares';

export type LinhaTrofeuAgregavel = {
  destinatario_id: string;
  destinatario_nome: string;
  unidade_nome: string;
  tipo: string;
  trofeu_titulo: string;
  trofeu_emoji: string;
};

export type TrofeuResumoPorTipo = {
  tipo: string;
  titulo: string;
  emoji: string;
  quantidade: number;
};

export type RankingTrofeuAgregado = {
  posicao: number;
  destinatario_id: string;
  destinatario_nome: string;
  unidade_nome: string;
  total_trofeus: number;
  trofeus: TrofeuResumoPorTipo[];
};

/** Agrupa envios linha a linha em ranking por quem recebeu (maior total primeiro). */
export function agregarRankingTrofeusPares(linhas: LinhaTrofeuAgregavel[]): RankingTrofeuAgregado[] {
  const porPessoa = new Map<
    string,
    {
      destinatario_id: string;
      destinatario_nome: string;
      unidade_nome: string;
      porTipo: Map<string, TrofeuResumoPorTipo>;
      total: number;
    }
  >();

  for (const l of linhas) {
    const id = String(l.destinatario_id ?? '').trim() || l.destinatario_nome;
    let agg = porPessoa.get(id);
    if (!agg) {
      agg = {
        destinatario_id: String(l.destinatario_id ?? id),
        destinatario_nome: l.destinatario_nome,
        unidade_nome: l.unidade_nome,
        porTipo: new Map(),
        total: 0,
      };
      porPessoa.set(id, agg);
    }
    agg.total += 1;
    const tipo = String(l.tipo ?? '');
    const meta = metaTrofeuPar(tipo);
    const prev = agg.porTipo.get(tipo);
    if (prev) {
      prev.quantidade += 1;
    } else {
      agg.porTipo.set(tipo, {
        tipo,
        titulo: meta?.titulo ?? l.trofeu_titulo ?? tipo,
        emoji: meta?.emoji ?? l.trofeu_emoji ?? '🏅',
        quantidade: 1,
      });
    }
  }

  const sorted = Array.from(porPessoa.values())
    .filter((a) => a.total > 0)
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.destinatario_nome.localeCompare(b.destinatario_nome, 'pt-BR')
    );

  return sorted.map((a, i) => ({
    posicao: i + 1,
    destinatario_id: a.destinatario_id,
    destinatario_nome: a.destinatario_nome,
    unidade_nome: a.unidade_nome,
    total_trofeus: a.total,
    trofeus: Array.from(a.porTipo.values()).sort(
      (x, y) => y.quantidade - x.quantidade || x.titulo.localeCompare(y.titulo, 'pt-BR')
    ),
  }));
}
