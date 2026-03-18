'use client';

import { useId } from 'react';

interface XicaraCarregandoProps {
  /** Tamanho: 'sm' para botões/inline, 'md' padrão, 'lg' para loading de página */
  size?: 'sm' | 'md' | 'lg';
  /** Texto exibido abaixo da xícara */
  label?: string;
  /** Classe CSS adicional */
  className?: string;
}

const sizes = {
  sm: { w: 32, h: 40 },
  md: { w: 56, h: 70 },
  lg: { w: 80, h: 100 },
};

export function XicaraCarregando({ size = 'md', label, className = '' }: XicaraCarregandoProps) {
  const { w, h } = sizes[size];
  const id = useId().replace(/:/g, '-');
  const clipId = `xicara-interior-${id}`;
  const gradId = `cafe-grad-${id}`;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-label={label || 'Carregando'}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <defs>
          {/* Máscara do interior da xícara para o líquido */}
          <clipPath id={clipId}>
            <path
              d="M18 12 L62 12 Q66 12 66 18 L66 80 Q66 86 60 86 L20 86 Q14 86 14 80 L14 18 Q14 12 18 12 Z"
              fill="white"
            />
          </clipPath>
          {/* Brilho sutil no líquido */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#925a41" />
            <stop offset="40%" stopColor="#bd8559" />
            <stop offset="100%" stopColor="#774b39" />
          </linearGradient>
        </defs>
        {/* Xícara - contorno */}
        <path
          d="M18 8 L62 8 Q68 8 70 16 L72 82 Q72 92 62 92 L18 92 Q8 92 8 82 L8 16 Q8 8 18 8 Z"
          stroke="#c99d75"
          strokeWidth="3"
          fill="#FDFBF7"
          strokeLinejoin="round"
        />
        {/* Alça */}
        <path
          d="M72 28 Q92 28 92 50 Q92 72 72 72"
          stroke="#c99d75"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Líquido enchendo - animado */}
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="14"
            y="12"
            width="52"
            height="74"
            fill={`url(#${gradId})`}
            className="animate-xicara-encher origin-bottom"
          />
        </g>
      </svg>
      {label && (
        <p className="text-coffee-100 text-sm animate-pulse">{label}</p>
      )}
    </div>
  );
}
