'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = {
  nivelLabel?: string;
  pendenciasSemana?: number;
  sugestoesPendentes?: number;
};

export function AdminTopbar({ nivelLabel, pendenciasSemana = 0, sugestoesPendentes = 0 }: Props) {
  const [primeiroNome, setPrimeiroNome] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; nome?: string }) => {
        if (!d.ok || !d.nome) return;
        const p = String(d.nome).trim().split(/\s+/)[0];
        setPrimeiroNome(p || null);
      })
      .catch(() => {});
  }, []);

  const saudacao = primeiroNome ? `Olá, ${primeiroNome}` : 'Painel admin';

  return (
    <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-2 bg-cream-100/95 backdrop-blur-sm border-b border-cafeteria-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-coffee-base truncate">{saudacao}</p>
          {nivelLabel ? <p className="text-xs text-cafeteria-600 truncate">{nivelLabel}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendenciasSemana > 0 && (
            <Link
              href="/admin/pendencias-semana"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-200"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden />
              {pendenciasSemana} pendência{pendenciasSemana === 1 ? '' : 's'}
            </Link>
          )}
          {sugestoesPendentes > 0 && (
            <Link
              href="/admin/sugestoes"
              className="inline-flex items-center gap-1.5 rounded-full bg-dourado-50 border border-dourado-200 px-3 py-1 text-xs font-semibold text-coffee-base hover:bg-dourado-100"
            >
              {sugestoesPendentes === 1 ? '1 sugestão' : `${sugestoesPendentes} sugestões`}
            </Link>
          )}
          <Link
            href="/portal"
            className="inline-flex min-h-[36px] items-center rounded-lg border border-cafeteria-300 bg-white px-3 text-xs font-medium text-cafeteria-800 hover:border-dourado-base hover:text-dourado-base"
          >
            Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
