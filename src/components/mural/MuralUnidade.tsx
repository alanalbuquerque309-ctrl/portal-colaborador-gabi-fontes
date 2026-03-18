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
  exige_confirmacao?: boolean;
  confirmado?: boolean;
}

export function MuralUnidade() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [semSessao, setSemSessao] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const carregar = () => {
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
          setAvisos(data.avisos);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleConfirmar = async (avisoId: string) => {
    setConfirmando(avisoId);
    try {
      const res = await fetch('/api/portal/avisos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ aviso_id: avisoId }),
      });
      const data = await res.json();
      if (data.ok) {
        setAvisos((prev) =>
          prev.map((a) => (a.id === avisoId ? { ...a, confirmado: true } : a))
        );
      }
    } finally {
      setConfirmando(null);
    }
  };

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
        <XicaraCarregando size="md" label="Carregando avisos…" />
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
            <p className="text-coffee-100 text-sm leading-relaxed whitespace-pre-wrap">
              {a.conteudo}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-cream-200">
            <p className="text-coffee-100/70 text-xs">
              {new Date(a.data_publicacao).toLocaleDateString('pt-BR')}
              {a.unidade_nome && ` · ${a.unidade_nome}`}
            </p>
            {a.exige_confirmacao && (
              a.confirmado ? (
                <span className="text-xs text-green-600 font-medium">Li e confirmei</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmar(a.id)}
                  disabled={confirmando === a.id}
                  className="rounded-lg bg-dourado-base px-3 py-1.5 text-xs font-medium text-cream-100 hover:bg-dourado-400 disabled:opacity-50 transition-colors"
                >
                  {confirmando === a.id ? 'Confirmando…' : 'Li e confirmei'}
                </button>
              )
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
