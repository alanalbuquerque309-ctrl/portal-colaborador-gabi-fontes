'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Aniversariante = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  aniversario_label?: string;
  foto_url?: string | null;
  unidade_nome: string;
  possivel_conflito_admissao?: boolean;
};

function rotuloMesAtual(): string {
  return new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

export function AniversariantesReconhecimento() {
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
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
          const lista = data.aniversariantes as Aniversariante[];
          setAniversariantes(lista);
          setConflitos(lista.filter((a) => a.possivel_conflito_admissao).length);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <XicaraCarregando size="sm" label="Carregando aniversariantes…" />
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-cafeteria-800 mb-3">
        Aniversariantes de {rotuloMesAtual()}
      </h3>
      {conflitos > 0 && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {conflitos} cadastro(s) com data de nascimento igual à admissão — peça ao RH para corrigir no Admin.
        </p>
      )}
      {aniversariantes.length === 0 ? (
        <p className="text-sm text-cafeteria-600 rounded-xl border border-dourado-200 bg-cream-50 p-4">
          Nenhum aniversariante neste mês com data de nascimento cadastrada.
        </p>
      ) : (
        <ul className="space-y-2">
          {aniversariantes.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-dourado-200 bg-white/90 px-3 py-2.5 flex items-center gap-3"
            >
              {a.foto_url ? (
                <img
                  src={a.foto_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-dourado-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dourado-100 flex items-center justify-center border border-dourado-200 shrink-0">
                  <span className="text-dourado-600 font-display text-sm">
                    {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-coffee-base text-base block leading-snug break-words">
                  {a.nome}
                </span>
                <span className="text-sm text-cafeteria-600">
                  {a.aniversario_label || a.data_nascimento}
                  {a.unidade_nome ? ` · ${a.unidade_nome}` : ''}
                  {a.possivel_conflito_admissao ? ' · revisar cadastro' : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {aniversariantes.length > 0 && (
        <p className="text-sm text-center pt-3">
          <Link href="/portal/aniversariantes" className="text-dourado-base hover:underline font-medium">
            Ver página completa de aniversários
          </Link>
        </p>
      )}
    </section>
  );
}
