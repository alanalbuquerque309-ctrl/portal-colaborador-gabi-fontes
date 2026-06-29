'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { ComunicacaoAudienciaGaveta } from '@/components/admin/ComunicacaoAudienciaGaveta';
import type { ResumoAudienciaComunicacao } from '@/lib/audiencia-comunicacao';
import { getTermo } from '@/lib/tenant/terminology';

interface Treinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  video_youtube_url: string | null;
  data_publicacao: string;
  ativo: boolean;
  exige_confirmacao: boolean;
  publico_label: string;
  youtube_ok: boolean;
}

interface TreinoAutomatico {
  id: string;
  titulo: string;
  descricao: string;
  embed_url: string | null;
  youtube_ok: boolean;
}

export default function TreinamentosAdminPage() {
  const termoQuinta = getTermo('quinta_treino');
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [treinosAutomaticos, setTreinosAutomaticos] = useState<TreinoAutomatico[]>([]);
  const [loading, setLoading] = useState(true);
  const [migracaoPendente, setMigracaoPendente] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [gaveta, setGaveta] = useState<(ResumoAudienciaComunicacao & { titulo: string; publico_label?: string }) | null>(
    null
  );
  const [gavetaTitulo, setGavetaTitulo] = useState('');

  const recarregar = () => {
    setLoading(true);
    fetch('/api/admin/treinamentos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.treinamentos)) {
          setTreinamentos(data.treinamentos);
          setTreinosAutomaticos(
            Array.isArray(data.treinos_automaticos) ? data.treinos_automaticos : []
          );
          setMigracaoPendente(data.migracao_pendente === true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    recarregar();
  }, []);

  const abrirAudiencia = async (id: string, titulo: string) => {
    const res = await fetch(`/api/admin/treinamentos/${id}/audiencia`, { credentials: 'include' });
    const data = await res.json();
    if (data.ok) {
      setGavetaTitulo(titulo);
      setGaveta(data);
    } else {
      alert(data.erro || 'Não foi possível carregar a audiência.');
    }
  };

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
            Vídeos e materiais publicados para a equipe. A «{termoQuinta}» continua configurada por variáveis de ambiente e
            aparece no portal junto com estes itens.
          </p>
        </div>
        <Link
          href="/admin/treinamento/novo"
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors"
        >
          Novo treinamento
        </Link>
      </div>

      {migracaoPendente ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Migration <strong>048</strong> ainda não aplicada no Supabase. Rode o SQL de{' '}
          <code className="text-xs">supabase/migrations/048_aviso_visualizacoes_treinamentos.sql</code> no SQL Editor.
        </div>
      ) : null}

      {treinosAutomaticos.length > 0 ? (
        <div className="mb-6 rounded-xl border border-dourado-base/40 bg-dourado-50/40 p-5">
          <h2 className="text-lg font-display font-semibold text-coffee-base mb-1">
            Treinos automáticos no portal
          </h2>
          <p className="text-sm text-cafeteria-700 mb-4">
            Estes vídeos já aparecem em <strong>/portal/treinamento</strong> ({termoQuinta}). Não precisam cadastro
            manual. Sócios e admin veem os dois; colaboradores e líderes veem conforme o perfil.
          </p>
          <ul className="space-y-3 list-none m-0 p-0">
            {treinosAutomaticos.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-cafeteria-200 bg-white px-4 py-3 flex flex-wrap items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-cafeteria-900">{t.titulo}</p>
                  <p className="text-sm text-cafeteria-600 mt-0.5">{t.descricao}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                    t.youtube_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {t.youtube_ok ? 'YouTube OK' : 'URL inválida'}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/portal/treinamento"
            className="inline-block mt-4 text-sm font-semibold text-dourado-base hover:underline"
          >
            Abrir como colaborador →
          </Link>
        </div>
      ) : null}

      {treinamentos.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-50 p-8 text-center">
          <p className="text-coffee-base mb-2">Nenhum treinamento extra cadastrado no banco.</p>
          <p className="text-sm text-cafeteria-600 mb-4">
            Os vídeos da {termoQuinta} (acima) já estão no portal. Use «Novo treinamento» só para materiais adicionais.
          </p>
          <Link
            href="/admin/treinamento/novo"
            className="inline-block rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400"
          >
            Publicar primeiro vídeo
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-cream-300 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Público</th>
                <th className="text-left px-4 py-3 font-medium">Vídeo</th>
                <th className="text-left px-4 py-3 font-medium">Confirmação</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="w-48 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {treinamentos.map((t) => (
                <tr key={t.id} className="border-t border-cream-300 hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-coffee-base">{t.titulo}</td>
                  <td className="px-4 py-3 text-coffee-100">{t.publico_label}</td>
                  <td className="px-4 py-3">{t.youtube_ok ? <span className="text-green-600">OK</span> : <span className="text-red-600">Inválido</span>}</td>
                  <td className="px-4 py-3">{t.exige_confirmacao ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">{t.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void abrirAudiencia(t.id, t.titulo)}
                        className="text-dourado-base hover:text-dourado-600 text-xs font-medium"
                      >
                        Quem viu
                      </button>
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

      {gaveta ? (
        <ComunicacaoAudienciaGaveta
          titulo={gavetaTitulo}
          tipo="treinamento"
          dados={gaveta}
          onFechar={() => setGaveta(null)}
        />
      ) : null}
    </div>
  );
}
