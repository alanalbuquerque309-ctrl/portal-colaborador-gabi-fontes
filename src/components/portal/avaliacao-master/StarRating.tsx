'use client';

const LEGENDAS: Record<number, string> = {
  1: 'Inaceitável',
  2: 'Insuficiente',
  3: 'Satisfatório (básico)',
  4: 'Bom / detalhes a melhorar',
  5: 'Impecável',
};

type Props = {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
  idPrefix: string;
};

export function StarRating({ label, value, onChange, disabled, idPrefix }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-cafeteria-800 min-w-[10rem]">{label}</span>
        <div className="flex gap-0.5" role="group" aria-label={label}>
          {[1, 2, 3, 4, 5].map((n) => {
            const ativo = value !== null && n <= value;
            return (
              <button
                key={n}
                type="button"
                id={`${idPrefix}-${n}`}
                disabled={disabled}
                title={LEGENDAS[n]}
                aria-label={`${n} estrela${n > 1 ? 's' : ''}: ${LEGENDAS[n]}`}
                onClick={() => onChange(n)}
                className={`p-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  ativo ? 'text-dourado-base' : 'text-cafeteria-300'
                } ${!disabled ? 'hover:text-dourado-600 focus:outline-none focus:ring-2 focus:ring-dourado-base/40' : ''}`}
              >
                <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            );
          })}
        </div>
        {value != null && (
          <span className="text-xs text-cafeteria-500 hidden sm:inline max-w-[12rem] leading-tight">
            {LEGENDAS[value]}
          </span>
        )}
      </div>
      <p className="text-[11px] text-cafeteria-500 pl-0 sm:pl-[10.5rem]">
        Passe o cursor nas estrelas para ver a legenda (1 a 5).
      </p>
    </div>
  );
}
