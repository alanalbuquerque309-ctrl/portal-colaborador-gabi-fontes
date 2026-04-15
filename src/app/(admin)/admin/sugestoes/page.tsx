'use client';

import { useState, useEffect } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Item {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean;
  created_at: string;
  visualizado_em: string | null;
  curtidas: number;
  autor: string;
  unidade: string;
}

export default function SugestoesPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('');
  const [marcando, setMarcando] = useState<string | null>(null);
  const [podeReclamacoes, setPodeReclamacoes] = useState(true);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; podeVerReclamacoes?: boolean }) => {
        if (data.ok && data.podeVerReclamacoes === false) {
          setPodeReclamacoes(false);
          setFiltro((f) => (f === 'reclamacao' ? '' : f));
        }
      })
      .catch(() => {});
  }, []);

  const carregar = () => {
    setLoading(true);
    const params = filtro ? `?tipo=${filtro}` : '';
    fetch(`/api/admin/sugestoes${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.itens) setItens(data.itens);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, [filtro]);

  const marcarVisto = async (id: string) => {
    setMarcando(id);
    try {
      const res = await fetch(`/api/admin/sugestoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visualizado: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setItens((prev) =>
          prev.map((i) => (i.id === id ? { ...i, visualizado_em: new Date().toISOString() } : i))
        );
      }
    } finally {
      setMarcando(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-coffee-base">
            {podeReclamacoes ? 'Sugestões e Reclamações' : 'Sugestões'}
          </h1>
          {!podeReclamacoes && (
            <p className="text-sm text-coffee-100 mt-1 max-w-xl">
              Reclamações ficam visíveis apenas para sócios (evita conflito quando a mensagem envolve a própria
              equipe administrativa).
            </p>
          )}
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-lg border border-cream-300 px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">{podeReclamacoes ? 'Todos' : 'Todas as sugestões'}</option>
          <option value="sugestao">Sugestões</option>
          {podeReclamacoes ? <option value="reclamacao">Reclamações</option> : null}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <XicaraCarregando size="md" label="Carregando…" />
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-50 p-8">
          <p className="text-coffee-base">Nenhuma sugestão ou reclamação registrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itens.map((i) => (
            <div
              key={i.id}
              className={`rounded-xl border p-4 ${
                i.tipo === 'reclamacao' ? 'border-amber-200 bg-amber-50/50' : 'border-dourado-200 bg-cream-50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-coffee-100 uppercase">
                  {i.tipo === 'sugestao' ? 'Sugestão' : 'Reclamação'}
                </span>
                <span className="text-coffee-100 text-xs">
                  {new Date(i.created_at).toLocaleString('pt-BR')}
                  {i.unidade !== '-' && ` · ${i.unidade}`}
                </span>
              </div>
              <p className="text-coffee-base whitespace-pre-wrap">{i.texto}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <p className="text-coffee-100 text-xs">— {i.autor}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {i.tipo === 'sugestao' && (
                    <span className="text-xs text-coffee-100">
                      {i.curtidas} curtida{i.curtidas === 1 ? '' : 's'}
                    </span>
                  )}
                  {!i.visualizado_em ? (
                    <button
                      type="button"
                      onClick={() => marcarVisto(i.id)}
                      disabled={marcando === i.id}
                      className="text-xs rounded-lg border border-dourado-base px-3 py-1 text-dourado-base hover:bg-dourado-50 disabled:opacity-50"
                    >
                      {marcando === i.id ? '…' : 'Marcar como visto / em análise'}
                    </button>
                  ) : (
                    <span className="text-xs text-green-700">
                      Visto em {new Date(i.visualizado_em).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
