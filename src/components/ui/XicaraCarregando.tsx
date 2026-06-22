'use client';

import { useId } from 'react';

interface XicaraCarregandoProps {
  /** Tamanho: 'sm' inline/seção, 'md' padrão, 'lg' página inteira */
  size?: 'sm' | 'md' | 'lg';
  /** Texto abaixo da xícara */
  label?: string;
  className?: string;
}

const sizes = {
  sm: { w: 40, h: 52 },
  md: { w: 64, h: 84 },
  lg: { w: 96, h: 120 },
};

/**
 * Xícara realista semi-transparente; o café sobe de baixo para cima em loop.
 */
export function XicaraCarregando({ size = 'md', label, className = '' }: XicaraCarregandoProps) {
  const { w, h } = sizes[size];
  const id = useId().replace(/:/g, '-');
  const clipId = `xicara-interior-${id}`;
  const gradCafeId = `cafe-grad-${id}`;
  const gradVidroId = `vidro-grad-${id}`;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || 'Carregando'}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M22 28 L78 28 Q84 28 84 36 L82 96 Q81 104 74 104 L26 104 Q19 104 18 96 L16 36 Q16 28 22 28 Z" />
          </clipPath>
          <linearGradient id={gradCafeId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3d2317" />
            <stop offset="45%" stopColor="#6b4423" />
            <stop offset="100%" stopColor="#a0714f" />
          </linearGradient>
          <linearGradient id={gradVidroId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#fdfbf7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#e8dcc8" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Sombra da base */}
        <ellipse cx="50" cy="108" rx="28" ry="4" fill="#c99d75" fillOpacity="0.2" />

        {/* Corpo vidro / porcelana semi-transparente */}
        <path
          d="M22 24 L78 24 Q88 24 90 34 L88 98 Q86 108 74 108 L26 108 Q14 108 12 98 L10 34 Q10 24 22 24 Z"
          fill={`url(#${gradVidroId})`}
          stroke="#d4b896"
          strokeWidth="1.8"
          strokeLinejoin="round"
          opacity="0.88"
        />

        {/* Borda superior (borda da xícara) */}
        <ellipse cx="50" cy="24" rx="34" ry="5" fill="#fdfbf7" fillOpacity="0.5" stroke="#c99d75" strokeWidth="1.8" />

        {/* Alça */}
        <path
          d="M88 42 C104 42 108 58 108 72 C108 86 102 98 88 98"
          stroke="#c99d75"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Café enchendo */}
        <g clipPath={`url(#${clipId})`}>
          <g className="origin-[50px_104px] animate-xicara-encher" style={{ transformOrigin: '50px 104px' }}>
            <rect x="16" y="28" width="68" height="76" fill={`url(#${gradCafeId})`} />
            {/* Superfície / espuma */}
            <ellipse cx="50" cy="28" rx="30" ry="4" fill="#bd8559" fillOpacity="0.85" className="animate-xicara-espuma" />
          </g>
        </g>

        {/* Reflexo no vidro */}
        <path
          d="M24 32 Q28 60 26 88"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Vapor leve */}
        <g className="animate-xicara-vapor" opacity="0.45">
          <path d="M42 14 Q44 6 46 14" stroke="#c99d75" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M50 10 Q52 0 54 10" stroke="#c99d75" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M58 14 Q60 6 62 14" stroke="#c99d75" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </svg>
      {label && <p className="text-coffee-base/75 text-sm font-medium animate-pulse text-center">{label}</p>}
    </div>
  );
}
