'use client';

import type { LinhaLiderRelatorio } from '@/components/portal/RelatorioAvaliacoesPorSetor';
import {
  PILARES_LIDERANCA,
  classeMedia,
  classeNota,
  formatarSemanaLider,
  notaBaixa,
  notasDaLinha,
  pilarMaisFracoLinha,
} from '@/lib/lideranca-relatorio-ui';

export function MediaBadgeLider({ media }: { media: number }) {
  return (
    <span
      className={`inline-flex min-w-[3.25rem] justify-center rounded-lg border px-2.5 py-1.5 text-lg font-semibold tabular-nums shrink-0 leading-none ${classeMedia(media)}`}
    >
      {media.toFixed(2)}
    </span>
  );
}

export function PilaresNotasGrid({ row }: { row: LinhaLiderRelatorio }) {
  const notas = notasDaLinha(row);
  const fraco = pilarMaisFracoLinha(row);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PILARES_LIDERANCA.map((p) => {
        const nota = notas[p.key];
        const destaque = p.key === fraco.key && notaBaixa(nota);
        return (
          <div
            key={p.key}
            className={`rounded-lg border px-2.5 py-2 text-xs sm:text-sm ${classeNota(nota)} ${
              destaque ? 'ring-2 ring-red-400/60' : ''
            }`}
          >
            <p className="leading-snug break-words">{p.short}</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{nota}</p>
          </div>
        );
      })}
    </div>
  );
}

export function CardAvaliacaoLideranca({ row }: { row: LinhaLiderRelatorio }) {
  const fraco = pilarMaisFracoLinha(row);
  const alerta = linhaTemAlerta(row);

  return (
    <article
      className={`rounded-xl border p-3 sm:p-4 space-y-3 ${
        alerta ? 'border-amber-300 bg-amber-50/40' : 'border-cafeteria-100 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-cafeteria-900 text-sm sm:text-base">
            {formatarSemanaLider(row.semana_inicio)}
          </p>
          <p className="text-xs sm:text-sm text-cafeteria-600 mt-0.5 break-words">
            {row.avaliador_id ? (
              <>
                <strong
                  className={row.avaliador_anonimo ? 'text-amber-950' : 'text-cafeteria-900'}
                >
                  {row.avaliador_label}
                </strong>
                {row.avaliador_setor ? ` · ${row.avaliador_setor}` : ''}
              </>
            ) : (
              <>
                Avaliado por:{' '}
                <strong className="text-cafeteria-900">{row.avaliador_label}</strong>
              </>
            )}
          </p>
          {alerta && (
            <p className="text-xs font-medium text-amber-900 mt-1.5">
              Ponto mais fraco: {fraco.label} ({fraco.nota})
            </p>
          )}
        </div>
        <MediaBadgeLider media={row.media} />
      </div>

      <PilaresNotasGrid row={row} />

      {row.justificativa_nota_baixa ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">
            Justificativa da nota baixa
          </p>
          <p className="leading-relaxed whitespace-pre-wrap break-words">{row.justificativa_nota_baixa}</p>
        </div>
      ) : null}
    </article>
  );
}

function linhaTemAlerta(row: LinhaLiderRelatorio): boolean {
  return notaBaixa(row.media) || Object.values(notasDaLinha(row)).some(notaBaixa);
}
