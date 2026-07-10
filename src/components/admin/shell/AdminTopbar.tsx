'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Props = {
  nivelLabel?: string;
  pendenciasSemana?: number;
  sugestoesPendentes?: number;
};

function irParaPortalComoColaborador(router: ReturnType<typeof useRouter>) {
  try {
    sessionStorage.setItem('portal_skip_back_guard_once', '1');
  } catch {
    /* noop */
  }
  fetch('/api/admin/restaurar-portal', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
    .catch(() => null)
    .finally(() => {
      router.push('/portal');
    });
}

export function AdminTopbar({ nivelLabel, pendenciasSemana = 0, sugestoesPendentes = 0 }: Props) {
  const router = useRouter();
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

  const saudacao = primeiroNome ? `Olá, ${primeiroNome}` : 'Painel da gestão';

  return (
    <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-2 bg-gradient-to-r from-cream-100/95 via-dourado-50/40 to-cream-100/95 backdrop-blur-sm border-b border-dourado-200/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-coffee-base truncate">{saudacao}</p>
          {nivelLabel ? (
            <p className="text-xs text-cafeteria-600 truncate">{nivelLabel}</p>
          ) : (
            <p className="text-xs text-cafeteria-600 truncate">Cockpit Gabi Fontes</p>
          )}
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
              {sugestoesPendentes === 1 ? '1 pendente' : `${sugestoesPendentes} pendentes`}
            </Link>
          )}
          <button
            type="button"
            onClick={() => irParaPortalComoColaborador(router)}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-dourado-300 bg-white px-3 text-xs font-semibold text-coffee-base hover:bg-dourado-50 hover:border-dourado-base"
          >
            Ver como colaborador →
          </button>
        </div>
      </div>
    </div>
  );
}
