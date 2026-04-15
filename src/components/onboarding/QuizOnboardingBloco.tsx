'use client';

import { useEffect, useState } from 'react';
import type { PerguntaQuiz } from '@/content/onboarding-quizzes';

const MSG_PRIMEIRO_ERRO = 'Resposta incorreta. Tente novamente.';

interface QuizOnboardingBlocoProps {
  perguntas: PerguntaQuiz[];
  /** Mensagem quando erra pela 2.ª vez na mesma pergunta (antes de resetar fluxo) */
  mensagemSegundoErro: string;
  resetKey: number;
  onValidityChange: (valid: boolean) => void;
  onSegundoErro: () => void | Promise<void>;
}

/**
 * Uma pergunta de cada vez. 1.º erro: alerta. 2.º erro na mesma pergunta: `onSegundoErro`.
 */
export function QuizOnboardingBloco({
  perguntas,
  mensagemSegundoErro,
  resetKey,
  onValidityChange,
  onSegundoErro,
}: QuizOnboardingBlocoProps) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [errosPorId, setErrosPorId] = useState<Record<string, number>>({});
  const [ultimoErroMsg, setUltimoErroMsg] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    setRespostas({});
    setErrosPorId({});
    setUltimoErroMsg(null);
    setBloqueado(false);
  }, [resetKey]);

  const indiceAtual = perguntas.findIndex((p) => !respostas[p.id]);
  const perguntaAtual = indiceAtual >= 0 ? perguntas[indiceAtual] : null;

  const todasCorretas =
    perguntas.length > 0 &&
    perguntas.every((p) => {
      const escolhida = p.opcoes.find((o) => o.id === respostas[p.id]);
      return escolhida?.correta === true;
    });

  useEffect(() => {
    onValidityChange(todasCorretas && !bloqueado);
  }, [todasCorretas, bloqueado, onValidityChange]);

  const handleEscolha = async (perguntaId: string, opcaoId: string, correta: boolean) => {
    if (bloqueado) return;
    setUltimoErroMsg(null);
    if (correta) {
      setRespostas((prev) => ({ ...prev, [perguntaId]: opcaoId }));
      return;
    }
    const n = (errosPorId[perguntaId] || 0) + 1;
    setErrosPorId((prev) => ({ ...prev, [perguntaId]: n }));
    if (n >= 2) {
      setBloqueado(true);
      setUltimoErroMsg(mensagemSegundoErro);
      await Promise.resolve(onSegundoErro());
      return;
    }
    setUltimoErroMsg(MSG_PRIMEIRO_ERRO);
  };

  if (todasCorretas) {
    return (
      <div className="rounded-xl bg-dourado-50 border border-dourado-300 p-4">
        <p className="text-coffee-base font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-dourado-base shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Todas as respostas corretas. Use o botão <strong>Próximo</strong> abaixo para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {perguntaAtual ? (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-dourado-700">{perguntaAtual.tituloBloco}</p>
          <h3 className="font-display font-semibold text-coffee-base text-lg leading-snug">
            {perguntaAtual.pergunta}
          </h3>
          <div className="flex flex-col gap-3">
            {perguntaAtual.opcoes.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                disabled={bloqueado}
                onClick={() => void handleEscolha(perguntaAtual.id, opcao.id, opcao.correta)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm leading-relaxed ${
                  respostas[perguntaAtual.id] === opcao.id
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-100 text-coffee-base hover:border-dourado-200'
                } ${bloqueado ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <span className="font-semibold text-dourado-700 mr-2">{opcao.id.toUpperCase()})</span>
                {opcao.texto}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {ultimoErroMsg && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex items-start gap-3"
        >
          <span className="text-amber-800 shrink-0 text-lg leading-none" aria-hidden>
            !
          </span>
          <p className="text-coffee-base text-sm">{ultimoErroMsg}</p>
        </div>
      )}
    </div>
  );
}
