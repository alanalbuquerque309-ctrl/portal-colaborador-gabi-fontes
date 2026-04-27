'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';

interface Destaque {
  id: string;
  titulo: string;
  descricao: string;
  colaborador_nome: string;
  colaborador_foto: string | null;
  unidade_nome?: string | null;
}

export function DestaqueSection() {
  const [destaqueGeral, setDestaqueGeral] = useState<Destaque | null>(null);
  const [destaquesUnidade, setDestaquesUnidade] = useState<Destaque[]>([]);
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
        if (data.ok) {
          setDestaqueGeral((data.destaque_geral ?? data.destaque ?? null) as Destaque | null);
          setDestaquesUnidade(
            Array.isArray(data.destaques_unidade) ? (data.destaques_unidade as Destaque[]) : []
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!destaqueGeral && destaquesUnidade.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 to-cream-100 p-6 shadow-lg overflow-hidden">
      {destaqueGeral && (
        <div className="mb-5">
          <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-3">
            Destaque do mês — Geral
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {destaqueGeral.colaborador_foto ? (
              <img
                src={destaqueGeral.colaborador_foto}
                alt=""
                className="w-20 h-20 rounded-full object-cover border-2 border-dourado-300 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-dourado-200 flex items-center justify-center border-2 border-dourado-300 shrink-0">
                <span className="text-dourado-600 font-display text-2xl">
                  {destaqueGeral.colaborador_nome?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h3 className="font-display font-semibold text-coffee-base text-lg">
                {destaqueGeral.colaborador_nome}
              </h3>
              <p className="text-dourado-700 font-medium text-sm mt-0.5">{destaqueGeral.titulo}</p>
              {destaqueGeral.descricao && (
                <p className="text-coffee-100 text-sm mt-2 leading-relaxed">{destaqueGeral.descricao}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {destaquesUnidade.length > 0 && (
        <div className="pt-4 border-t border-dourado-200">
          <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-3">
            Destaques do mês por unidade
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {destaquesUnidade.map((d) => (
              <article key={`u-${d.id}`} className="rounded-xl border border-dourado-200 bg-white/80 p-3">
                <p className="text-xs text-coffee-100 uppercase tracking-wide mb-1">
                  {d.unidade_nome || 'Unidade'}
                </p>
                <h4 className="font-semibold text-coffee-base">{d.colaborador_nome}</h4>
                <p className="text-xs text-dourado-700">{d.titulo}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
