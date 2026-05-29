import type { LinhaDiariaRelatorio } from '@/components/portal/RelatorioAvaliacoesPorSetor';

export function DetalheAvaliacaoLinha({ l }: { l: LinhaDiariaRelatorio }) {
  const temDetalhe =
    l.justificativa_nota_baixa ||
    l.nota_vestimenta != null ||
    l.nota_pontualidade != null ||
    l.nota_trabalho_equipe != null ||
    l.nota_desempenho_tarefas != null;

  if (!temDetalhe) return null;

  return (
    <details className="mt-1 text-xs text-cafeteria-600">
      <summary className="cursor-pointer text-dourado-base hover:underline">Ver notas</summary>
      <div className="mt-2 pl-2 border-l-2 border-cafeteria-100 space-y-1">
        <p>Assiduidade: {l.assiduidade}</p>
        <p>
          Vestimenta {l.nota_vestimenta ?? '—'} · Pontualidade {l.nota_pontualidade ?? '—'} · Equipe{' '}
          {l.nota_trabalho_equipe ?? '—'} · Desempenho {l.nota_desempenho_tarefas ?? '—'}
        </p>
        {l.justificativa_nota_baixa && (
          <p className="text-cafeteria-700 italic">{l.justificativa_nota_baixa}</p>
        )}
      </div>
    </details>
  );
}

export function MediaBadge({ media }: { media: number | null | undefined }) {
  return (
    <span className="text-lg font-semibold text-cafeteria-900 tabular-nums shrink-0">
      {media != null ? Number(media).toFixed(2) : '—'}
    </span>
  );
}
