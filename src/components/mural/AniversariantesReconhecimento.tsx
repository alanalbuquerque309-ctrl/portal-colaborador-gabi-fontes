'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { aniversarioNoDia } from '@/lib/data-civil-br';
import { AniversarianteCard, type AniversarianteItem } from '@/components/mural/AniversarianteCard';
import { PortalEmptyState } from '@/components/portal/shell/PortalEmptyState';

function rotuloMesAtual(): string {
  return new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

type Props = {
  /** compact = bloco no mural; full = página dedicada com grid */
  variant?: 'compact' | 'full';
};

export function AniversariantesReconhecimento({ variant = 'compact' }: Props) {
  const [aniversariantes, setAniversariantes] = useState<AniversarianteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [conflitos, setConflitos] = useState(0);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    fetch('/api/portal/aniversariantes', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.aniversariantes)) {
          const lista = data.aniversariantes as AniversarianteItem[];
          setAniversariantes(lista);
          setConflitos(lista.filter((a) => a.possivel_conflito_admissao).length);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando aniversariantes…" />
      </div>
    );
  }

  const hoje = aniversariantes.filter((a) => aniversarioNoDia(a.data_nascimento));
  const demais = aniversariantes.filter((a) => !aniversarioNoDia(a.data_nascimento));
  const mesRotulo = rotuloMesAtual();

  const avisoConflito =
    conflitos > 0 ? (
      <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {conflitos} cadastro(s) com data de nascimento igual à admissão — peça ao RH para corrigir no Admin.
      </p>
    ) : null;

  if (variant === 'full') {
    return (
      <div className="space-y-6">
        {avisoConflito}
        {aniversariantes.length === 0 ? (
          <PortalEmptyState message="Nenhum aniversariante neste mês com data de nascimento cadastrada." />
        ) : (
          <>
            {hoje.length > 0 && (
              <div className="space-y-3">
                {hoje.map((a) => (
                  <AniversarianteCard key={a.id} item={a} destaque />
                ))}
              </div>
            )}
            {demais.length > 0 && (
              <div>
                {hoje.length > 0 ? (
                  <h3 className="text-sm font-semibold text-cafeteria-700 mb-3 uppercase tracking-wide">
                    Restante de {mesRotulo}
                  </h3>
                ) : null}
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {demais.map((a) => (
                    <li key={a.id}>
                      <AniversarianteCard item={a} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {avisoConflito}
      {aniversariantes.length === 0 ? (
        <PortalEmptyState message="Nenhum aniversariante neste mês com data de nascimento cadastrada." />
      ) : (
        <>
          {hoje.length > 0 && (
            <div className="space-y-2">
              {hoje.map((a) => (
                <AniversarianteCard key={a.id} item={a} destaque />
              ))}
            </div>
          )}
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {demais.slice(0, 6).map((a) => (
              <li key={a.id}>
                <AniversarianteCard item={a} />
              </li>
            ))}
          </ul>
          {aniversariantes.length > hoje.length + 6 ? (
            <p className="text-xs text-cafeteria-600 text-center">
              + {aniversariantes.length - hoje.length - 6} aniversariante(s) neste mês
            </p>
          ) : null}
        </>
      )}
      {aniversariantes.length > 0 && (
        <p className="text-sm text-center pt-1">
          <Link href="/portal/aniversariantes" className="text-dourado-base hover:underline font-medium">
            Ver página completa →
          </Link>
        </p>
      )}
    </div>
  );
}
