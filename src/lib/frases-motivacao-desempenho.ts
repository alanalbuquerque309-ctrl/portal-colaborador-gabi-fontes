/**
 * Frases motivacionais por nível de média mensal (escala ~1–5 estrelas, igual à média do dia).
 * Escolha estável por mês/colaborador via índice derivado.
 */

const POR_ESTRELA: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: [
    'Todo percurso começa com um passo: peça ajuda ao seu líder e foque em uma melhoria por vez.',
    'Dias difíceis passam; o que importa é levantar e tentar de novo com honestidade.',
    'Você pode virar o jogo: combine expectativas com a liderança e celebre pequenas vitórias.',
    'Reconhecemos o esforço; use o próximo mês para alinhar rotina e presença com a equipe.',
    'Sua contribuição importa — transforme este resultado em um plano simples de evolução.',
  ],
  2: [
    'Você já mostrou que consegue; agora é lapidar consistência no dia a dia.',
    'Há espaço para crescer: escolha um ponto e pratique até virar hábito.',
    'Pequenos ajustes geram grande diferença; converse com o time sobre o próximo passo.',
    'Persistência vale mais que perfeição; continue firme nos treinos de rotina.',
    'O resultado pede atenção — mas também mostra que você está no caminho da melhoria.',
  ],
  3: [
    'Bom equilíbrio: mantenha o ritmo e busque um detalhe a mais para se destacar.',
    'Você entrega o esperado; que tal surpreender em um critério por vez?',
    'Base sólida! Refine comunicação e presença para subir mais um degrau.',
    'Parabéns pela constância; foque no que mais gosta para brilhar ainda mais.',
    'Resultado saudável — continue ouvindo feedback e ajustando com calma.',
  ],
  4: [
    'Ótimo desempenho! Sua dedicação aparece nas notas; inspire quem está ao redor.',
    'Você está acima da média — compartilhe boas práticas com a equipe.',
    'Excelente mês: consistência e qualidade andando juntas.',
    'Parabéns! Use esse momento para mentorar alguém na loja.',
    'Muito bem — seu esforço traduz resultado; siga firme!',
  ],
  5: [
    'Excepcional! Você é referência neste período; obrigado pelo exemplo.',
    'Resultado de destaque: orgulho para a unidade e inspiração para todos.',
    'Brilhou! Continue elevando o padrão com humildade e energia.',
    'Top! Sua entrega mostra o melhor da Gabi Fontes.',
    'Impecável — celebre e mantenha o foco no que já funciona tão bem.',
  ],
};

function hashSelecionar(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % modulo;
}

/** Média mensal 0–5 → estrela 1–5 para frase. */
export function estrelasParaFrase(media: number | null): 1 | 2 | 3 | 4 | 5 {
  if (media == null || Number.isNaN(media)) return 3;
  const arredondado = Math.round(media);
  const clamped = Math.max(1, Math.min(5, arredondado));
  return clamped as 1 | 2 | 3 | 4 | 5;
}

export function fraseMotivacionalDesempenho(
  media: number | null,
  colaboradorId: string,
  mesRef: string
): string {
  const estrela = estrelasParaFrase(media);
  const lista = POR_ESTRELA[estrela];
  const idx = hashSelecionar(`${colaboradorId}|${mesRef}`, lista.length);
  return lista[idx] ?? lista[0];
}
