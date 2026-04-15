'use client';

import { useState } from 'react';
import { ManualHtmlLeitura } from './ManualHtmlLeitura';
import { Button } from '@/components/ui/Button';
import { MANUAIS_ESCOLHA_POS_GERAL } from '@/lib/manuais-escolha-onboarding';
import type { ManualRef } from '@/lib/manual-por-setor';

type Props = {
  resetKey: number;
  /** Chamado após API gravar ficheiro + concluído */
  onConcluido: (file: string) => void;
};

/**
 * Lista de manuais por setor (após manual geral). O colaborador pode abrir vários; confirma um com "Manual concluído".
 */
export function EscolhaManualOnboarding({ resetKey, onConcluido }: Props) {
  const [aberto, setAberto] = useState<ManualRef | null>(null);
  const [leituraOk, setLeituraOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const abrir = (m: ManualRef) => {
    setAberto(m);
    setLeituraOk(false);
  };

  const handleManualConcluido = async () => {
    if (!aberto || !leituraOk) return;
    setSalvando(true);
    try {
      const res = await fetch('/api/portal/onboarding/progresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          onboarding_manual_escolhido_file: aberto.file,
          onboarding_manual_escolhido_concluido: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.erro);
      onConcluido(aberto.file);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-coffee-base text-sm leading-relaxed">
        Escolha o manual do <strong>seu setor</strong>. Pode abrir e ler quantos quiser; ao terminar a leitura do
        manual que corresponde à sua função, use o botão <strong>Manual concluído</strong>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MANUAIS_ESCOLHA_POS_GERAL.map((m) => (
          <button
            key={m.file}
            type="button"
            onClick={() => abrir(m)}
            className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
              aberto?.file === m.file
                ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                : 'border-cream-300 bg-cream-100 text-coffee-base hover:border-dourado-200'
            }`}
          >
            {m.titulo}
          </button>
        ))}
      </div>

      {aberto && (
        <div className="rounded-xl border-2 border-dourado-200 bg-cream-50 p-3 md:p-4">
          <p className="text-sm font-semibold text-coffee-base mb-3">
            A ler: {aberto.titulo}
          </p>
          <ManualHtmlLeitura
            key={`${resetKey}-${aberto.file}`}
            titulo={aberto.titulo}
            arquivo={aberto.file}
            onReadyChange={setLeituraOk}
          />
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={() => void handleManualConcluido()}
              disabled={!leituraOk || salvando}
              className="min-h-[52px] min-w-[200px] text-base font-semibold bg-dourado-base hover:bg-dourado-400 text-coffee-300"
            >
              {salvando ? 'A gravar…' : 'Manual concluído'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
