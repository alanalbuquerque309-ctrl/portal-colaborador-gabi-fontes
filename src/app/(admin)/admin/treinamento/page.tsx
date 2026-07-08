'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { TreinamentoAcompanhamentoGestao } from '@/components/portal/TreinamentoAcompanhamentoGestao';
import type { TreinamentoTipoConteudo } from '@/lib/treinamento-conteudo';

interface Treinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_conteudo: TreinamentoTipoConteudo;
  data_publicacao: string;
  ativo: boolean;
  exige_confirmacao: boolean;
  publico_label: string;
}

function rotuloFormato(tipo: TreinamentoTipoConteudo): string {
  return tipo === 'texto' ? 'Texto' : 'Vídeo';
}

export default function TreinamentosAdminPage() {
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [migracaoPendente, setMigracaoPendente] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const recarregar = () => {
    setLoading(true);
    fetch('/api/admin/treinamentos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.treinamentos)) {
          setTreinamentos(data.treinamentos);
          setMigracaoPendente(data.migracao_pendente === true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    recarregar();
  }, []);

  const handleExcluir = async (id: string, titulo: string) => {
    if (!confirm(`Excluir o treinamento "${titulo}"?`)) return;
    setExcluindo(id);
    try {
      const res = await fetch(`/api/admin/treinamentos/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.ok) setTreinamentos((prev) => prev.filter((t) => t.id !== id));
      else alert(data.erro || 'Erro ao excluir.');
    } finally {
      setExcluindo(null);
    }
  };

  const toggleAtivo = async (t: Treinamento) => {
    const res = await fetch(`/api/admin/treinamentos/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ativo: !t.ativo }),
    });
    const data = await res.json();
    if (data.ok) {
      setTreinamentos((prev) => prev.map((x) => (x.id === t.id ? { ...x, ativo: !x.ativo } : x)));
    } else alert(data.erro || 'Erro ao atualizar.');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando treinamentos…" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-coffee-base">Treinamento</h1>
          <p className="text-sm text-coffee-100 mt-1">
            Materiais em texto ou vídeo por ciclo (quinta a quarta). A equipe acessa em{' '}
            <strong>/portal/treinamento</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/portal/treinamento"
            className="rounded-lg border border-cafeteria-200 bg-white px-4 py-2 text-sm font-semibold text-coffee-base hover:bg-cream-50 transition-colors"
          >
            Abrir como colaborador →
          </Link>
          <Link
            href="/admin/treinamento/novo"
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors"
          >
            Novo treinamento
          </Link>
        </div>
      </div>

      {migracaoPendente ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Migration <strong>048</strong> ainda não aplicada no Supabase. Rode o SQL de{' '}
          <code className="text-xs">supabase/migrations/048_aviso_visualizacoes_treinamentos.sql</code> no SQL Editor.
        </div>
      ) : null}

      {treinamentos.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-50 p-8 text-center mb-8">
          <p className="text-coffee-base mb-2">Nenhum material cadastrado no banco.</p>
          <p className="text-sm text-cafeteria-600 mb-4">
            Publique o texto ou vídeo da semana com «Novo treinamento». O acompanhamento da equipe aparece abaixo.
          </p>
          <Link
            href="/admin/treinamento/novo"
            className="inline-block rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400"
          >
            Publicar primeiro treinamento
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-cream-300 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-cream-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Público</th>
                <th className="text-left px-4 py-3 font-medium">Formato</th>
                <th className="text-left px-4 py-3 font-medium">Confirmação</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="w-40 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {treinamentos.map((t) => (
                <tr key={t.id} className="border-t border-cream-300 hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-coffee-base">{t.titulo}</td>
                  <td className="px-4 py-3 text-coffee-100">{t.publico_label}</td>
                  <td className="px-4 py-3 text-coffee-base">{rotuloFormato(t.tipo_conteudo)}</td>
                  <td className="px-4 py-3">{t.exige_confirmacao ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">{t.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/treinamento/${t.id}/editar`} className="text-dourado-base text-xs font-medium">
                        Editar
                      </Link>
                      <button type="button" onClick={() => void toggleAtivo(t)} className="text-coffee-base text-xs font-medium">
                        {t.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        disabled={excluindo === t.id}
                        onClick={() => void handleExcluir(t.id, t.titulo)}
                        className="text-red-600 text-xs font-medium disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TreinamentoAcompanhamentoGestao />
    </div>
  );
}
