'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminTrofeusRanking } from '@/components/admin/AdminTrofeusRanking';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { agregarRankingTrofeusPares } from '@/lib/trofeus-pares-ranking';
import { TROFEU_PAR_LABELS, TROFEUS_PARES_TIPOS } from '@/lib/trofeus-pares';

type LinhaTrofeu = {
  id: string;
  semana_inicio: string;
  semana_intervalo: string;
  avaliador_id: string;
  avaliador_nome: string;
  destinatario_id: string;
  destinatario_nome: string;
  tipo: string;
  trofeu_titulo: string;
  trofeu_emoji: string;
  unidade_nome: string;
  created_at: string;
};

type ModoVisual = 'ranking' | 'detalhe';

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
  const [modo, setModo] = useState<ModoVisual>('ranking');
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

  const ranking = useMemo(() => agregarRankingTrofeusPares(linhas), [linhas]);

  const resumo = useMemo(() => {
    const porTipo = new Map<string, number>();
    for (const l of linhas) {
      porTipo.set(l.trofeu_titulo, (porTipo.get(l.trofeu_titulo) ?? 0) + 1);
    }
    return { porTipo, total: linhas.length, pessoas: ranking.length };
  }, [linhas, ranking.length]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">Troféus entre pares</h1>
        <p className="text-sm text-coffee-100 mt-1 max-w-2xl">
          Ranking <strong>mensal</strong> de quem mais recebeu troféus no período (filtre pelo mês civil). Use
          &quot;Envios detalhados&quot; só quando precisar ver quem enviou cada troféu.
        </p>
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm space-y-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">De</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Até</label>
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
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm min-w-[160px]"
            >
              <option value="">Todas</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="block text-xs font-medium text-coffee-base mb-1">Buscar nome</label>
            <input
              type="search"
              value={buscaDraft}
              onChange={(e) => setBuscaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') aplicarBusca();
              }}
              placeholder="Quem deu ou recebeu…"
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
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {linhas.length > 0 && (
          <p className="text-sm text-coffee-base border-t border-cream-200 pt-3">
            <span className="font-medium">{resumo.total}</span> troféu{resumo.total === 1 ? '' : 's'} ·{' '}
            <span className="font-medium">{resumo.pessoas}</span> pessoa{resumo.pessoas === 1 ? '' : 's'} ·{' '}
            {TROFEUS_PARES_TIPOS.map((t) => `${TROFEU_PAR_LABELS[t].emoji} ${resumo.porTipo.get(TROFEU_PAR_LABELS[t].titulo) ?? 0}`).join(' · ')}
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setModo('ranking')}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            modo === 'ranking' ? 'bg-dourado-base text-cream-100' : 'border border-cream-300 text-coffee-base'
          }`}
        >
          Ranking
        </button>
        <button
          type="button"
          onClick={() => setModo('detalhe')}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            modo === 'detalhe' ? 'bg-dourado-base text-cream-100' : 'border border-cream-300 text-coffee-base'
          }`}
        >
          Envios detalhados
        </button>
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white overflow-hidden shadow-sm">
        {carregando && linhas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-coffee-100">Carregando…</p>
        ) : modo === 'ranking' ? (
          <AdminTrofeusRanking itens={ranking} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-50 text-coffee-base border-b border-cream-200">
                <tr>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Semana</th>
                  <th className="px-3 py-2 font-semibold">De → Para</th>
                  <th className="px-3 py-2 font-semibold">Troféu</th>
                  <th className="px-3 py-2 font-semibold">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-coffee-100">
                      Nenhum troféu no período.
                    </td>
                  </tr>
                ) : (
                  linhas.map((l) => (
                    <tr key={l.id} className="border-b border-cream-200 hover:bg-cream-50/80">
                      <td className="px-3 py-2 text-coffee-100 whitespace-nowrap text-xs">
                        {l.semana_intervalo || l.semana_inicio}
                      </td>
                      <td className="px-3 py-2 text-coffee-base">
                        <span className="font-medium">{l.avaliador_nome}</span>
                        <span className="text-coffee-100"> → </span>
                        <span className="font-medium">{l.destinatario_nome}</span>
                        <span className="block text-xs text-coffee-100 mt-0.5">{formatarDataHora(l.created_at)}</span>
                      </td>
                      <td className="px-3 py-2 text-coffee-base whitespace-nowrap">
                        <span aria-hidden>{l.trofeu_emoji}</span> {l.trofeu_titulo}
                      </td>
                      <td className="px-3 py-2 text-coffee-100 text-xs">{l.unidade_nome}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
