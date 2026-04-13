'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';

type Linha = {
  id: string;
  data_referencia: string;
  assiduidade: string;
  media_dia: number | null;
  colaborador_id: string;
  colaborador_nome: string | null;
  avaliador_id: string;
  avaliador_nome: string | null;
};

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inicioMesISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function AdminAvaliacoesDiariasPage() {
  const [inicio, setInicio] = useState(inicioMesISO);
  const [fim, setFim] = useState(hojeISO);
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = new URLSearchParams({ inicio, fim, limite: '800' });
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      const res = await fetch(`/api/admin/avaliacoes-diarias?${q}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao listar.');
        setLinhas([]);
        return;
      }
      setLinhas(Array.isArray(data.linhas) ? data.linhas : []);
    } catch {
      setErro('Erro de conexão.');
      setLinhas([]);
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, unidadeSlug]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">Avaliações diárias</h1>
        <p className="text-sm text-coffee-100 mt-1">
          Relatório consolidado (administrativo / sócio). Gerentes não veem esta visão.
        </p>
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm space-y-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Início</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Fim</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Unidade (opcional)</label>
            <select
              value={unidadeSlug}
              onChange={(e) => setUnidadeSlug(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm min-w-[180px]"
            >
              <option value="">Todas</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void buscar()}
            disabled={carregando}
            className="rounded-lg bg-dourado-base text-cream-100 px-4 py-2 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {carregando ? 'Carregando…' : 'Buscar'}
          </button>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-cream-100 text-coffee-base border-b border-cream-300">
              <tr>
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Colaborador</th>
                <th className="px-3 py-2 font-semibold">Avaliador</th>
                <th className="px-3 py-2 font-semibold">Assiduidade</th>
                <th className="px-3 py-2 font-semibold">Média</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-coffee-100">
                    {carregando ? '…' : 'Nenhum registro. Ajuste o período e busque.'}
                  </td>
                </tr>
              ) : (
                linhas.map((l) => (
                  <tr key={l.id} className="border-b border-cream-200 hover:bg-cream-50/80">
                    <td className="px-3 py-2 whitespace-nowrap text-coffee-base">{l.data_referencia}</td>
                    <td className="px-3 py-2 text-coffee-base">{l.colaborador_nome ?? l.colaborador_id}</td>
                    <td className="px-3 py-2 text-coffee-base">{l.avaliador_nome ?? l.avaliador_id}</td>
                    <td className="px-3 py-2 text-coffee-100">{l.assiduidade}</td>
                    <td className="px-3 py-2 text-coffee-base">
                      {l.media_dia != null ? Number(l.media_dia).toFixed(2) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
