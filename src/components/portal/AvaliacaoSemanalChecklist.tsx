'use client';

type Item = { id: string; nome: string; concluido: boolean; subtitulo?: string; editavel?: boolean };

type Props = {
  titulo?: string;
  itens: Item[];
  onIrPara: (id: string) => void;
  onEditar?: (id: string) => void;
  filtroPendentes: boolean;
  onToggleFiltro: () => void;
  selecionadoId?: string | null;
};

export function AvaliacaoSemanalChecklist({
  titulo = 'Checklist da semana',
  itens,
  onIrPara,
  onEditar,
  filtroPendentes,
  onToggleFiltro,
  selecionadoId = null,
}: Props) {
  const concluidos = itens.filter((i) => i.concluido).length;
  const pendentes = itens.length - concluidos;
  const visiveis = filtroPendentes ? itens.filter((i) => !i.concluido) : itens;

  if (itens.length === 0) return null;

  return (
    <section className="rounded-xl border border-cafeteria-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-cafeteria-900">{titulo}</h2>
        <p className="text-sm text-cafeteria-700">
          <strong>{concluidos}</strong> de <strong>{itens.length}</strong> concluído(s)
          {pendentes > 0 ? ` · ${pendentes} pendente(s)` : ' · tudo feito'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleFiltro}
          className={`rounded-lg border px-3 py-2 text-sm font-medium min-h-[44px] ${
            filtroPendentes
              ? 'border-dourado-base bg-dourado-50 text-cafeteria-900'
              : 'border-cafeteria-200 text-cafeteria-700 hover:bg-cafeteria-50'
          }`}
        >
          {filtroPendentes ? 'Mostrar todos' : 'Só pendentes'}
        </button>
      </div>
      {visiveis.length === 0 ? (
        <p className="text-sm text-green-700">Nenhum pendente nesta semana.</p>
      ) : (
        <ul className="grid gap-2 grid-cols-1">
          {visiveis.map((m) => (
            <li key={`check-${m.id}`}>
              <div
                className={`flex items-stretch gap-1 rounded-lg border text-sm md:text-base ${
                  selecionadoId === m.id
                    ? 'border-dourado-base ring-2 ring-dourado-base/30 bg-dourado-50'
                    : m.concluido
                      ? 'border-green-200 bg-green-50 text-green-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onIrPara(m.id)}
                  disabled={m.concluido}
                  className="flex-1 text-left px-3 py-3 min-w-0 disabled:cursor-not-allowed"
                >
                  <span className="font-semibold text-base leading-snug break-words block">
                    {m.concluido ? '✅' : '⬜'} {m.nome}
                  </span>
                  {m.subtitulo ? (
                    <span className="block text-sm opacity-80 mt-0.5 break-words whitespace-normal leading-snug">
                      {m.subtitulo}
                    </span>
                  ) : null}
                </button>
                {m.concluido && m.editavel && onEditar ? (
                  <button
                    type="button"
                    onClick={() => onEditar(m.id)}
                    className="shrink-0 px-3 border-l border-green-200/80 text-sm font-medium hover:bg-green-100/80 min-w-[44px] min-h-[44px]"
                    title="Editar avaliação (uma vez)"
                  >
                    ✏️ Editar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
