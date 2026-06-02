'use client';

type Item = { id: string; nome: string; concluido: boolean; subtitulo?: string; editavel?: boolean };

type Props = {
  titulo?: string;
  itens: Item[];
  onIrPara: (id: string) => void;
  onEditar?: (id: string) => void;
  filtroPendentes: boolean;
  onToggleFiltro: () => void;
};

export function AvaliacaoSemanalChecklist({
  titulo = 'Checklist da semana',
  itens,
  onIrPara,
  onEditar,
  filtroPendentes,
  onToggleFiltro,
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
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {visiveis.map((m) => (
            <li key={`check-${m.id}`}>
              <div
                className={`flex items-stretch gap-1 rounded-lg border text-sm ${
                  m.concluido
                    ? 'border-green-200 bg-green-50 text-green-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onIrPara(m.id)}
                  className="flex-1 text-left px-3 py-2 min-w-0"
                >
                  <span className="font-medium">
                    {m.concluido ? '✅' : '⬜'} {m.nome}
                  </span>
                  {m.subtitulo ? (
                    <span className="block text-xs opacity-80 mt-0.5">{m.subtitulo}</span>
                  ) : null}
                </button>
                {m.concluido && m.editavel && onEditar ? (
                  <button
                    type="button"
                    onClick={() => onEditar(m.id)}
                    className="shrink-0 px-2.5 border-l border-green-200/80 text-xs font-medium hover:bg-green-100/80"
                    title="Editar avaliação (uma vez)"
                  >
                    ✏️
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
