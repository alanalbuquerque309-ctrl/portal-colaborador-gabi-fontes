'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

type Props = {
  conteudo: string;
  className?: string;
};

const renderers: Components = {
  h1: ({ children }) => (
    <h1 className="font-display text-xl font-bold text-cafeteria-900 mt-6 mb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-lg font-bold text-cafeteria-900 mt-8 mb-3 pb-2 border-b border-dourado-300/60 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-base font-bold text-coffee-base mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-cafeteria-800 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-coffee-base">{children}</strong>,
  em: ({ children }) => <em className="text-cafeteria-600 not-italic">{children}</em>,
  blockquote: ({ children }) => (
    <div className="my-4 rounded-xl border-l-4 border-dourado-400 bg-gradient-to-r from-dourado-50/80 to-cream-50 px-4 py-3">
      {children}
    </div>
  ),
  hr: () => (
    <div className="my-6 flex items-center justify-center gap-2">
      <span className="h-px flex-1 bg-dourado-300/50" />
      <span className="text-dourado-400 text-xs">&#9679;</span>
      <span className="h-px flex-1 bg-dourado-300/50" />
    </div>
  ),
  ul: ({ children }) => <ul className="space-y-1.5 my-3 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1.5 my-3 pl-1 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => (
    <li className="text-sm text-cafeteria-800 leading-relaxed flex items-start gap-2">
      <span className="text-dourado-500 mt-1 shrink-0">&#8226;</span>
      <span>{children}</span>
    </li>
  ),
};

export function TreinamentoRichText({ conteudo, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-cafeteria-200/80 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <div className="bg-gradient-to-r from-dourado-100 via-dourado-50 to-cream-50 px-5 py-4 border-b border-dourado-200/60">
        <p className="text-xs font-semibold uppercase tracking-widest text-dourado-700">
          Material de treinamento
        </p>
      </div>
      <div className="px-5 py-5">
        <ReactMarkdown components={renderers}>{conteudo}</ReactMarkdown>
      </div>
    </div>
  );
}
