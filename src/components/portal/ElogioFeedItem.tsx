'use client';

import { useState } from 'react';
import { LinhaAutorElogio } from '@/components/portal/LinhaAutorElogio';
import { rotuloExpiracaoElogio } from '@/lib/elogios-vigencia';

export type ElogioFeedItemData = {
  id: string;
  texto: string;
  created_at: string;
  autor: string;
  autor_setor?: string | null;
  autor_unidade?: string | null;
  anonimo?: boolean;
};

type Props = {
  item: ElogioFeedItemData;
  compacto?: boolean;
  onMarcadoLido?: (id: string) => void;
};

export function ElogioFeedItem({ item, compacto, onMarcadoLido }: Props) {
  const [marcando, setMarcando] = useState(false);
  const expira = rotuloExpiracaoElogio(item.created_at);

  const marcarLido = async () => {
    setMarcando(true);
    try {
      const res = await fetch(`/api/portal/sugestoes/${item.id}/marcar-lido`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) onMarcadoLido?.(item.id);
    } finally {
      setMarcando(false);
    }
  };

  return (
    <li
      className={
        compacto
          ? 'rounded-xl border border-portal-action/15 bg-white/80 px-3.5 py-3 text-sm'
          : 'rounded-lg border border-emerald-200 bg-white/90 p-3 flex flex-col gap-2'
      }
    >
      <p
        className={`text-coffee-base whitespace-pre-wrap break-words ${
          compacto ? 'text-cafeteria-800 leading-relaxed' : 'text-sm'
        }`}
      >
        {item.texto}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cafeteria-600">
        <span>
          <span className="text-emerald-800 font-medium">Elogio · </span>
          <LinhaAutorElogio
            anonimo={item.anonimo === true}
            autor={item.autor}
            autor_setor={item.autor_setor ?? null}
            autor_unidade={item.autor_unidade ?? null}
          />
        </span>
        <span>{new Date(item.created_at).toLocaleString('pt-BR')}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
        {expira ? (
          <span className="text-[11px] text-cafeteria-500">Visível na rede até {expira}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void marcarLido()}
          disabled={marcando}
          className="text-xs font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-3 py-1.5 min-h-[32px] hover:bg-emerald-100 disabled:opacity-50"
        >
          {marcando ? 'Salvando…' : 'Marcar como lido'}
        </button>
      </div>
    </li>
  );
}
