'use client';

import { legendaNotaCriterio, normalizarNotaCriterio, NOTA_CRITERIO_MAX } from '@/lib/avaliacao-notas';

type Props = {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
  idPrefix: string;
};

function preenchimentoEstrela(value: number | null, indice: number): 'vazio' | 'meio' | 'cheio' {
  if (value == null) return 'vazio';
  if (value >= indice) return 'cheio';
  if (value >= indice - 0.5) return 'meio';
  return 'vazio';
}

function IconeEstrela({ tipo }: { tipo: 'vazio' | 'meio' | 'cheio' }) {
  const cor = tipo === 'vazio' ? 'text-cafeteria-300' : 'text-dourado-base';
  return (
    <span className={`relative inline-block w-7 h-7 md:w-8 md:h-8 ${cor}`}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {tipo === 'meio' && (
        <svg
          className="absolute inset-0 w-full h-full text-cafeteria-200"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2v15.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
    </span>
  );
}

export function StarRating({ label, value, onChange, disabled, idPrefix }: Props) {
  const valorExib = value != null ? normalizarNotaCriterio(value) : null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-cafeteria-800 min-w-[10rem]">{label}</span>
        <div className="flex gap-0.5" role="group" aria-label={label}>
          {Array.from({ length: NOTA_CRITERIO_MAX }, (_, i) => i + 1).map((indice) => {
            const tipo = preenchimentoEstrela(valorExib, indice);
            return (
              <span key={indice} className="relative inline-flex">
                <button
                  type="button"
                  disabled={disabled}
                  title={`${indice - 0.5} — ${legendaNotaCriterio(indice - 0.5)}`}
                  aria-label={`${indice - 0.5} para ${label}`}
                  onClick={() => onChange(normalizarNotaCriterio(indice - 0.5))}
                  className={`absolute left-0 top-0 w-1/2 h-full z-10 rounded-l-md disabled:cursor-not-allowed ${
                    !disabled ? 'hover:bg-dourado-base/10' : ''
                  }`}
                />
                <button
                  type="button"
                  disabled={disabled}
                  title={`${indice} — ${legendaNotaCriterio(indice)}`}
                  aria-label={`${indice} para ${label}`}
                  onClick={() => onChange(normalizarNotaCriterio(indice))}
                  className={`absolute right-0 top-0 w-1/2 h-full z-10 rounded-r-md disabled:cursor-not-allowed ${
                    !disabled ? 'hover:bg-dourado-base/10' : ''
                  }`}
                />
                <span
                  id={`${idPrefix}-${indice}`}
                  className={`relative block p-1 pointer-events-none ${disabled ? 'opacity-40' : ''}`}
                >
                  <IconeEstrela tipo={tipo} />
                </span>
              </span>
            );
          })}
        </div>
        {valorExib != null && (
          <span className="text-xs text-cafeteria-600 font-medium tabular-nums">
            {Number.isInteger(valorExib) ? valorExib : valorExib.toFixed(1).replace('.', ',')}
          </span>
        )}
        {valorExib != null && (
          <span className="text-xs text-cafeteria-500 hidden sm:inline max-w-[12rem] leading-tight">
            {legendaNotaCriterio(valorExib)}
          </span>
        )}
      </div>
      <p className="text-xs sm:text-sm text-cafeteria-500 pl-0 sm:pl-[10.5rem]">
        Toque na metade esquerda ou direita da estrela (1 a 5 em meio ponto).
      </p>
    </div>
  );
}
