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
  lider_ok?: boolean;
  lider_ok_por?: string[];
  lider_ok_em?: string | null;
};

/**
 * Faixa no topo do portal e do admin.
 * Líder: só setores. RH/admin/sócio: rede; veem se o líder já deu OK (conversou).
 */
export function EmocionalAlertasGestao() {
  const [visivel, setVisivel] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [dataRef, setDataRef] = useState('');
  const [escopo, setEscopo] = useState<'rede' | 'setores' | string>('rede');
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
        setEscopo(String(data.escopo ?? 'rede'));
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

  const ehRede = escopo === 'rede';
  const labelOk = ehRede ? 'OK gestão' : 'OK · conversei';

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
            {ehRede
              ? `Reações que pedem cuidado (${rotuloAlertasEmocionalResumido()}). Se o líder já deu OK, significa que conversou — você confirma e o alerta some da sua lista.`
              : `Só da sua equipe/setor (${rotuloAlertasEmocionalResumido()}). Dê OK depois de conversar com a pessoa.`}
          </span>
        </p>
      </div>

      <ul className="space-y-2">
        {alertas.map((a) => {
          const okLoading = dispensandoId === a.colaborador_id;
          const liderNomes = (a.lider_ok_por ?? []).filter(Boolean);
          return (
            <li
              key={`${a.colaborador_id}-${a.emocao}`}
              className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-amber-950"
            >
              <span className="text-lg shrink-0 mt-0.5" aria-hidden>
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
                {ehRede && a.lider_ok && liderNomes.length > 0 ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[11px] font-semibold">
                    ✓ Líder conversou: {liderNomes.join(', ')}
                  </span>
                ) : ehRede && !a.lider_ok ? (
                  <span className="mt-1 block text-[11px] text-amber-800/90">
                    Aguardando OK do líder (ainda não registrou conversa).
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => void dispensarUm(a.colaborador_id)}
                disabled={!!dispensandoId}
                className="shrink-0 rounded-lg border border-amber-400/80 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 min-w-[44px] min-h-[36px]"
                aria-label={`Marcar alerta de ${a.nome} como visto`}
              >
                {okLoading ? '…' : labelOk}
              </button>
            </li>
          );
        })}
      </ul>

      {ehRede ? (
        <p className="mt-2 pt-2 border-t border-amber-200/80">
          <Link
            href="/admin/termometro-emocoes"
            className="text-xs font-medium text-dourado-base hover:underline"
          >
            Ver termômetro completo no admin →
          </Link>
        </p>
      ) : null}
    </section>
  );
}
