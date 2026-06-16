'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type GraosResumo = {
  saldo_confirmado: number;
  saldo_pendente: number;
  graos_semana_ganhos: number;
  graos_semana_possivel: number;
  nivel?: { emoji: string; label: string };
};

export function GraosHomeBanner() {
  const [visivel, setVisivel] = useState(false);
  const [resumo, setResumo] = useState<GraosResumo | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/graos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; saldo_confirmado?: number; saldo_pendente?: number; graos_semana_ganhos?: number; graos_semana_possivel?: number; nivel?: { emoji: string; label: string } }) => {
        if (cancel || d.ok !== true) return;
        setResumo({
          saldo_confirmado: Number(d.saldo_confirmado ?? 0),
          saldo_pendente: Number(d.saldo_pendente ?? 0),
          graos_semana_ganhos: Number(d.graos_semana_ganhos ?? 0),
          graos_semana_possivel: Number(d.graos_semana_possivel ?? 40),
          nivel: d.nivel,
        });
        setVisivel(true);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  if (!visivel || !resumo) return null;

  const pct = resumo.graos_semana_possivel
    ? Math.round((resumo.graos_semana_ganhos / resumo.graos_semana_possivel) * 100)
    : 0;

  return (
    <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-800">☕ Grãos de café</p>
          <p className="text-2xl font-display font-bold text-cafeteria-900 mt-1">
            {resumo.saldo_confirmado} Grãos
            {resumo.nivel ? (
              <span className="ml-2 text-base font-normal text-cafeteria-700">
                {resumo.nivel.emoji} {resumo.nivel.label}
              </span>
            ) : null}
          </p>
          <p className="text-sm text-cafeteria-600 mt-1">
            Semana: {resumo.graos_semana_ganhos}/{resumo.graos_semana_possivel} ({pct}%)
            {resumo.saldo_pendente > 0 ? ` · ${resumo.saldo_pendente} aguardando avaliação` : ''}
          </p>
        </div>
        <Link
          href="/portal/graos"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 shrink-0"
        >
          Ver missões e resgatar
        </Link>
      </div>
    </section>
  );
}
