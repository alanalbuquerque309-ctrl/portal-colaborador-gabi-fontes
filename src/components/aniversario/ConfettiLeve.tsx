'use client';

import { useEffect, useState } from 'react';

const CORES = ['#C9A227', '#E8C547', '#8B6914', '#F4E4BC', '#D4AF37'];

export function ConfettiLeve() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAtivo(!mq.matches);
    const onChange = () => setAtivo(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!ativo) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute w-1.5 h-2.5 rounded-sm opacity-80 animate-aniversario-confetti"
          style={{
            left: `${8 + ((i * 47) % 84)}%`,
            top: '-8%',
            backgroundColor: CORES[i % CORES.length],
            animationDelay: `${(i % 7) * 0.12}s`,
            animationDuration: `${1.8 + (i % 4) * 0.25}s`,
            transform: `rotate(${i * 24}deg)`,
          }}
        />
      ))}
    </div>
  );
}
