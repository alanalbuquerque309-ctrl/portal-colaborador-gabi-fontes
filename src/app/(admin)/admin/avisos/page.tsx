'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string | null;
  data_publicacao: string;
  ativo: boolean;
  exige_confirmacao: boolean;
  unidade_id: string;
  unidade_nome: string;
}

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const recarregar = () => {
    setLoading(true);
    fetch('/api/admin/avisos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.avisos)) {
          setAvisos(data.avisos);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    recarregar();
  }, []);

  const handleExcluir = async (id: string, titulo: string) => {
    if (!confirm(`Excluir o aviso "${titulo}"?`)) return;
    setExcluindo(id);
    try {
      const res = await fetch(`/api/admin/avisos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setAvisos((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(data.erro || 'Erro ao excluir.');
      }
    } catch {
      alert('Erro ao excluir.');
    } finally {
      setExcluindo(null);
    }
  };

  const handleAtivarDesativar = async (a: Aviso) => {
    try {
      const res = await fetch(`/api/admin/avisos/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ativo: !a.ativo }),
      });
      const data = await res.json();
      if (data.ok) {
        setAvisos((prev) =>
          prev.map((av) => (av.id === a.id ? { ...av, ativo: !av.ativo } : av))
        );
      } else {
        alert(data.erro || 'Erro ao atualizar.');
      }
    } catch {
      alert('Erro ao atualizar.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando avisos…" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-coffee-base">Avisos</h1>
        <Link
          href="/admin/avisos/novo"
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors"
        >
          Novo aviso
        </Link>
      </div>

      {avisos.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-50 p-8 text-center">
          <p className="text-coffee-base mb-4">Nenhum aviso cadastrado.</p>
          <Link
            href="/admin/avisos/novo"
            className="inline-block rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400"
          >
            Criar primeiro aviso
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-cream-300 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-200">
              <tr>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Título</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Unidade</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Data</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Confirmação</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Status</th>
                <th className="w-40 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {avisos.map((a) => (
                <tr key={a.id} className="border-t border-cream-300 hover:bg-cream-50">
                  <td className="px-4 py-3 text-coffee-base font-medium">{a.titulo}</td>
                  <td className="px-4 py-3 text-coffee-100">{a.unidade_nome}</td>
                  <td className="px-4 py-3 text-coffee-100">
                    {new Date(a.data_publicacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {a.exige_confirmacao ? (
                      <span className="text-amber-600 font-medium">Sim</span>
                    ) : (
                      <span className="text-coffee-100">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.ativo ? (
                      <span className="text-green-600">Ativo</span>
                    ) : (
                      <span className="text-coffee-100">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link
                      href={`/admin/avisos/${a.id}/editar`}
                      className="text-dourado-base hover:text-dourado-600 text-xs font-medium"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleAtivarDesativar(a)}
                      className="text-coffee-base hover:underline text-xs font-medium"
                    >
                      {a.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(a.id, a.titulo)}
                      disabled={excluindo === a.id}
                      className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                    >
                      {excluindo === a.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
