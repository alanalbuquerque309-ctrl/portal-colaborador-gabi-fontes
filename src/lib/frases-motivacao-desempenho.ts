export type MotivacaoVisual = {
  nivel: string;
  cor: string;
  efeito: 'normal' | 'neon';
  texto: string;
};

type Faixa = {
  id: '1-2' | '2.1-3' | '3.1-4' | '4.1-4.9' | '5';
  nivel: string;
  cor: string;
  efeito: 'normal' | 'neon';
  min: number;
  max: number;
  frases: string[];
};

const FAIXAS: Faixa[] = [
  {
    id: '1-2',
    nivel: '1.0 a 2.0 estrelas',
    cor: '#A2D2FF',
    efeito: 'normal',
    min: 1.0,
    max: 2.0,
    frases: [
      'Sabemos que você tem capacidade para entregar muito mais. Que tal transformarmos essa média em um ponto de partida para uma nova fase da sua jornada com a gente?',
      'O seu potencial ainda não está totalmente visível nos seus resultados. Vamos focar em superar os desafios atuais? Queremos ver o seu melhor brilhando na nossa operação!',
      'Cada dia é uma nova oportunidade de evoluir. Sua trajetória até aqui pode ser muito mais forte se focarmos juntos em ajustar os detalhes e subir o nível da sua entrega.',
      'Acreditamos que você pode ir muito além. Que tal revisarmos os processos básicos e começar a subir essa pontuação degrau por degrau?',
      'Todo grande profissional começou superando desafios iniciais. Foque na sua evolução pessoal e veja sua média crescer junto com o seu aprendizado!',
    ],
  },
  {
    id: '2.1-3',
    nivel: '2.1 a 3.0 estrelas',
    cor: '#BDE0FE',
    efeito: 'normal',
    min: 2.1,
    max: 3.0,
    frases: [
      'Você já domina o básico, mas o seu talento pode te levar além. Que tal sair da zona de conforto e mostrar que você está pronto para os próximos desafios da nossa marca?',
      'Sua constância é boa, mas o que nos diferencia é o encantamento nos detalhes. Vamos subir um degrau nessa média e mostrar que você busca a excelência em tudo o que faz?',
      'Bom trabalho até aqui, mas não pare por aí! Você tem perfil para estar entre os melhores do nosso time. Foque no diferencial e veja sua pontuação acompanhar seu crescimento.',
      'Você já é parte importante do nosso fluxo, mas sabemos que você tem fôlego para ser um destaque. Vamos buscar a quarta estrela com foco total na qualidade?',
      'Sua média mostra que você é funcional e produtivo. Agora, o desafio é colocar a sua marca pessoal em cada tarefa e subir para o nível de elite.',
    ],
  },
  {
    id: '3.1-4',
    nivel: '3.1 a 4.0 estrelas',
    cor: '#06D6A0',
    efeito: 'normal',
    min: 3.1,
    max: 4.0,
    frases: [
      'Sua trajetória mostra um profissional comprometido e de confiança. Você está muito perto do nível máximo; mantenha esse foco para se tornar uma das nossas maiores referências!',
      'Sua evolução é nítida e sua dedicação faz a diferença na nossa unidade. Continue refinando seus processos, pois você já é um dos pilares do nosso padrão de qualidade.',
      'Parabéns pela consistência! Sua média reflete um trabalho bem feito e uma postura profissional. O caminho para o topo está aberto, continue subindo com essa mesma garra.',
      'Você é um profissional que entrega o que promete e vai além. Mantenha essa energia e foque nos detalhes finais; você está a um passo de se tornar um modelo para todos.',
      'Sua entrega sólida é motivo de orgulho para o time. Continue buscando o refinamento técnico e comportamental; seu crescimento é proporcional ao seu empenho.',
    ],
  },
  {
    id: '4.1-4.9',
    nivel: '4.1 a 4.9 estrelas',
    cor: '#FF9F1C',
    efeito: 'normal',
    min: 4.1,
    max: 4.9,
    frases: [
      'Sua média é o reflexo de um profissional que entendeu que a perfeição mora nos detalhes. Você está na elite da nossa operação e é um orgulho acompanhar sua entrega!',
      'Desempenho brilhante! Você hoje é o modelo do que buscamos: atitude, padrão e eficiência. Continue assim, você está quase tocando o ápice da nossa jornada.',
      'Sua pontuação reflete quem veste a camisa com orgulho e profissionalismo. Você não apenas faz o seu trabalho, você eleva o nível de todos ao seu redor. Parabéns!',
      'Você atingiu um nível de maestria que poucos alcançam. Sua consistência é a prova de que você encara o trabalho com atitude de dono. O topo te espera!',
      'Impressionante! Sua trajetória é marcada pela busca constante da excelência. Mantenha essa chama acesa, você é uma peça fundamental no sucesso da nossa marca.',
    ],
  },
  {
    id: '5',
    nivel: '5.0 estrelas',
    cor: '#FFD166',
    efeito: 'neon',
    min: 5.0,
    max: 5.0,
    frases: [
      'VOCÊ ATINGIU A PERFEIÇÃO! Sua nota máxima é a prova de que a excelência não é um ato, mas um hábito. Você é a alma do Jeito Gabi Fontes de ser. Simplesmente impecável!',
      'ESTADO DE ARTE! Você não apenas cumpre metas, você redefine o que é possível. 5 estrelas é para quem é extraordinário, e hoje, esse título é todo seu. Parabéns, mestre!',
      'REFERÊNCIA ABSOLUTA! Ver um colaborador atingir essa média é a nossa maior satisfação. Você é o padrão ouro da nossa empresa e o espelho para todos que querem crescer!',
      'IMPERADOR(A) DA EXCELÊNCIA! Você conquistou o topo com suor, talento e um olhar clínico. Sua trajetória é a nossa maior história de sucesso. Obrigado por ser 5 estrelas!',
      'O NÍVEL GABI FONTES EM PESSOA! Você transformou cada diretriz em arte. Sua média 5 estrelas brilha tanto quanto o seu futuro com a gente. Você é a nossa maior inspiração!',
    ],
  },
];

function semanaISOHoje(): string {
  const now = new Date();
  const dt = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function faixaPorMedia(media: number | null): Faixa {
  const score = media == null || Number.isNaN(media) ? 1 : Math.max(1, Math.min(5, media));
  if (score >= 5) return FAIXAS[4];
  if (score >= 4.1) return FAIXAS[3];
  if (score >= 3.1) return FAIXAS[2];
  if (score >= 2.1) return FAIXAS[1];
  return FAIXAS[0];
}

export function estrelasParaFrase(media: number | null): 1 | 2 | 3 | 4 | 5 {
  const score = media == null || Number.isNaN(media) ? 1 : Math.max(1, Math.min(5, media));
  const arredondado = Math.round(score);
  return Math.max(1, Math.min(5, arredondado)) as 1 | 2 | 3 | 4 | 5;
}

export function motivacaoSemanalPorPontuacao(media: number | null): MotivacaoVisual {
  const faixa = faixaPorMedia(media);
  const semanaRef = semanaISOHoje();
  const hashBase = `${faixa.id}|${semanaRef}`;
  let h = 0;
  for (let i = 0; i < hashBase.length; i++) {
    h = (h << 5) - h + hashBase.charCodeAt(i);
    h |= 0;
  }
  const idx = Math.abs(h) % faixa.frases.length;
  return {
    nivel: faixa.nivel,
    cor: faixa.cor,
    efeito: faixa.efeito,
    texto: faixa.frases[idx] ?? faixa.frases[0],
  };
}

export function fraseMotivacionalDesempenho(media: number | null): string {
  return motivacaoSemanalPorPontuacao(media).texto;
}
