'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hrefManual } from '@/lib/manual-por-setor';

type ManualHtmlLeituraProps = {
  titulo: string;
  arquivo: string;
  onReadyChange: (ok: boolean) => void;
};

/**
 * Manual em HTML (iframe) + obrigatoriedade de rolar até o fim + ciência explícita.
 */
export function ManualHtmlLeitura({ titulo, arquivo, onReadyChange }: ManualHtmlLeituraProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [chegouAoFim, setChegouAoFim] = useState(false);
  const [ciencia, setCiencia] = useState(false);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setChegouAoFim(true);
      },
      { root, rootMargin: '0px 0px -40px 0px', threshold: 0.01 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [arquivo]);

  const notify = useCallback(() => {
    onReadyChange(chegouAoFim && ciencia);
  }, [chegouAoFim, ciencia, onReadyChange]);

  useEffect(() => {
    notify();
  }, [notify]);

  const src = hrefManual(arquivo);

  return (
    <div className="space-y-4">
      <p className="text-sm text-coffee-base">
        <strong>{titulo}</strong> — role até o final do documento e confirme a ciência abaixo.
      </p>
      <div
        ref={scrollRef}
        className="max-h-[min(55vh,520px)] overflow-y-auto rounded-xl border-2 border-dourado-200 bg-cream-50 p-2"
        aria-label={titulo}
      >
        <iframe title={titulo} src={src} className="h-[min(50vh,480px)] w-full bg-white" />
        <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      </div>
      <label
        className={`flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-colors ${
          chegouAoFim ? 'border-dourado-300 bg-white' : 'border-cream-300 bg-cream-50'
        }`}
      >
        <input
          type="checkbox"
          checked={ciencia}
          disabled={!chegouAoFim}
          onChange={(e) => setCiencia(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-coffee-50 text-dourado-base"
        />
        <span className="text-sm text-coffee-base">
          {chegouAoFim
            ? 'Declaro que percorri este manual até o final e tive acesso ao conteúdo.'
            : 'Role o manual até o fim para habilitar a confirmação.'}
        </span>
      </label>
    </div>
  );
}
