'use client';

import { useState } from 'react';
import { AVALIACAO_IGNORAR_MOTIVO_MIN } from '@/lib/avaliacao-ignorada';

type Props = {
  avaliacaoId: string;
  colaboradorNome?: string | null;
  avaliadorRotulo?: string | null;
  onIgnorada: () => void;
  /** aside = botão compacto ao lado do chip de nota */
  variant?: 'inline' | 'aside';
};

export function AdminAvaliacaoIgnorarAcao({
  avaliacaoId,
  colaboradorNome,
  avaliadorRotulo,
  onIgnorada,
  variant = 'inline',
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('Vínculo de liderança incorreto no cadastro');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch('/api/admin/avaliacoes-diarias/ignorar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao_id: avaliacaoId, motivo }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível ignorar.');
        return;
      }
      setAberto(false);
      onIgnorada();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) {
    const triggerClass =
      variant === 'aside'
        ? 'rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap'
        : 'text-[10px] font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2';
    return (
      <button type="button" onClick={() => setAberto(true)} className={triggerClass}>
        Ignorar
      </button>
    );
  }

  const painelClass =
    variant === 'aside'
      ? 'basis-full w-full rounded-lg border border-amber-200 bg-amber-50/90 p-2 text-left'
      : 'mt-2 rounded-lg border border-amber-200 bg-amber-50/90 p-2 text-left max-w-[14rem]';

  return (
    <div className={painelClass}>
      <p className="text-[10px] text-amber-950 font-medium leading-snug">
        Não contará na média.
        {colaboradorNome ? ` ${colaboradorNome}` : ''}
        {avaliadorRotulo ? ` · ${avaliadorRotulo}` : ''}
      </p>
      <label className="block text-[10px] text-coffee-base mt-1.5 mb-0.5">Motivo</label>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={2}
        className="w-full rounded border border-cream-300 px-2 py-1 text-[11px] text-coffee-base"
      />
      {erro && <p className="text-[10px] text-red-600 mt-1">{erro}</p>}
      <div className="flex gap-1.5 mt-1.5">
        <button
          type="button"
          disabled={salvando || motivo.trim().length < AVALIACAO_IGNORAR_MOTIVO_MIN}
          onClick={() => void confirmar()}
          className="rounded bg-amber-800 text-cream-100 px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
        >
          {salvando ? '…' : 'Confirmar'}
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          className="rounded border border-cream-300 px-2 py-0.5 text-[10px] text-coffee-base"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
