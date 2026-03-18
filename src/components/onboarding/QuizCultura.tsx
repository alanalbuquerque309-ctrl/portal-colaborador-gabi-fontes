'use client';

import { useState, useEffect } from 'react';

interface QuizPergunta {
  id: string;
  pergunta: string;
  opcoes: { texto: string; correta: boolean }[];
}

const PERGUNTAS: QuizPergunta[] = [
  {
    id: 'brigadeiro',
    pergunta: 'Qual o segredo do nosso brigadeiro?',
    opcoes: [
      { texto: 'Leite Moça e Nescau', correta: true },
      { texto: 'Achocolatado comum', correta: false },
    ],
  },
  {
    id: 'regra',
    pergunta: 'Qual a nossa regra de ouro em caso de erro da casa?',
    opcoes: [
      { texto: 'O cliente não paga a conta', correta: true },
      { texto: 'Oferecemos 10% de desconto', correta: false },
    ],
  },
  {
    id: 'pilares',
    pergunta: 'Quais os nossos 3 pilares?',
    opcoes: [
      { texto: 'Qualidade, Aconchego e Atendimento', correta: true },
      { texto: 'Preço, Rapidez e Volume', correta: false },
    ],
  },
];

const ALERTA_ERRO = 'Quase lá! Releia os pilares no manual para prosseguir.';

interface QuizCulturaProps {
  onValidityChange?: (valid: boolean) => void;
}

export function QuizCultura({ onValidityChange }: QuizCulturaProps) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [ultimoErro, setUltimoErro] = useState(false);

  const indiceAtual = PERGUNTAS.findIndex((p) => !respostas[p.id]);
  const perguntaAtual = indiceAtual >= 0 ? PERGUNTAS[indiceAtual] : null;

  const todasCorretas =
    PERGUNTAS.length > 0 &&
    PERGUNTAS.every((p) => {
      const opcaoEscolhida = p.opcoes.find((o) => o.texto === respostas[p.id]);
      return opcaoEscolhida?.correta === true;
    });

  useEffect(() => {
    onValidityChange?.(todasCorretas);
  }, [todasCorretas, onValidityChange]);

  const handleEscolha = (perguntaId: string, opcao: { texto: string; correta: boolean }) => {
    setUltimoErro(false);
    if (opcao.correta) {
      setRespostas((prev) => ({ ...prev, [perguntaId]: opcao.texto }));
    } else {
      setUltimoErro(true);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-coffee-base text-sm font-medium">
        Responda corretamente para desbloquear o próximo passo.
      </p>
      {perguntaAtual ? (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-coffee-base text-lg">
            {perguntaAtual.pergunta}
          </h3>
          <div className="flex flex-col gap-3">
            {perguntaAtual.opcoes.map((opcao) => (
              <button
                key={opcao.texto}
                type="button"
                onClick={() => handleEscolha(perguntaAtual.id, opcao)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  respostas[perguntaAtual.id] === opcao.texto
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-100 text-coffee-base hover:border-dourado-200'
                }`}
              >
                {opcao.texto}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-dourado-50 border border-dourado-300 p-4">
          <p className="text-coffee-base font-medium flex items-center gap-2">
            <span className="text-dourado-base text-lg">✓</span> Todas as respostas corretas!
          </p>
        </div>
      )}
      {ultimoErro && (
        <div
          role="alert"
          className="rounded-xl bg-cream-200 border border-dourado-300 p-4 flex items-start gap-3"
        >
          <span className="text-dourado-base shrink-0 text-xl">💡</span>
          <p className="text-coffee-base text-sm">{ALERTA_ERRO}</p>
        </div>
      )}
    </div>
  );
}
