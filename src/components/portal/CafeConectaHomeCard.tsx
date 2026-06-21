'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { CAFE_CONECTA_REACOES } from '@/lib/cafe-conecta/feedback';

type Participante = {
  ordem: number;
  nome: string;
  setor_label: string;
};

type SorteioAtual = {
  id: string;
  participantes: Participante[];
  minha_reacao: string | null;
  feedback_total: number;
};

export function CafeConectaHomeCard() {
  const [loading, setLoading] = useState(true);
  const [sorteio, setSorteio] = useState<SorteioAtual | null>(null);
  const [minhaReacao, setMinhaReacao] = useState<string | null>(null);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    fetch('/api/portal/cafe-conecta/atual', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.sorteio?.participantes?.length >= 2) {
          setSorteio(data.sorteio);
          setMinhaReacao(data.sorteio.minha_reacao ?? null);
          setFeedbackTotal(Number(data.sorteio.feedback_total ?? 0));
        } else {
          setSorteio(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const enviarReacao = async (reacao: string) => {
    if (!sorteio?.id || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/portal/cafe-conecta/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteio_id: sorteio.id, reacao }),
      });
      const data = await res.json();
      if (data.ok) {
        setMinhaReacao(reacao);
        if (!minhaReacao) setFeedbackTotal((n) => n + 1);
      }
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-cafeteria-200 bg-white/80 p-6 flex justify-center min-h-[6rem]">
        <XicaraCarregando size="sm" label="Carregando…" />
      </section>
    );
  }

  if (!sorteio || sorteio.participantes.length < 2) return null;

  const [a, b] = [...sorteio.participantes].sort((x, y) => x.ordem - y.ordem);

  return (
    <section className="rounded-2xl border border-dourado-200 bg-gradient-to-br from-cream-50 to-white p-5 shadow-sm">
      <h2 className="text-lg font-display font-semibold text-cafeteria-900 flex items-center gap-2">
        <span aria-hidden>☕</span> Café Conecta da Semana
      </h2>
      <div className="mt-4 space-y-2 text-coffee-base">
        <p className="text-base font-semibold">
          {a.nome}{' '}
          <span className="font-normal text-cafeteria-600">({a.setor_label})</span>
        </p>
        <p className="text-cafeteria-400 text-center text-sm" aria-hidden>
          ✦
        </p>
        <p className="text-base font-semibold">
          {b.nome}{' '}
          <span className="font-normal text-cafeteria-600">({b.setor_label})</span>
        </p>
      </div>
      <p className="mt-4 text-sm text-cafeteria-700">Parabéns aos participantes!</p>

      <div className="mt-5 pt-4 border-t border-cream-200">
        <p className="text-sm font-medium text-cafeteria-800 mb-2">Como você vê esta iniciativa?</p>
        <div className="flex flex-wrap gap-2">
          {CAFE_CONECTA_REACOES.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={enviando}
              onClick={() => void enviarReacao(r.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm min-h-[44px] transition-colors ${
                minhaReacao === r.id
                  ? 'border-dourado-base bg-dourado-50 text-coffee-base font-medium'
                  : 'border-cream-300 bg-white hover:border-dourado-200 hover:bg-cream-50'
              } disabled:opacity-50`}
            >
              <span aria-hidden>{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
        {feedbackTotal > 0 && (
          <p className="text-xs text-cafeteria-500 mt-2">{feedbackTotal} reação(ões) nesta semana</p>
        )}
      </div>
    </section>
  );
}
