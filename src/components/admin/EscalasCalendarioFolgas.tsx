'use client';

import { useMemo, useState } from 'react';
import { celulasGradeMes } from '@/lib/escala-calendario-grade';

export type EscalaCalendarioLinha = {
  id: string;
  colaborador_id: string;
  data: string;
  colaborador_nome: string;
  setor: string | null;
  unidade_nome: string;
  situacao: 'folga' | 'trabalho';
  no_mes_ref?: boolean;
};

type Props = {
  mesRef: string;
  escalas: EscalaCalendarioLinha[];
  podeEditar: boolean;
  onSalvarSituacao: (colaboradorId: string, data: string, situacao: 'folga' | 'trabalho') => Promise<void>;
};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function EscalasCalendarioFolgas({ mesRef, escalas, podeEditar, onSalvarSituacao }: Props) {
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const celulas = useMemo(() => celulasGradeMes(mesRef), [mesRef]);

  const porData = useMemo(() => {
    const map = new Map<string, EscalaCalendarioLinha[]>();
    for (const e of escalas) {
      const list = map.get(e.data) ?? [];
      list.push(e);
      map.set(e.data, list);
    }
    return map;
  }, [escalas]);

  const linhasDia = diaAberto ? (porData.get(diaAberto) ?? []) : [];
  const folgasDia = linhasDia.filter((l) => l.situacao === 'folga');
  const trabalhoDia = linhasDia.filter((l) => l.situacao === 'trabalho');

  const labelDia = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const alterar = async (colaboradorId: string, data: string, situacao: 'folga' | 'trabalho') => {
    const chave = `${colaboradorId}|${data}`;
    setSalvando(chave);
    try {
      await onSalvarSituacao(colaboradorId, data, situacao);
    } finally {
      setSalvando(null);
    }
  };

  return (
    <div className="mt-8 border-t border-cream-300 pt-6">
      <h3 className="text-base font-medium text-coffee-base mb-1">Calendário de folgas</h3>
      <p className="text-xs text-coffee-100 mb-4">
        Sincronizado com a tabela acima. Semanas completas (dias esmaecidos = outro mês). Clique no dia para ver
        folgas{podeEditar ? ' e editar' : ''}; a contagem de folgas no quadrado muda ao salvar.
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-coffee-100 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((c) => {
          const list = porData.get(c.data) ?? [];
          const nFolga = list.filter((l) => l.situacao === 'folga').length;
          const ativo = diaAberto === c.data;
          return (
            <button
              key={c.data}
              type="button"
              onClick={() => setDiaAberto(c.data)}
              className={`min-h-[72px] rounded-lg border p-1.5 text-left transition-colors ${
                ativo
                  ? 'border-dourado-500 bg-dourado-50 ring-1 ring-dourado-400'
                  : c.noMes
                    ? 'border-cream-300 bg-white hover:bg-cream-50'
                    : 'border-cream-200 bg-cream-50/80 text-coffee-100 hover:bg-cream-100'
              }`}
            >
              <span className={`text-sm font-semibold ${c.noMes ? 'text-coffee-base' : 'text-coffee-100'}`}>
                {c.dia}
              </span>
              {nFolga > 0 ? (
                <span className="mt-1 block text-[10px] font-medium text-cafeteria-700 leading-tight">
                  {nFolga} folga{nFolga === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="mt-1 block text-[10px] text-coffee-100">—</span>
              )}
            </button>
          );
        })}
      </div>

      {diaAberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-coffee-base/30"
            aria-hidden
            onClick={() => setDiaAberto(null)}
          />
          <aside
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-xl border-l border-cream-300 flex flex-col"
            role="dialog"
            aria-label={`Folgas em ${labelDia(diaAberto)}`}
          >
            <div className="flex items-center justify-between border-b border-cream-300 px-4 py-3">
              <div>
                <p className="text-xs text-coffee-100">Dia selecionado</p>
                <h4 className="font-display font-semibold text-coffee-base capitalize">{labelDia(diaAberto)}</h4>
              </div>
              <button
                type="button"
                onClick={() => setDiaAberto(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-coffee-base hover:bg-cream-100"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <section>
                <h5 className="text-sm font-medium text-cafeteria-800 mb-2">
                  De folga ({folgasDia.length})
                </h5>
                {folgasDia.length === 0 ? (
                  <p className="text-sm text-coffee-100">Ninguém de folga neste dia.</p>
                ) : (
                  <ul className="space-y-2">
                    {folgasDia.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-lg border border-cafeteria-200 bg-cafeteria-50/50 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-coffee-base">{l.colaborador_nome}</p>
                        <p className="text-xs text-coffee-100">
                          {l.setor || '—'} · {l.unidade_nome || '—'}
                        </p>
                        {podeEditar && (
                          <button
                            type="button"
                            disabled={salvando === `${l.colaborador_id}|${l.data}`}
                            onClick={() => void alterar(l.colaborador_id, l.data, 'trabalho')}
                            className="mt-2 text-xs text-dourado-600 hover:underline disabled:opacity-50"
                          >
                            Marcar como trabalho
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {trabalhoDia.length > 0 && (
                <section>
                  <h5 className="text-sm font-medium text-coffee-base mb-2">
                    Trabalhando ({trabalhoDia.length})
                  </h5>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {trabalhoDia.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-lg border border-cream-200 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-coffee-base">{l.colaborador_nome}</p>
                          <p className="text-xs text-coffee-100">{l.setor || '—'}</p>
                        </div>
                        {podeEditar && (
                          <button
                            type="button"
                            disabled={salvando === `${l.colaborador_id}|${l.data}`}
                            onClick={() => void alterar(l.colaborador_id, l.data, 'folga')}
                            className="text-xs text-cafeteria-700 hover:underline disabled:opacity-50 shrink-0"
                          >
                            Dar folga
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
