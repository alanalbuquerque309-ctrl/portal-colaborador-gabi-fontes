'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { TROFEU_PAR_LABELS, TROFEUS_PARES_TIPOS } from '@/lib/trofeus-pares';

type LinhaTrofeu = {
  id: string;
  semana_inicio: string;
  semana_intervalo: string;
  avaliador_nome: string;
  destinatario_nome: string;
  tipo: string;
  trofeu_titulo: string;
  trofeu_emoji: string;
  unidade_nome: string;
  created_at: string;
};

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inicioMesISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatarDataHora(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminAvaliacaoEntreParesPage() {
  const [inicio, setInicio] = useState(inicioMesISO);
  const [fim, setFim] = useState(hojeISO);
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [buscaDraft, setBuscaDraft] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaTrofeu[]>([]);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = new URLSearchParams({ inicio, fim, limite: '1000' });
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      if (busca.trim()) q.set('q', busca.trim());
      const res = await fetch(`/api/admin/trofeus-pares?${q}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao listar troféus.');
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
  }, [inicio, fim, unidadeSlug, busca]);

  useEffect(() => {
    void buscar();
  }, [inicio, fim, unidadeSlug, busca, buscar]);

  const aplicarBusca = () => {
    setBusca(buscaDraft.trim());
  };

  const resumo = useMemo(() => {
    const porTipo = new Map<string, number>();
    const recebidos = new Map<string, number>();
    for (const l of linhas) {
      porTipo.set(l.trofeu_titulo, (porTipo.get(l.trofeu_titulo) ?? 0) + 1);
      recebidos.set(l.destinatario_nome, (recebidos.get(l.destinatario_nome) ?? 0) + 1);
    }
    return { porTipo, total: linhas.length, pessoasDistintas: recebidos.size };
  }, [linhas]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">Avaliação entre pares</h1>
        <p className="text-sm text-coffee-100 mt-1 max-w-3xl">
          Troféus enviados pelos colaboradores na avaliação de liderança (até 3 por semana, mesma unidade).
          Tipos: {TROFEUS_PARES_TIPOS.map((t) => TROFEU_PAR_LABELS[t].titulo).join(', ')}.
        </p>
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm space-y-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Semana a partir de</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Semana até</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Unidade</label>
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
          <div className="min-w-[200px] flex-1">
            <label className="block text-xs font-medium text-coffee-base mb-1">Buscar nome ou troféu</label>
            <input
              type="search"
              value={buscaDraft}
              onChange={(e) => setBuscaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') aplicarBusca();
              }}
              placeholder="Quem deu, quem recebeu, Postura…"
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <button
            type="button"
            onClick={aplicarBusca}
            className="rounded-lg border border-cream-300 text-coffee-base px-3 py-2 text-sm font-medium hover:bg-cream-50"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => void buscar()}
            disabled={carregando}
            className="rounded-lg bg-dourado-base text-cream-100 px-4 py-2 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {carregando ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {linhas.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-cream-200">
            <span className="rounded-full bg-cream-100 text-coffee-base px-2.5 py-1">
              {resumo.total} troféu{resumo.total === 1 ? '' : 's'}
            </span>
            {Array.from(resumo.porTipo.entries()).map(([titulo, n]) => (
              <span key={titulo} className="rounded-full bg-dourado-50 text-dourado-800 px-2.5 py-1">
                {titulo}: {n}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-cream-50 text-coffee-base border-b border-cream-200">
              <tr>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Semana</th>
                <th className="px-3 py-2 font-semibold">Quem deu</th>
                <th className="px-3 py-2 font-semibold">Troféu</th>
                <th className="px-3 py-2 font-semibold">Quem recebeu</th>
                <th className="px-3 py-2 font-semibold">Unidade</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Enviado em</th>
              </tr>
            </thead>
            <tbody>
              {carregando && linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-coffee-100">
                    Carregando…
                  </td>
                </tr>
              ) : linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-coffee-100">
                    Nenhum troféu no período. Ajuste as datas ou aguarde envios dos colaboradores.
                  </td>
                </tr>
              ) : (
                linhas.map((l) => (
                  <tr key={l.id} className="border-b border-cream-200 hover:bg-cream-50/80">
                    <td className="px-3 py-2 text-coffee-base whitespace-nowrap">
                      <span className="block text-xs text-coffee-100">{l.semana_inicio}</span>
                      {l.semana_intervalo}
                    </td>
                    <td className="px-3 py-2 font-medium text-coffee-base">{l.avaliador_nome}</td>
                    <td className="px-3 py-2 text-coffee-base">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden>{l.trofeu_emoji}</span>
                        {l.trofeu_titulo}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-coffee-base">{l.destinatario_nome}</td>
                    <td className="px-3 py-2 text-coffee-100">{l.unidade_nome}</td>
                    <td className="px-3 py-2 text-coffee-100 whitespace-nowrap text-xs">
                      {formatarDataHora(l.created_at)}
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
