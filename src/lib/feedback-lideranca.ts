export type PilarLideranca = 'exemplo' | 'comunicacao' | 'suporte' | 'justica' | 'clima';

export type NotasLideranca = Record<PilarLideranca, number>;

export type FeedbackLideranca = {
  mediaGeral: number;
  pilarMaisFraco: PilarLideranca;
  notaMaisBaixa: number;
  feedbackCirurgico: string | null;
  feedbackFaixa: string;
  visual: {
    nivel: string;
    cor: string;
    efeito: 'normal' | 'neon';
  };
};

const CIRURGICO: Record<PilarLideranca, string[]> = {
  exemplo: [
    'A equipe observa seus passos antes de seguir suas ordens. Para elevar sua media, foque em ser o primeiro a cumprir cada detalhe do nosso Manual de Conduta.',
    'Sua autoridade vem do seu exemplo. Se voce quer excelencia do time, demonstre essa excelencia em cada uniforme usado e em cada processo seguido.',
    'A percepcao de lideranca comeca na postura. Reajuste suas atitudes diarias para que o time veja em voce o padrao de qualidade que esperamos na Gabi Fontes.',
    'O time sente uma desconexao entre o que e pedido e o que e praticado. Lidere pelo exemplo e vera a confianca da equipe subir naturalmente.',
    'Ser lider e ser o guardiao da cultura. Mostre que voce nao abre mao do nosso padrao e o time tera orgulho de seguir seus passos.',
  ],
  comunicacao: [
    "Existem ruidos que estao atrasando o time. Busque ser mais claro nas instrucoes e certifique-se de que todos entenderam o 'porque' de cada tarefa.",
    'Comunicar nao e apenas falar, e garantir que a mensagem chegou. Tente ouvir mais a equipe e simplificar os comandos para evitar erros de execucao.',
    'A equipe sente falta de uma direcao mais objetiva. Invista tempo explicando os processos; o tempo gasto comunicando bem economiza o tempo de refazer o trabalho.',
    'Melhore o alinhamento com seu time. Quando as metas e regras sao ditas com clareza e transparencia, o ambiente se torna muito mais produtivo.',
    'A boa comunicacao evita o caos. Antes de cobrar um resultado, verifique se a orientacao foi passada de forma justa e compreensivel para todos.',
  ],
  suporte: [
    "Lideranca e suporte. Sua equipe sente falta da sua presenca tecnica nos momentos de maior pressao; esteja mais proximo do 'chao de loja'.",
    'Quando o time enfrenta um desafio tecnico, ele olha para voce. Mostre-se mais disponivel para resolver problemas de insumos ou operacao junto com eles.',
    'Nao deixe sua equipe se sentir desamparada. Sua presenca ativa nos horarios de pico e o que traz seguranca para o time entregar o melhor servico.',
    'Apoiar a execucao e tao importante quanto planejar. Reforce seu papel de suporte e garanta que ninguem na sua unidade se sinta sozinho diante de um problema.',
    'Sua experiencia tecnica e um ativo para a loja. Use-a para treinar e apoiar o time na pratica, especialmente quando os processos parecerem dificeis.',
  ],
  justica: [
    'A percepcao de justica e a base do respeito. Foque em reconhecer os acertos tanto quanto aponta os erros; o time precisa de equilibrio nas avaliacoes.',
    'Feedback deve ser uma ferramenta de crescimento, nao apenas de cobranca. Elogie em publico e oriente em particular para manter a moral do time alta.',
    'A equipe sente que o reconhecimento esta abaixo do esperado. Valorize o esforco individual e seja criterioso e justo ao pontuar as falhas de cada um.',
    'Transparencia e tudo. Ao dar um feedback, explique os criterios e mostre como o colaborador pode evoluir. Isso gera confianca e admiracao.',
    'Cuidado com o favoritismo ou com a falta de elogios. Uma lideranca justa e aquela que enxerga o valor de todos e avalia com base em dados, nao em emocoes.',
  ],
  clima: [
    'Sua energia dita o ritmo da unidade. Se o clima esta pesado, tente trazer mais leveza e equilibrio emocional para o seu turno; o cliente e o time sentem isso.',
    'A gestao das emocoes e o diferencial de um grande lider. Separe os problemas externos e mantenha o sorriso no rosto para liderar com um ambiente leve.',
    'O time sente falta de um ambiente mais acolhedor. Pequenos gestos de gentileza e uma postura mais positiva podem transformar a produtividade da loja.',
    'Liderar sob pressao exige calma. Quando voce mantem a serenidade, o time se sente seguro para trabalhar melhor, mesmo nos dias de movimento intenso.',
    "O 'Jeito Gabi Fontes' e sobre aconchego. Garanta que essa cultura comece na sua relacao com a equipe para que ela transborde para o atendimento ao cliente.",
  ],
};

const POR_FAIXA: Record<PilarLideranca, [string, string, string, string, string]> = {
  exemplo: [
    'Sua postura atual esta desconectada do nosso padrao. Para liderar na Gabi Fontes, voce precisa ser o primeiro a vestir o uniforme com orgulho e seguir cada processo do manual. O time so seguira quem da o exemplo real.',
    'A equipe sente que falta mais consistencia no seu exemplo diario. Liderar e ser o espelho da unidade; refine sua conduta para que o time tenha uma referencia clara de excelencia para seguir.',
    'Voce tem uma boa postura, mas para chegar ao topo, o seu exemplo deve ser inquestionavel em todos os momentos. Mantenha o padrao elevado mesmo quando achar que ninguem esta olhando.',
    'Sua conduta e um pilar de seguranca para a loja. Voce demonstra com acoes o que espera do time, e isso gera um respeito profundo. Continue sendo essa vitrine de profissionalismo!',
    'EXEMPLO ABSOLUTO! Voce e a personificacao dos nossos valores em cada gesto. Sua postura impecavel guia o time rumo a perfeicao. Voce e a nossa maior referencia!',
  ],
  comunicacao: [
    'Existe um bloqueio de comunicacao que esta gerando erros na equipe. Voce precisa parar, ouvir o time e aprender a transmitir as ordens de forma clara e paciente para evitar o caos na operacao.',
    "Suas orientacoes estao chegando com ruido. Tente ser mais objetivo e certifique-se de que todos entenderam o 'porque' das tarefas. Menos ordens isoladas e mais dialogo construtivo.",
    'Sua comunicacao e eficiente, mas pode ser mais inspiradora. Continue alinhando os processos com clareza, buscando garantir que cada colaborador se sinta parte do objetivo final da loja.',
    'Voce comunica com maestria e transparencia. O time sabe exatamente o que fazer e onde chegar gracas a sua direcao. Continue sendo esse guia preciso para a sua unidade!',
    'MESTRE DO ALINHAMENTO! Sua comunicacao e tao clara que elimina qualquer duvida. Voce cria uma sintonia perfeita no time onde todos falam a mesma lingua. Brilhante!',
  ],
  suporte: [
    'O time se sente abandonado nos momentos de pressao. Ser lider e estar na linha de frente quando os problemas surgem. Voce precisa dar o suporte tecnico necessario para que ninguem se sinta sozinho no erro.',
    "A equipe espera que voce seja mais presente na solucao dos problemas operacionais. Nao fique apenas na supervisao; desca ao 'chao de loja' e mostre que voce e a base de apoio que eles precisam.",
    'Voce da um bom suporte, mas pode antecipar mais os gargalos. Tente identificar onde o time tera dificuldade antes mesmo do problema acontecer e esteja la para facilitar o trabalho deles.',
    'Sua presenca traz seguranca para a operacao. O time sabe que pode contar com seu conhecimento tecnico para resolver qualquer desafio. Voce e o porto seguro desta unidade!',
    'SUPORTE LENDARIO! Voce e o mestre da resolucao de problemas. Sua presenca no turno transforma o dificil em facil e da ao time a confianca para voar alto. Impecavel!',
  ],
  justica: [
    'As avaliacoes estao sendo vistas como injustas pelo time. Corrigir sem elogiar ou avaliar sem criterios claros destroi a motivacao. E urgente equilibrar seus feedbacks e reconhecer quem merece.',
    'Cuidado com a falta de reconhecimento. O time sente que voce foca muito nos erros e pouco na valorizacao dos acertos. Seja mais criterioso e transparente ao pontuar o desempenho de cada um.',
    'Voce e um lider justo, mas pode ser mais frequente nos elogios. O feedback positivo e o que sustenta o bom trabalho a longo prazo. Continue sendo equilibrado em suas analises.',
    'Sua capacidade de avaliar com justica e um dos seus maiores pontos fortes. Voce sabe desenvolver as pessoas apontando o caminho do crescimento com etica e verdade. Continue assim!',
    'MAXIMA JUSTICA! Voce e o mentor ideal. Suas avaliacoes sao tao precisas e motivadoras que cada colaborador sente orgulho de ser guiado por voce. Voce e ouro puro!',
  ],
  clima: [
    'Sua energia esta pesando o ambiente da loja. Problemas externos nao podem interferir no sorriso que devemos ao time e ao cliente. Recupere a leveza para que a unidade volte a respirar acolhimento.',
    'A equipe sente oscilacoes no seu humor que afetam a produtividade. Liderar exige inteligencia emocional; foque em manter a serenidade e o ambiente agradavel, mesmo nos dias de muito movimento.',
    'O clima da loja e bom sob seu comando. Para chegar ao nivel 5, tente ser o motor de entusiasmo do time, transformando o cansaco em satisfacao atraves da sua atitude positiva.',
    'Voce mantem a unidade com uma energia contagiante. Sua inteligencia emocional permite que a loja funcione com leveza e profissionalismo. E um prazer trabalhar no seu turno!',
    'ICONE DO ACOLHIMENTO! Sua energia e o que faz a Gabi Fontes ser um refugio. Voce transforma pressao em prazer e faz cada colaborador se sentir feliz em estar ali. Voce brilha!',
  ],
};

function faixaPorNota(nota: number): 0 | 1 | 2 | 3 | 4 {
  if (nota <= 2) return 0;
  if (nota <= 3) return 1;
  if (nota <= 4) return 2;
  if (nota < 5) return 3;
  return 4;
}

function visualPorMedia(media: number): FeedbackLideranca['visual'] {
  if (media >= 5) return { nivel: '5.0 estrelas', cor: '#FFD166', efeito: 'neon' };
  if (media >= 4.1) return { nivel: '4.1 a 4.9 estrelas', cor: '#FF9F1C', efeito: 'normal' };
  if (media >= 3.1) return { nivel: '3.1 a 4.0 estrelas', cor: '#06D6A0', efeito: 'normal' };
  if (media >= 2.1) return { nivel: '2.1 a 3.0 estrelas', cor: '#BDE0FE', efeito: 'normal' };
  return { nivel: '1.0 a 2.0 estrelas', cor: '#A2D2FF', efeito: 'normal' };
}

function resolverPilarMaisFraco(notas: NotasLideranca): PilarLideranca {
  const min = Math.min(...Object.values(notas));
  const empatados = (Object.keys(notas) as PilarLideranca[]).filter((k) => notas[k] === min);
  if (empatados.includes('exemplo')) return 'exemplo';
  if (empatados.includes('clima')) return 'clima';
  return empatados[0] ?? 'exemplo';
}

function sortearFrase(lista: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return lista[Math.abs(h) % lista.length] ?? lista[0];
}

export function gerarFeedbackLideranca(notas: NotasLideranca, seed = ''): FeedbackLideranca {
  const mediaGeral = Math.round((Object.values(notas).reduce((a, b) => a + b, 0) / 5) * 100) / 100;
  const pilarMaisFraco = resolverPilarMaisFraco(notas);
  const notaMaisBaixa = notas[pilarMaisFraco];
  const visual = visualPorMedia(mediaGeral);
  const faixa = faixaPorNota(notaMaisBaixa);

  const feedbackFaixa = POR_FAIXA[pilarMaisFraco][faixa];
  const todosAltos = Object.values(notas).every((n) => n > 4.0);
  const feedbackCirurgico = todosAltos
    ? 'NIVEL NEON: sua lideranca esta em alto desempenho consistente. Continue sustentando o padrao com humildade, exemplo e foco em desenvolvimento do time.'
    : notaMaisBaixa < 3.5
      ? sortearFrase(CIRURGICO[pilarMaisFraco], `${seed}|${pilarMaisFraco}|${notaMaisBaixa}`)
      : null;

  return {
    mediaGeral,
    pilarMaisFraco,
    notaMaisBaixa,
    feedbackCirurgico,
    feedbackFaixa,
    visual,
  };
}
