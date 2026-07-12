'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Aviso laranja: só Admin e RH. Some quando não há ninguém sem data de admissão.
 * Não bloqueia o fluxo.
 */
export function AvisoAdmissaoPendenteBanner() {
  const [total, setTotal] = useState<number | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const authRes = await fetch('/api/admin/auth', { credentials: 'include', cache: 'no-store' });
        const auth = await authRes.json();
        if (cancel) return;
        if (!auth?.ok || auth.pode_ver_aviso_admissao !== true) {
          setVisivel(false);
          return;
        }
        setVisivel(true);
        const res = await fetch('/api/admin/rotatividade', { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        if (cancel) return;
        if (!res.ok || !data.ok) {
          setTotal(null);
          return;
        }
        setTotal(Math.max(0, Number(data.sem_admissao?.total ?? 0)));
      } catch {
        if (!cancel) setTotal(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (!visivel || total === null || total <= 0) return null;

  return (
    <div
      role="status"
      className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
    >
      <p className="font-semibold text-amber-950">
        Faltam {total} data{total === 1 ? '' : 's'} de admissão
      </p>
      <p className="mt-1 text-amber-900/90 leading-relaxed">
        Precisamos dessa informação para contabilizar contratações e acompanhar a rotatividade. Não trava o portal:
        preencha no cadastro de cada pessoa. O aviso some quando zerar.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link
          href="/admin/rotatividade"
          className="text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-coffee-base"
        >
          Ver lista e rotatividade →
        </Link>
        <Link
          href="/admin/colaboradores"
          className="text-sm font-semibold text-amber-950/80 underline underline-offset-2 hover:text-coffee-base"
        >
          Ir a Colaboradores
        </Link>
      </div>
    </div>
  );
}
