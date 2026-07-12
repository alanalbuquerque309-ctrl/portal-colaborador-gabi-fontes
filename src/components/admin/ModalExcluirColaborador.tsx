'use client';

import { useEffect, useId, useState } from 'react';
import { MOTIVOS_SAIDA, type MotivoSaida } from '@/lib/rotatividade';

type Props = {
  aberto: boolean;
  nome: string;
  salvando: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: MotivoSaida, motivoOutro: string | null) => void;
};

export function ModalExcluirColaborador({ aberto, nome, salvando, onCancelar, onConfirmar }: Props) {
  const tituloId = useId();
  const [motivo, setMotivo] = useState<MotivoSaida | ''>('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setMotivo('');
    setMotivoOutro('');
    setErro('');
  }, [aberto, nome]);

  if (!aberto) return null;

  const confirmar = () => {
    if (!motivo) {
      setErro('Selecione o motivo da saída.');
      return;
    }
    if (motivo === 'outro' && motivoOutro.trim().length < 3) {
      setErro('Descreva o motivo (mínimo 3 caracteres).');
      return;
    }
    onConfirmar(motivo, motivo === 'outro' ? motivoOutro.trim().slice(0, 120) : null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-coffee-base/40"
      role="presentation"
      onClick={() => {
        if (!salvando) onCancelar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="w-full max-w-md rounded-2xl border border-cafeteria-200 bg-white shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id={tituloId} className="font-display text-lg font-semibold text-coffee-base">
            Confirmar desligamento
          </h2>
          <p className="text-sm text-cafeteria-600 mt-1 leading-relaxed">
            Excluir <strong className="text-coffee-base">{nome}</strong>? Esta ação não pode ser desfeita. Informe o
            motivo da saída para o relatório de rotatividade.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-coffee-base mb-1">Motivo *</legend>
          {MOTIVOS_SAIDA.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 min-h-[44px] rounded-xl border px-3 py-2 cursor-pointer ${
                motivo === opt.value
                  ? 'border-dourado-base bg-dourado-50'
                  : 'border-cafeteria-200 bg-cream-50/50 hover:border-cafeteria-300'
              }`}
            >
              <input
                type="radio"
                name="motivo_saida"
                value={opt.value}
                checked={motivo === opt.value}
                onChange={() => setMotivo(opt.value)}
                className="accent-coffee-base"
              />
              <span className="text-sm font-medium text-coffee-base">{opt.label}</span>
            </label>
          ))}
        </fieldset>

        {motivo === 'outro' && (
          <label className="block text-sm">
            <span className="font-semibold text-coffee-base">Descrição curta *</span>
            <input
              type="text"
              maxLength={120}
              value={motivoOutro}
              onChange={(e) => setMotivoOutro(e.target.value)}
              placeholder="Ex.: fim de contrato, transferência…"
              className="mt-1 w-full rounded-xl border border-cafeteria-200 px-3 py-2.5 text-coffee-base focus:outline-none focus:ring-2 focus:ring-dourado-base/30"
            />
          </label>
        )}

        {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}

        <div className="flex flex-wrap gap-2 justify-end pt-1">
          <button
            type="button"
            disabled={salvando}
            onClick={onCancelar}
            className="rounded-xl border border-cafeteria-300 bg-white px-4 py-2.5 min-h-[44px] text-sm font-semibold text-coffee-base disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={confirmar}
            className="rounded-xl bg-red-700 text-white px-4 py-2.5 min-h-[44px] text-sm font-bold hover:bg-red-800 disabled:opacity-50"
          >
            {salvando ? 'Excluindo…' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}
