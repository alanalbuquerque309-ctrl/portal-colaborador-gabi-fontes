'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string | null;
  data_publicacao: string;
  unidade_nome?: string;
}

export function MuralPreview() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [semSessao, setSemSessao] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setSemSessao(true);
      setLoading(false);
      return;
    }

    fetch('/api/portal/avisos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.avisos)) {
          setAvisos(data.avisos.slice(0, 5));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (semSessao) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
        <p className="text-coffee-base">Faça login para ver os avisos da sua unidade.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6 flex justify-center">
        <XicaraCarregando size="sm" label="Carregando avisos…" />
      </div>
    );
  }

  if (avisos.length === 0) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
        <p className="text-coffee-base">
          Nenhum aviso no momento. Avisos da sua unidade aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {avisos.map((a) => (
        <article
          key={a.id}
          className="rounded-xl border border-dourado-200 bg-cream-50 p-4 shadow-sm"
        >
          <h3 className="font-display font-semibold text-coffee-base mb-1">{a.titulo}</h3>
          {a.conteudo && (
            <p className="text-coffee-100 text-sm leading-relaxed">{a.conteudo}</p>
          )}
          <p className="text-coffee-100/70 text-xs mt-2">
            {new Date(a.data_publicacao).toLocaleDateString('pt-BR')}
            {a.unidade_nome && ` · ${a.unidade_nome}`}
          </p>
        </article>
      ))}
    </div>
  );
}
