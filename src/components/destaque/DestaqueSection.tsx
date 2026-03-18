'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';

interface Destaque {
  id: string;
  titulo: string;
  descricao: string;
  colaborador_nome: string;
  colaborador_foto: string | null;
}

export function DestaqueSection() {
  const [destaque, setDestaque] = useState<Destaque | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    fetch('/api/portal/destaque', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.destaque) {
          setDestaque(data.destaque);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !destaque) return null;

  return (
    <section className="rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 to-cream-100 p-6 shadow-lg overflow-hidden">
      <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-3">
        Colaborador em Destaque
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {destaque.colaborador_foto ? (
          <img
            src={destaque.colaborador_foto}
            alt=""
            className="w-20 h-20 rounded-full object-cover border-2 border-dourado-300 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-dourado-200 flex items-center justify-center border-2 border-dourado-300 shrink-0">
            <span className="text-dourado-600 font-display text-2xl">
              {destaque.colaborador_nome?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}
        <div className="text-center sm:text-left flex-1">
          <h3 className="font-display font-semibold text-coffee-base text-lg">
            {destaque.colaborador_nome}
          </h3>
          <p className="text-dourado-700 font-medium text-sm mt-0.5">{destaque.titulo}</p>
          {destaque.descricao && (
            <p className="text-coffee-100 text-sm mt-2 leading-relaxed">{destaque.descricao}</p>
          )}
        </div>
      </div>
    </section>
  );
}
