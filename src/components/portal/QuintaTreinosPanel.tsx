'use client';

import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';
import type { QuintaTreinoApresentador } from '@/lib/graos/quinta-treino';
import { getTermo } from '@/lib/tenant/terminology';

export type QuintaTreinoEmbedData = {
  titulo: string;
  resumo: string;
  apresentador?: QuintaTreinoApresentador | null;
  embed_url: string | null;
  formato?: 'horizontal' | 'shorts';
};

type Props = {
  ehQuinta: boolean;
  treinoColaborador?: QuintaTreinoEmbedData | null;
  treinoLider?: QuintaTreinoEmbedData | null;
  /** Texto curto acima dos blocos (ex.: gestão). */
  intro?: string;
  className?: string;
};

function BlocoTreino({
  rotulo,
  treino,
}: {
  rotulo: string;
  treino: QuintaTreinoEmbedData;
}) {
  if (!treino.embed_url) {
    return (
      <div className="rounded-lg border border-cafeteria-200 bg-cream-50 px-3 py-2 text-sm text-cafeteria-700">
        <p className="font-medium text-cafeteria-900">{rotulo}</p>
        <p className="mt-1">{treino.resumo}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-dourado-700">{rotulo}</p>
      <QuintaTreinoEmbed
        embedUrl={treino.embed_url}
        titulo={treino.titulo}
        resumo={treino.resumo}
        apresentador={treino.apresentador}
        formato={treino.formato}
      />
    </div>
  );
}

/** Um ou dois treinos da quinta (colaboradores e/ou liderança). */
export function QuintaTreinosPanel({
  ehQuinta,
  treinoColaborador,
  treinoLider,
  intro,
  className = '',
}: Props) {
  if (!ehQuinta) return null;

  const temColab = Boolean(treinoColaborador?.embed_url || treinoColaborador?.resumo);
  const temLider = Boolean(treinoLider?.embed_url || treinoLider?.resumo);
  if (!temColab && !temLider) return null;

  return (
    <div className={`rounded-xl border-2 border-dourado-400 bg-white p-4 space-y-4 ${className}`}>
      <div>
        <p className="font-semibold text-cafeteria-900">⭐ {getTermo('quinta_treino')}</p>
        {intro ? <p className="text-sm text-cafeteria-600 mt-1 leading-relaxed">{intro}</p> : null}
      </div>
      {temColab && treinoColaborador ? (
        <BlocoTreino rotulo="Treino · colaboradores" treino={treinoColaborador} />
      ) : null}
      {temLider && treinoLider ? (
        <BlocoTreino rotulo="Treino · liderança" treino={treinoLider} />
      ) : null}
    </div>
  );
}
