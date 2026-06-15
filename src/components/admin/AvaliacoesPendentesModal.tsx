'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import type { FiltroPendenciasSemana, ItemPendenciaSemana } from '@/lib/avaliacao-pendentes-semana';

type Props = {
  aberto: boolean;
  onFechar: () => void;
  apiBase?: '/api/admin/avaliacoes-pendentes' | '/api/portal/avaliacoes-pendentes';
};

const FILTROS: { id: FiltroPendenciasSemana; label: string }[] = [
  { id: 'pendentes', label: 'Pendentes (líder ou RH)' },
  { id: 'gerente', label: 'Sem líder' },
  { id: 'rh_complemento', label: 'RH (com gerente)' },
  { id: 'rh_rede', label: 'Sem Visita RH' },
];

function rotuloTipo(tipo: ItemPendenciaSemana['tipo']): string {
  switch (tipo) {
    case 'sem_lider':
      return 'Sem líder';
    case 'sem_rh':
      return 'Sem RH';
    case 'sem_lider_e_rh':
      return 'Líder + RH';
    case 'critico_fora_plantao':
      return 'Crítico';
    default:
      return tipo;
  }
}

export function AvaliacoesPendentesModal({
  aberto,
  onFechar,
  apiBase = '/api/admin/avaliacoes-pendentes',
}: Props) {
  const [dataRef, setDataRef] = useState('');
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [filtro, setFiltro] = useState<FiltroPendenciasSemana>('pendentes');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState('');
  const [resumo, setResumo] = useState({ sem_lider: 0, sem_rh_complemento: 0, sem_rh_rede: 0, criticos: 0 });
  const [itens, setItens] = useState<ItemPendenciaSemana[]>([]);
  const [filtroLider, setFiltroLider] = useState('');

  /** Quantos colaboradores cada líder ainda não avaliou (para ir direto ao líder). */
  const porLider = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of itens) {
      for (const r of item.responsaveis_lider) {
        if (r.status !== 'pendente') continue;
        const nome = r.lider_nome.trim() || '—';
        mapa.set(nome, (mapa.get(nome) ?? 0) + 1);
      }
    }
    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [itens]);

  const itensVisiveis = useMemo(() => {
    if (!filtroLider) return itens;
    return itens.filter((item) =>
      item.responsaveis_lider.some((r) => r.status === 'pendente' && r.lider_nome.trim() === filtroLider)
    );
  }, [itens, filtroLider]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = new URLSearchParams({ filtro });
      if (dataRef) q.set('data', dataRef);
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      if (busca.trim()) q.set('q', busca.trim());
      const res = await fetch(`${apiBase}?${q}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao carregar.');
        setItens([]);
        return;
      }
      setIntervalo(String(data.intervalo ?? ''));
      if (data.data_referencia) setDataRef(String(data.data_referencia));
      setResumo(data.resumo ?? { sem_lider: 0, sem_rh_complemento: 0, sem_rh_rede: 0, criticos: 0 });
      setItens(Array.isArray(data.itens) ? data.itens : []);
      setFiltroLider('');
    } catch {
      setErro('Erro de conexão.');
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [apiBase, busca, dataRef, filtro, unidadeSlug]);

  useEffect(() => {
    if (!aberto) return;
    void carregar();
  }, [aberto, carregar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onFechar}
      />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b border-cream-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold text-coffee-base">Pendentes da semana</h2>
            {intervalo && <p className="text-sm text-coffee-100 mt-0.5">{intervalo}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="text-coffee-100 hover:text-coffee-base text-2xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-cream-100 space-y-3 overflow-y-auto">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-1">
              {resumo.sem_lider} sem líder
            </span>
            <span className="rounded-full bg-cream-100 text-coffee-base px-2.5 py-1">
              {resumo.sem_rh_complemento} RH pendente (c/ gerente)
            </span>
            <span className="rounded-full bg-cream-100 text-coffee-base px-2.5 py-1">
              {resumo.sem_rh_rede} sem Visita RH
            </span>
            {resumo.criticos > 0 && (
              <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-1">
                {resumo.criticos} crítico(s)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-[10px] font-medium text-coffee-base mb-0.5">Semana (segunda)</label>
              <input
                type="date"
                value={dataRef}
                onChange={(e) => setDataRef(e.target.value)}
                className="rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-coffee-base mb-0.5">Unidade</label>
              <select
                value={unidadeSlug}
                onChange={(e) => setUnidadeSlug(e.target.value)}
                className="rounded-lg border border-cream-300 px-2 py-1.5 text-sm min-w-[140px]"
              >
                <option value="">Todas</option>
                {UNIDADES_CADASTRO.map((u) => (
                  <option key={u.slug} value={u.slug}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-medium text-coffee-base mb-0.5">Buscar</label>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, setor…"
                className="w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void carregar()}
              disabled={carregando}
              className="rounded-lg bg-dourado-base text-cream-100 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {carregando ? '…' : 'Atualizar'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  filtro === f.id ? 'bg-dourado-base text-cream-100' : 'bg-cream-100 text-coffee-base'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {porLider.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
              <p className="text-xs font-semibold text-amber-900 mb-1.5">
                Líderes que não avaliaram (toque para focar)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filtroLider && (
                  <button
                    type="button"
                    onClick={() => setFiltroLider('')}
                    className="rounded-full px-2.5 py-1 text-xs font-medium bg-coffee-base text-cream-100"
                  >
                    × Todos
                  </button>
                )}
                {porLider.map((l) => (
                  <button
                    key={l.nome}
                    type="button"
                    onClick={() => setFiltroLider((cur) => (cur === l.nome ? '' : l.nome))}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                      filtroLider === l.nome
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {l.nome.split(/\s+/)[0]} · {l.total}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {erro && <p className="text-sm text-red-600 mb-2">{erro}</p>}
          {carregando && itens.length === 0 ? (
            <p className="text-sm text-coffee-100 text-center py-8">Carregando…</p>
          ) : itensVisiveis.length === 0 ? (
            <p className="text-sm text-green-700 text-center py-8">Nenhuma pendência neste filtro.</p>
          ) : (
            <ul className="space-y-2 list-none m-0 p-0">
              {itensVisiveis.map((item) => (
                <li
                  key={item.colaborador_id}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${
                    item.tipo === 'critico_fora_plantao'
                      ? 'border-red-200 bg-red-50/80'
                      : 'border-cream-200 bg-cream-50/50'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-coffee-base">{item.colaborador_nome}</p>
                      <p className="text-xs text-coffee-100 mt-0.5">
                        {[item.setor, item.unidade_nome].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-800 shrink-0">
                      {rotuloTipo(item.tipo)}
                    </span>
                  </div>
                  {item.responsavel_lider_label !== '—' && (
                    <p className="text-xs mt-2 text-coffee-base">
                      <span className="font-medium">Líder:</span> {item.responsavel_lider_label}
                    </p>
                  )}
                  {item.responsavel_rh_label && (
                    <p className="text-xs mt-1 text-coffee-base">
                      <span className="font-medium">RH:</span> {item.responsavel_rh_label}
                      {item.tem_nota_gerente ? ' (gerente já avaliou)' : ''}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="px-4 py-2 text-[10px] text-coffee-100 border-t border-cream-100">
          Responsável pelo mapa de liderança atual (admin → Liderança por setor).
        </p>
      </div>
    </div>
  );
}
