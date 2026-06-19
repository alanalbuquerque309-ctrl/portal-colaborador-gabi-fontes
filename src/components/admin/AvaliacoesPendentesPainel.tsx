'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import type { FiltroPendenciasSemana, ItemPendenciaSemana } from '@/lib/avaliacao-pendentes-semana';

type Props = {
  apiBase?: '/api/admin/avaliacoes-pendentes' | '/api/portal/avaliacoes-pendentes';
  autoRefresh?: boolean;
  intervaloMs?: number;
  compacto?: boolean;
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

export function AvaliacoesPendentesPainel({
  apiBase = '/api/admin/avaliacoes-pendentes',
  autoRefresh = false,
  intervaloMs = 30000,
  compacto = false,
}: Props) {
  const [dataRef, setDataRef] = useState('');
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [filtro, setFiltro] = useState<FiltroPendenciasSemana>('pendentes');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState('');
  const [atualizadoEm, setAtualizadoEm] = useState('');
  const [resumo, setResumo] = useState({ sem_lider: 0, sem_rh_complemento: 0, sem_rh_rede: 0, criticos: 0 });
  const [itens, setItens] = useState<ItemPendenciaSemana[]>([]);
  const [filtroLider, setFiltroLider] = useState('');
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

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
      const q = new URLSearchParams({ filtro, _: String(Date.now()) });
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
      setAtualizadoEm(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch {
      setErro('Erro de conexão.');
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [apiBase, busca, dataRef, filtro, unidadeSlug]);

  const handleExcluir = async (id: string, nome: string) => {
    if (
      !confirm(
        `Excluir colaborador "${nome}"?\n\nUse quando a pessoa já saiu da empresa. A ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    setExcluindoId(id);
    try {
      const res = await fetch(`/api/admin/colaboradores/excluir?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; erro?: string };
      if (data.ok) {
        setItens((prev) => prev.filter((i) => i.colaborador_id !== id));
      } else {
        alert(data.erro || 'Erro ao excluir.');
      }
    } catch {
      alert('Erro ao excluir.');
    } finally {
      setExcluindoId(null);
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void carregar(), intervaloMs);
    const onFocus = () => void carregar();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void carregar();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoRefresh, carregar, intervaloMs]);

  const totalVisivel = itensVisiveis.length;

  return (
    <div className={compacto ? 'space-y-3' : 'space-y-4'}>
      <div className={`${compacto ? '' : 'rounded-xl border border-cream-200 bg-white p-4 shadow-sm'} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {!compacto && (
              <h2 className="text-lg font-display font-semibold text-coffee-base">Pendentes da semana</h2>
            )}
            {intervalo && <p className="text-sm text-coffee-100 mt-0.5">{intervalo}</p>}
            {autoRefresh && atualizadoEm && (
              <p className="text-[11px] text-coffee-100 mt-0.5">Atualizado às {atualizadoEm}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            disabled={carregando}
            className="rounded-lg border border-dourado-base px-3 py-1.5 text-sm font-medium text-coffee-base hover:bg-dourado-50 disabled:opacity-50 shrink-0"
          >
            {carregando ? '…' : 'Atualizar'}
          </button>
        </div>

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
          <span className="rounded-full bg-dourado-base/20 text-coffee-base px-2.5 py-1 font-medium">
            {totalVisivel} na lista
          </span>
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

      <div className={compacto ? '' : 'rounded-xl border border-cream-200 bg-white p-4 shadow-sm'}>
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
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-800">
                      {rotuloTipo(item.tipo)}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                      <Link
                        href={`/admin/colaboradores/${item.colaborador_id}/editar`}
                        className="text-xs font-semibold text-dourado-base hover:text-dourado-600 underline underline-offset-2 whitespace-nowrap"
                      >
                        Editar perfil
                      </Link>
                      <span className="text-coffee-100 text-xs" aria-hidden>
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleExcluir(item.colaborador_id, item.colaborador_nome)}
                        disabled={excluindoId === item.colaborador_id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 whitespace-nowrap"
                      >
                        {excluindoId === item.colaborador_id ? 'Excluindo…' : 'Excluir perfil'}
                      </button>
                    </div>
                  </div>
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

      <p className="text-[10px] text-coffee-100">
        Responsável pelo mapa de liderança atual (admin → Liderança por setor). Erro de cadastro: use{' '}
        <strong className="font-medium">Editar perfil</strong>; quem saiu da empresa:{' '}
        <strong className="font-medium">Excluir perfil</strong> (só sócios e administrador).
        {autoRefresh
          ? ` Lista atualiza sozinha a cada ${Math.round(intervaloMs / 1000)}s quando você está nesta página.`
          : ''}
      </p>
    </div>
  );
}
