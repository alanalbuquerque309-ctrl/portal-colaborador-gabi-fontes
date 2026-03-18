'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';

const EMOCOES: { id: string; label: string; emoji: string; desc: string }[] = [
  { id: 'feliz', label: 'Feliz', emoji: '😊', desc: 'Ótimo dia!' },
  { id: 'tranquilo', label: 'Tranquilo', emoji: '😌', desc: 'Tudo bem' },
  { id: 'neutro', label: 'Neutro', emoji: '😐', desc: 'Sem novidades' },
  { id: 'cansado', label: 'Cansado', emoji: '😓', desc: 'Preciso de um respiro' },
  { id: 'frustrado', label: 'Frustrado', emoji: '😔', desc: 'Não está fácil' },
];

export function TermometroEmocional() {
  const [emocaoAtual, setEmocaoAtual] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) return;

    fetch('/api/portal/emocional', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setEmocaoAtual(data.emocao);
      });
  }, []);

  const handleEscolha = async (emocao: string) => {
    setEnviando(true);
    try {
      const res = await fetch('/api/portal/emocional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emocao }),
      });
      const data = await res.json();
      if (data.ok) setEmocaoAtual(emocao);
    } finally {
      setEnviando(false);
      setMostrar(false);
    }
  };

  return (
    <div className="rounded-xl border border-dourado-200 bg-cream-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-coffee-base text-sm">Como você está hoje?</h3>
          <p className="text-coffee-100 text-xs mt-0.5">Sua resposta é anônima no resumo.</p>
        </div>
        {emocaoAtual ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {EMOCOES.find((e) => e.id === emocaoAtual)?.emoji ?? '✓'}
            </span>
            <span className="text-sm text-coffee-base font-medium">
              {EMOCOES.find((e) => e.id === emocaoAtual)?.label ?? emocaoAtual}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrar(true)}
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-3 py-1.5 text-cream-100 text-sm font-medium hover:bg-dourado-400"
          >
            Responder
          </button>
        )}
      </div>

      {mostrar && (
        <div className="mt-4 pt-4 border-t border-cream-200">
          <div className="flex flex-wrap gap-2">
            {EMOCOES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => handleEscolha(e.id)}
                disabled={enviando}
                className="flex items-center gap-2 rounded-xl border-2 border-cream-300 bg-white px-4 py-2 text-sm hover:border-dourado-200 hover:bg-dourado-50 disabled:opacity-50 transition-colors"
              >
                <span className="text-xl">{e.emoji}</span>
                <span className="text-coffee-base">{e.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
