'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PortalHomeTarefa } from '@/lib/portal-home-types';

type Tarefa = PortalHomeTarefa;

function CardHeroPendencia({ t }: { t: Tarefa }) {
  return (
    <Link
      href={t.href}
      className="block rounded-2xl bg-gradient-to-br from-portal-action to-portal-actionMuted px-5 py-5 text-white shadow-lg hover:shadow-xl transition-shadow min-h-[44px]"
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl"
          aria-hidden
        >
          📋
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg sm:text-xl font-display font-semibold leading-snug">{t.titulo}</p>
          <p className="text-sm text-emerald-50/95 mt-1.5 leading-relaxed">{t.detalhe}</p>
          <span className="inline-block mt-3 text-sm font-semibold text-dourado-100 underline-offset-2 hover:underline">
            {t.acaoLabel ?? 'Clique para ver →'}
          </span>
        </div>
      </div>
    </Link>
  );
}

type Props = {
  /** Quando vindo de /api/portal/home-resumo — evita fetch duplicado. */
  tarefasExternas?: PortalHomeTarefa[] | null;
};

export function FacaAgoraHome({ tarefasExternas }: Props) {
  const usaExterno = tarefasExternas !== undefined && tarefasExternas !== null;
  const [fase, setFase] = useState<'loading' | 'pronto'>(usaExterno ? 'pronto' : 'loading');
  const [tarefas, setTarefas] = useState<Tarefa[]>(usaExterno ? tarefasExternas : []);

  useEffect(() => {
    if (usaExterno) {
      setTarefas(tarefasExternas);
      setFase('pronto');
      return;
    }

    let cancelado = false;
    const montar = async () => {
      try {
        const res = await fetch('/api/portal/home-resumo', { credentials: 'include', cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; tarefas?: Tarefa[] };
        if (!cancelado && data.ok && Array.isArray(data.tarefas)) {
          setTarefas(data.tarefas);
        }
      } catch {
        /* fallback vazio */
      }
      if (!cancelado) setFase('pronto');
    };
    void montar();
    return () => {
      cancelado = true;
    };
  }, [usaExterno, tarefasExternas]);

  if (fase === 'loading') {
    return (
      <section aria-busy="true" className="rounded-2xl border border-portal-action/20 bg-portal-actionLight p-5">
        <h2 className="text-lg font-display font-semibold text-portal-action">O que fazer agora</h2>
        <p className="text-sm text-portal-actionMuted mt-2">Carregando pendências…</p>
      </section>
    );
  }

  if (tarefas.length === 0) {
    return null;
  }

  const hero = tarefas.find((t) => t.hero) ?? (tarefas.find((t) => t.urgente && t.id === 'equipe') ?? null);
  const demais = tarefas.filter((t) => t !== hero);

  return (
    <section aria-labelledby="titulo-o-que-fazer-agora" className="space-y-4">
      <div className="rounded-xl border border-portal-action/25 bg-gradient-to-r from-portal-actionLight/60 via-white/90 to-emerald-50/50 px-4 py-3">
        <h2 id="titulo-o-que-fazer-agora" className="text-lg font-display font-semibold text-portal-action">
          O que fazer agora
        </h2>
        <p className="text-sm text-cafeteria-600 mt-1">O que precisa da sua atenção neste momento.</p>
      </div>

      {hero && <CardHeroPendencia t={hero} />}

      {demais.length > 0 && (
        <ul className="space-y-3">
          {demais.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className={`block rounded-xl border px-4 py-3 transition-all hover:shadow-md ${
                  t.urgente
                    ? 'border-amber-400 bg-amber-50/90 hover:border-amber-500'
                    : 'border-cafeteria-200 bg-white hover:border-dourado-base'
                }`}
              >
                <p className="text-base font-semibold text-cafeteria-900">{t.titulo}</p>
                <p className="text-sm text-cafeteria-600 mt-0.5">{t.detalhe}</p>
                <span className="inline-block mt-2 text-sm font-medium text-dourado-base">
                  {t.acaoLabel ?? 'Abrir →'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
