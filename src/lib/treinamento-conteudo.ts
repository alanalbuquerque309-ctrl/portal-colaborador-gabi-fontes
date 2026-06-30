export type TreinamentoTipoConteudo = 'video' | 'texto';

export function normalizarTipoConteudo(valor: string | null | undefined): TreinamentoTipoConteudo {
  return String(valor ?? '').trim().toLowerCase() === 'texto' ? 'texto' : 'video';
}

export function labelTipoConteudo(tipo: TreinamentoTipoConteudo): string {
  return tipo === 'texto' ? 'Texto' : 'Vídeo';
}
