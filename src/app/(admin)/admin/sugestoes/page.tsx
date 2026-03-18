'use client';

import { useState, useEffect } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Item {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean;
  created_at: string;
  autor: string;
  unidade: string;
}

export default function SugestoesPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('');

  useEffect(() => {
    const params = filtro ? `?tipo=${filtro}` : '';
    fetch(`/api/admin/sugestoes${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.itens) setItens(data.itens);
      })
      .finally(() => setLoading(false));
  }, [filtro]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-coffee-base">
          Sugestões e Reclamações
        </h1>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="sugestao">Sugestões</option>
          <option value="reclamacao">Reclamações</option>
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-coffee-100 uppercase">
                  {i.tipo === 'sugestao' ? 'Sugestão' : 'Reclamação'}
                </span>
                <span className="text-coffee-100 text-xs">
                  {new Date(i.created_at).toLocaleString('pt-BR')}
                  {i.unidade !== '-' && ` · ${i.unidade}`}
                </span>
              </div>
              <p className="text-coffee-base whitespace-pre-wrap">{i.texto}</p>
              <p className="text-coffee-100 text-xs mt-2">— {i.autor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
