import type { SemanaMedia } from '@/lib/evolucao';

type Props = {
  pontos: SemanaMedia[];
  altura?: number;
  className?: string;
};

/** Sparkline SVG leve para histórico semanal. */
export function EvolucaoSparkline({ pontos, altura = 36, className = '' }: Props) {
  if (pontos.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-[10px] text-cafeteria-500 rounded-lg bg-cream-50 border border-cream-200 ${className}`}
        style={{ height: altura }}
      >
        Poucas semanas
      </div>
    );
  }

  const w = 120;
  const h = altura;
  const pad = 4;
  const vals = pontos.map((p) => p.media);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 5);
  const range = max - min || 1;

  const coords = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const ultimo = vals[vals.length - 1] ?? 0;
  const penultimo = vals[vals.length - 2] ?? ultimo;
  const cor = ultimo > penultimo ? '#059669' : ultimo < penultimo ? '#dc2626' : '#64748b';

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`w-full max-w-[140px] ${className}`}
      role="img"
      aria-label="Histórico das últimas semanas"
    >
      <polyline
        fill="none"
        stroke={cor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
      {coords.length > 0 && (
        <circle
          cx={coords[coords.length - 1]!.split(',')[0]}
          cy={coords[coords.length - 1]!.split(',')[1]}
          r="3"
          fill={cor}
        />
      )}
    </svg>
  );
}
