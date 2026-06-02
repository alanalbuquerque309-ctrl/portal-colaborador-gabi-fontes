'use client';

import {
  detalharItensNotaAvaliacaoAdmin,
  formatarExibicaoAvaliacaoAdmin,
  type ItemDetalheNotaAvaliacao,
} from '@/lib/avaliacao-diaria';

export type LinhaAvaliacaoGaveta = {
  id: string;
  data_referencia: string;
  assiduidade: string;
  media_dia: number | null;
  justificativa_nota_baixa: string | null;
  colaborador_nome: string | null;
  avaliador_nome: string | null;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
};

type Props = {
  linha: LinhaAvaliacaoGaveta | null;
  onFechar: () => void;
};

function EstrelasNota({ nota }: { nota: string }) {
  const n = Number(nota);
  if (!Number.isFinite(n) || n < 0 || n > 5) {
    return <span className="text-sm font-medium text-coffee-base">{nota}</span>;
  }
  return (
    <span className="text-sm font-medium text-coffee-base" aria-label={`${n} de 5`}>
      {'★'.repeat(n)}
      <span className="text-cream-400">{'★'.repeat(5 - n)}</span>
      <span className="ml-1.5 text-coffee-100 font-normal">({n}/5)</span>
    </span>
  );
}

function ItemNota({ item }: { item: ItemDetalheNotaAvaliacao }) {
  return (
    <li
      className={`rounded-lg border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 ${
        item.destaque === 'zero'
          ? 'border-red-200 bg-red-50'
          : item.destaque === 'isento'
            ? 'border-cream-300 bg-cream-50'
            : 'border-cream-200 bg-white'
      }`}
    >
      <span className="text-sm text-coffee-base">{item.label}</span>
      {item.destaque === 'isento' ? (
        <span className="text-sm font-medium text-coffee-100">{item.nota}</span>
      ) : item.nota === '0' ? (
        <span className="text-sm font-semibold text-red-700">0</span>
      ) : (
        <EstrelasNota nota={item.nota} />
      )}
    </li>
  );
}

export function AvaliacaoNotasGaveta({ linha, onFechar }: Props) {
  if (!linha) return null;

  const exib = formatarExibicaoAvaliacaoAdmin(linha);
  const itens = detalharItensNotaAvaliacaoAdmin(linha);
  const semanaLabel = new Date(`${linha.data_referencia}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-coffee-base/30" aria-hidden onClick={onFechar} />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-xl border-l border-cream-300 flex flex-col"
        role="dialog"
        aria-label={`Detalhe da avaliação de ${linha.colaborador_nome ?? 'colaborador'}`}
      >
        <div className="flex items-center justify-between border-b border-cream-300 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-coffee-100">Detalhe da avaliação</p>
            <h4 className="font-display font-semibold text-coffee-base truncate">
              {linha.colaborador_nome ?? 'Colaborador'}
            </h4>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg px-3 py-1.5 text-sm text-coffee-base hover:bg-cream-100 shrink-0"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="text-sm text-coffee-100 space-y-1">
            <p>
              <span className="font-medium text-coffee-base">Semana:</span>{' '}
              <span className="capitalize">{semanaLabel}</span>
            </p>
            <p>
              <span className="font-medium text-coffee-base">Avaliador:</span>{' '}
              {linha.avaliador_nome ?? '—'}
            </p>
            <p>
              <span className="font-medium text-coffee-base">Média da semana:</span>{' '}
              <span
                className={
                  exib.faltaInjustificada ? 'text-red-700 font-semibold' : 'text-coffee-base font-medium'
                }
              >
                {exib.mediaLabel}
              </span>
            </p>
          </div>

          <section>
            <h5 className="text-sm font-medium text-coffee-base mb-2">Notas por critério</h5>
            <ul className="space-y-2">
              {itens.map((item) => (
                <ItemNota key={item.label} item={item} />
              ))}
            </ul>
            {!exib.isenta && !exib.faltaInjustificada && (
              <p className="text-xs text-coffee-100 mt-3">
                A média inclui presença (5) + os quatro critérios, dividido por 5.
              </p>
            )}
          </section>

          {linha.justificativa_nota_baixa && (
            <section>
              <h5 className="text-sm font-medium text-coffee-base mb-2">Justificativa</h5>
              <p className="text-sm text-coffee-100 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2">
                {linha.justificativa_nota_baixa}
              </p>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
