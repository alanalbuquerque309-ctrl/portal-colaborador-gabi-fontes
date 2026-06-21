import type { SituacaoEvolucao } from '@/lib/evolucao';
import { emojiSituacao, rotuloSituacao } from '@/lib/evolucao';

const BADGE: Record<SituacaoEvolucao, string> = {
  evoluindo: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  estavel: 'bg-slate-100 text-slate-800 border-slate-200',
  regredindo: 'bg-red-100 text-red-900 border-red-200',
  sem_historico: 'bg-cream-100 text-coffee-100 border-cream-300',
};

type Props = {
  situacao: SituacaoEvolucao;
  compacto?: boolean;
  delta?: number | null;
};

export function EvolucaoBadge({ situacao, compacto, delta }: Props) {
  const cls = BADGE[situacao];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
      title={rotuloSituacao(situacao)}
    >
      <span aria-hidden>{emojiSituacao(situacao)}</span>
      {!compacto && <span>{rotuloSituacao(situacao)}</span>}
      {delta != null && !Number.isNaN(delta) && (
        <span className="tabular-nums opacity-90">
          ({delta > 0 ? '+' : ''}
          {delta.toFixed(2).replace('.', ',')})
        </span>
      )}
    </span>
  );
}
