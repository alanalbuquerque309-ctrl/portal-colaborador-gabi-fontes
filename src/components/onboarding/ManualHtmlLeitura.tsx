'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hrefManual, MANUAL_ASSET_VERSION } from '@/lib/manual-por-setor';

function iframeSrcAbs(arquivo: string): string {
  if (typeof window === 'undefined') return hrefManual(arquivo);
  return `${window.location.origin}${hrefManual(arquivo)}`;
}

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
  const [chegouAoFim, setChegouAoFim] = useState(false);
  const [ciencia, setCiencia] = useState(false);
  const [srcIframe, setSrcIframe] = useState<string>('');

  useEffect(() => {
    setChegouAoFim(false);
    setCiencia(false);
    setSrcIframe(iframeSrcAbs(arquivo));
  }, [arquivo, MANUAL_ASSET_VERSION]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const atualizarFim = () => {
      const limite = root.scrollHeight - root.clientHeight;
      const posicaoAtual = root.scrollTop;
      // Tolerancia pequena para variações de arredondamento entre navegadores.
      if (limite <= 2 || posicaoAtual >= limite - 8) {
        setChegouAoFim(true);
      }
    };

    atualizarFim();
    root.addEventListener('scroll', atualizarFim, { passive: true });
    return () => root.removeEventListener('scroll', atualizarFim);
  }, [arquivo]);

  const notify = useCallback(() => {
    onReadyChange(chegouAoFim && ciencia);
  }, [chegouAoFim, ciencia, onReadyChange]);

  useEffect(() => {
    notify();
  }, [notify]);

  const hrefRel = hrefManual(arquivo);

  return (
    <div className="space-y-4">
      <p className="text-sm text-coffee-base">
        <strong>{titulo}</strong> — role até o final do documento e confirme a ciência abaixo.
      </p>
      <p className="text-xs text-coffee-100">
        Se o manual não carregar na caixa abaixo,{' '}
        <a href={hrefRel} target="_blank" rel="noopener noreferrer" className="text-dourado-base font-medium underline">
          abra em nova aba
        </a>
        .
      </p>
      <div
        ref={scrollRef}
        className="max-h-[min(55vh,520px)] overflow-y-auto rounded-xl border-2 border-dourado-200 bg-cream-50 p-2"
        aria-label={titulo}
      >
        {srcIframe ? (
          <iframe
            key={`${arquivo}-${MANUAL_ASSET_VERSION}`}
            title={titulo}
            src={srcIframe}
            className="h-[min(50vh,480px)] w-full bg-white"
          />
        ) : (
          <div className="h-[min(50vh,480px)] w-full bg-cream-100 flex items-center justify-center text-sm text-coffee-100">
            A carregar manual…
          </div>
        )}
        <div className="h-px w-full" aria-hidden />
      </div>
      {!chegouAoFim && (
        <button
          type="button"
          onClick={() => setChegouAoFim(true)}
          className="rounded-lg border border-dourado-300 bg-white px-3 py-2 text-xs font-medium text-coffee-base hover:bg-cream-50"
        >
          Já percorri o manual, habilitar confirmação
        </button>
      )}
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
