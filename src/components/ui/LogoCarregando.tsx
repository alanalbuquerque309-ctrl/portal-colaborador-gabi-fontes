'use client';

import Image from 'next/image';

interface LogoCarregandoProps {
  /** Texto opcional abaixo da logo */
  label?: string;
  /** Tela cheia com fundo branco (splash ao abrir o app) */
  fullscreen?: boolean;
  /** Largura máxima da logo */
  size?: 'sm' | 'md' | 'lg';
  /** Logo em cinza pulsando até ganhar cor (estado de carregamento) */
  revelarCor?: boolean;
  className?: string;
}

const maxWidths = {
  sm: 160,
  md: 240,
  lg: 320,
};

export function LogoCarregando({
  label,
  fullscreen = false,
  size = 'lg',
  revelarCor = false,
  className = '',
}: LogoCarregandoProps) {
  const maxW = maxWidths[size];

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-label={label || 'Carregando'}
    >
      <Image
        src="/logo-gabi-fontes.png"
        alt="Gabi Fontes — Cafeteria & Doceria"
        width={maxW}
        height={Math.round(maxW * 0.72)}
        className={`h-auto w-full max-w-[min(88vw,320px)] object-contain ${
          revelarCor ? 'animate-logo-revelar-cor' : ''
        }`}
        style={{ maxWidth: maxW }}
        priority
      />
      {label && <p className="text-sm text-coffee-base/70 animate-pulse">{label}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">{content}</div>
    );
  }

  return content;
}
