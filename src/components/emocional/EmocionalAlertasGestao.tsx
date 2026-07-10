'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { rotuloAlertasEmocionalResumido } from '@/lib/emocional-opcoes';

type Alerta = {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  unidade_nome: string | null;
  emocao: string;
  emocao_label: string;
  emoji: string;
  motivo: string | null;
  data: string;
};

/**
 * Faixa no topo do portal e do admin para RH / sócios / admin / gerentes / Daniel.
 * Cada colaborador em alerta tem seu próprio OK (some só aquele, para quem clicou).
 */
export function EmocionalAlertasGestao() {
  const [visivel, setVisivel] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [dataRef, setDataRef] = useState('');
  const [dispensandoId, setDispensandoId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    fetch('/api/portal/emocional-alertas', { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (r.status === 403) {
          setVisivel(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.ok) {
          setVisivel(false);
          return;
        }
        setVisivel(true);
        setAlertas(Array.isArray(data.alertas) ? data.alertas : []);
        setDataRef(String(data.data_referencia ?? ''));
      })
      .catch(() => setVisivel(false));
  }, []);

  useEffect(() => {
    carregar();
    const id = window.setInterval(carregar, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const onFocus = () => carregar();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [carregar]);

  const dispensarUm = async (colaboradorId: string) => {
    if (dispensandoId) return;
    setDispensandoId(colaboradorId);
    try {
      const res = await fetch('/api/portal/emocional-alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ colaborador_ids: [colaboradorId] }),
      });
      const data = await res.json();
      if (data?.ok) {
        setAlertas((prev) => prev.filter((a) => a.colaborador_id !== colaboradorId));
      }
    } finally {
      setDispensandoId(null);
    }
  };

  if (!visivel || alertas.length === 0) return null;

  const dataFmt = dataRef
    ? new Date(`${dataRef}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : 'hoje';

  return (
    <section
      className="rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm shadow-sm"
      aria-live="polite"
      aria-label="Alertas do termômetro de emoções"
    >
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg shrink-0" aria-hidden>
          💛
        </span>
        <p className="text-amber-950">
          <span className="font-medium">Termômetro ({dataFmt}): </span>
          {alertas.length === 1
            ? '1 colaborador precisa de atenção.'
            : `${alertas.length} colaboradores precisam de atenção.`}{' '}
          <span className="text-xs text-amber-900/80">
            Marcaram reações que pedem atenção ({rotuloAlertasEmocionalResumido()}). Use OK em cada um quando já tiver visto.
          </span>
        </p>
      </div>

      <ul className="space-y-2">
        {alertas.map((a) => {
          const okLoading = dispensandoId === a.colaborador_id;
          return (
            <li
              key={`${a.colaborador_id}-${a.emocao}`}
              className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-amber-950"
            >
              <span className="text-lg shrink-0" aria-hidden>
                {a.emoji}
              </span>
              <span className="flex-1 min-w-0 text-sm">
                <span className="font-medium">{a.nome}</span>
                <span className="text-amber-900/90">
                  {' '}
                  — {a.emocao_label}
                  {a.unidade_nome ? ` · ${a.unidade_nome}` : ''}
                  {a.setor ? ` · ${a.setor}` : ''}
                </span>
                {a.motivo && (
                  <span className="block text-xs text-amber-950/90 mt-0.5 whitespace-pre-wrap break-words">
                    “{a.motivo}”
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => void dispensarUm(a.colaborador_id)}
                disabled={!!dispensandoId}
                className="shrink-0 rounded-lg border border-amber-400/80 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 min-w-[44px] min-h-[36px]"
                aria-label={`Marcar alerta de ${a.nome} como visto`}
              >
                {okLoading ? '…' : 'OK'}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 pt-2 border-t border-amber-200/80">
        <Link
          href="/admin/termometro-emocoes"
          className="text-xs font-medium text-dourado-base hover:underline"
        >
          Ver termômetro completo no admin →
        </Link>
      </p>
    </section>
  );
}
