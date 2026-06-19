'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AvaliacoesPendentesPainel } from '@/components/admin/AvaliacoesPendentesPainel';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { FiltroPendenciasSemana } from '@/lib/avaliacao-pendentes-semana';

export default function PendenciasSemanaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtroInicial = (searchParams.get('filtro')?.trim() ?? '') as FiltroPendenciasSemana;
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { role?: string | null } }) => {
        if (cancel) return;
        const role = data.colaborador?.role ?? '';
        setAutorizado(!!(data.ok && podeVerPendenciasSemanaRede(role)));
      })
      .catch(() => {
        if (!cancel) setAutorizado(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (autorizado === false) router.replace('/portal');
  }, [autorizado, router]);

  if (autorizado === null) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <XicaraCarregando size="md" label="Carregando…" />
      </main>
    );
  }

  if (!autorizado) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold text-coffee-base">Pendências da semana</h1>
          <p className="text-sm text-coffee-100 mt-1">
            Quem ainda falta avaliar e qual líder não fechou a equipe. Só sócios e administrador veem esta página.
          </p>
        </div>
        <Link
          href="/admin/lideres-por-setor"
          className="text-sm font-medium text-dourado-base hover:underline shrink-0"
        >
          Mapa de liderança →
        </Link>
      </div>

      <AvaliacoesPendentesPainel
        apiBase="/api/portal/avaliacoes-pendentes"
        autoRefresh
        filtroInicial={filtroInicial === 'critico_sexta' ? 'critico_sexta' : undefined}
      />
    </main>
  );
}
