/**
 * Perguntas do onboarding — editar aqui (ou mover para JSON) sem alterar lógica.
 * `correta: true` marca a opção certa (apenas uma por pergunta).
 */

export type OpcaoQuiz = { id: string; texto: string; correta: boolean };

export type PerguntaQuiz = {
  id: string;
  tituloBloco: string;
  pergunta: string;
  opcoes: OpcaoQuiz[];
};

/** Após assistir ao vídeo institucional */
export const PERGUNTAS_QUIZ_VIDEO: PerguntaQuiz[] = [
  {
    id: 'video_encantamento',
    tituloBloco: 'Foco na Experiência do Cliente (O "Encantamento")',
    pergunta:
      'No vídeo, Gabi reforça que o nosso café é o meio, mas não o fim. Qual é o real objetivo de cada interação com o cliente na Gabi Fontes?',
    opcoes: [
      { id: 'a', texto: 'Servir o produto exatamente como está na foto do cardápio o mais rápido possível.', correta: false },
      {
        id: 'b',
        texto:
          'Proporcionar um momento de "Encantamento", onde o cliente se sinta acolhido e especial através da nossa hospitalidade.',
        correta: true,
      },
      {
        id: 'c',
        texto: 'Manter a mesa limpa e o balcão organizado durante todo o turno de trabalho.',
        correta: false,
      },
    ],
  },
  {
    id: 'video_excelencia',
    tituloBloco: 'Foco no Padrão de Excelência',
    pergunta:
      'Gabi menciona que "detalhes constroem o todo". Como essa frase se aplica ao seu comportamento diário na loja?',
    opcoes: [
      {
        id: 'a',
        texto:
          'Significa que erros pequenos em detalhes (como uma louça mal seca ou um uniforme amassado) comprometem a percepção de qualidade de toda a marca.',
        correta: true,
      },
      {
        id: 'b',
        texto:
          'Significa que devemos focar apenas nas grandes tarefas, pois os pequenos detalhes o cliente não percebe.',
        correta: false,
      },
      {
        id: 'c',
        texto:
          'Significa que o líder é o único responsável por revisar os detalhes antes da abertura da loja.',
        correta: false,
      },
    ],
  },
  {
    id: 'video_atitude',
    tituloBloco: 'Foco em Atitude e Propósito',
    pergunta:
      'De acordo com a mensagem da Gabi para os novos colaboradores, qual é a atitude principal esperada de quem veste o nosso uniforme?',
    opcoes: [
      {
        id: 'a',
        texto: 'Cumprir rigorosamente o horário de entrada e saída, evitando horas extras.',
        correta: false,
      },
      {
        id: 'b',
        texto:
          'Ter "Atitude de Dono", zelando pelos recursos, pela limpeza e, principalmente, pela harmonia do ambiente.',
        correta: true,
      },
      {
        id: 'c',
        texto:
          'Focar exclusivamente nas tarefas técnicas do seu setor (Cozinha ou Salão) para evitar conflitos.',
        correta: false,
      },
    ],
  },
];

/** Após ler o Manual Geral (HTML) */
export const PERGUNTAS_QUIZ_MANUAL_GERAL: PerguntaQuiz[] = [
  {
    id: 'mg_postura',
    tituloBloco: 'Sobre Postura e Imagem Profissional',
    pergunta:
      'O Manual Geral estabelece padrões claros sobre o uso do uniforme e apresentação pessoal. Qual é a justificativa estratégica para esse rigor?',
    opcoes: [
      { id: 'a', texto: 'Apenas para que todos os funcionários fiquem iguais visualmente.', correta: false },
      {
        id: 'b',
        texto:
          'Porque o uniforme limpo e a apresentação impecável comunicam ao cliente nosso respeito pelo alimento e nosso padrão de higiene e profissionalismo.',
        correta: true,
      },
      {
        id: 'c',
        texto: 'Para facilitar a identificação dos colaboradores pelas câmeras de segurança.',
        correta: false,
      },
    ],
  },
  {
    id: 'mg_conflitos',
    tituloBloco: 'Sobre Comunicação e Conflitos (O pilar da Harmonia)',
    pergunta:
      'De acordo com as diretrizes de convivência, como deve ser tratada uma divergência ou insatisfação com um colega de trabalho durante o expediente?',
    opcoes: [
      {
        id: 'a',
        texto:
          'Deve ser discutida imediatamente no setor para resolver o problema na hora, mesmo na frente de clientes.',
        correta: false,
      },
      {
        id: 'b',
        texto: 'Deve ser guardada para si para evitar qualquer tipo de conversa com a liderança.',
        correta: false,
      },
      {
        id: 'c',
        texto:
          'Deve ser reportada ao líder direto em momento oportuno e em local reservado, priorizando sempre o respeito e a harmonia da equipe.',
        correta: true,
      },
    ],
  },
  {
    id: 'mg_dono',
    tituloBloco: 'Sobre Segurança e Zelo (Atitude de Dono)',
    pergunta:
      'O Manual Geral aborda o cuidado com os equipamentos e insumos. O que o conceito de "Atitude de Dono" espera de você ao identificar um desperdício ou um equipamento funcionando mal?',
    opcoes: [
      {
        id: 'a',
        texto:
          'Que você registre a ocorrência e comunique a liderança imediatamente, agindo como se o prejuízo fosse seu, buscando evitar perdas para a casa.',
        correta: true,
      },
      {
        id: 'b',
        texto:
          'Que você espere o final do turno para que o pessoal da manutenção perceba o problema sozinho.',
        correta: false,
      },
      {
        id: 'c',
        texto:
          'Que você tente consertar o equipamento por conta própria, mesmo sem treinamento técnico, para economizar tempo.',
        correta: false,
      },
    ],
  },
];

/** Variante B: usada após 2 erros para validar nova leitura do manual geral. */
export const PERGUNTAS_QUIZ_MANUAL_GERAL_B: PerguntaQuiz[] = [
  {
    id: 'mgb_higiene',
    tituloBloco: 'Sobre Higiene e Segurança',
    pergunta:
      'Qual atitude está mais alinhada ao padrão do Manual Geral quando se trata de higiene no posto de trabalho?',
    opcoes: [
      {
        id: 'a',
        texto:
          'Manter o posto limpo durante todo o turno, higienizando itens e superfícies conforme os procedimentos definidos.',
        correta: true,
      },
      {
        id: 'b',
        texto:
          'Fazer apenas uma limpeza completa no fim do expediente para ganhar agilidade durante o atendimento.',
        correta: false,
      },
      {
        id: 'c',
        texto:
          'Priorizar velocidade no serviço e deixar ajustes de higiene para quando o movimento diminuir.',
        correta: false,
      },
    ],
  },
  {
    id: 'mgb_cliente',
    tituloBloco: 'Sobre Atendimento e Acolhimento',
    pergunta:
      'No Manual Geral, qual é a conduta esperada no contato com o cliente, mesmo em momento de alta demanda?',
    opcoes: [
      {
        id: 'a',
        texto:
          'Manter cordialidade, clareza e postura acolhedora, preservando o padrão de experiência da marca.',
        correta: true,
      },
      {
        id: 'b',
        texto:
          'Reduzir interação para agilizar a fila, evitando explicações e personalizações durante picos.',
        correta: false,
      },
      {
        id: 'c',
        texto:
          'Focar apenas em clientes recorrentes, pois já conhecem o padrão e demandam menos orientação.',
        correta: false,
      },
    ],
  },
  {
    id: 'mgb_disciplina',
    tituloBloco: 'Sobre Rotina Operacional e Disciplina',
    pergunta:
      'Quando o manual define processos e checklists, qual é a melhor prática operacional esperada do colaborador?',
    opcoes: [
      {
        id: 'a',
        texto:
          'Seguir os processos e checklists de forma consistente, comunicando desvios ao líder imediatamente.',
        correta: true,
      },
      {
        id: 'b',
        texto:
          'Adaptar livremente as etapas para ganhar tempo, desde que o resultado final pareça satisfatório.',
        correta: false,
      },
      {
        id: 'c',
        texto:
          'Executar o checklist somente quando houver fiscalização direta da liderança para evitar retrabalho.',
        correta: false,
      },
    ],
  },
];
