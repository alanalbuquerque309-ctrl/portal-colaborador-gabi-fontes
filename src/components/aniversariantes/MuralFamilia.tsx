'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Aniversariante {
  id: string;
  nome: string;
  data_nascimento: string | null;
  foto_url?: string | null;
  unidade_nome: string;
}

export function MuralFamilia() {
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
  const [loading, setLoading] = useState(true);
  const [semSessao, setSemSessao] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setSemSessao(true);
      setLoading(false);
      return;
    }

    fetch('/api/portal/aniversariantes', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.aniversariantes)) {
          setAniversariantes(data.aniversariantes);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (semSessao) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
        <p className="text-coffee-base">Faça login para ver os aniversariantes.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6 flex justify-center">
        <XicaraCarregando size="md" label="Carregando aniversariantes…" />
      </div>
    );
  }

  if (aniversariantes.length === 0) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
        <p className="text-coffee-base">
          Nenhum aniversariante neste mês. Parabéns a todos da família Gabi Fontes!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {aniversariantes.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-dourado-200 bg-cream-50 px-4 py-3 flex items-center gap-4"
        >
          {a.foto_url ? (
            <img
              src={a.foto_url}
              alt=""
              className="w-12 h-12 rounded-full object-cover border-2 border-dourado-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-dourado-100 flex items-center justify-center border-2 border-dourado-200 shrink-0">
              <span className="text-dourado-600 font-display text-lg">
                {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="font-display font-semibold text-coffee-base block">{a.nome}</span>
            <span className="text-coffee-100 text-sm">
              {a.data_nascimento
                ? new Date(a.data_nascimento).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                  })
                : ''}
              {a.unidade_nome ? ` · ${a.unidade_nome}` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
