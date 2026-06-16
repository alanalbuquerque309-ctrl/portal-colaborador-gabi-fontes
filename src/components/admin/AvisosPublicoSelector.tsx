'use client';

import { PUBLICOS_AVISO, type PublicoAvisoKey } from '@/lib/avisos-publico';

type Props = {
  value: PublicoAvisoKey;
  onChange: (key: PublicoAvisoKey) => void;
};

export function AvisosPublicoSelector({ value, onChange }: Props) {
  return (
    <div>
      <span className="block text-sm font-medium text-coffee-base mb-2">Enviar para *</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Público do aviso">
        {PUBLICOS_AVISO.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`min-h-[52px] rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
              value === opt.key
                ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
            }`}
          >
            <span className="block text-sm font-semibold leading-snug">{opt.label}</span>
            <span className="block text-xs text-coffee-100 mt-0.5 leading-snug">{opt.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
