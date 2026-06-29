'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import { AdminStatCard } from '@/components/admin/shell/AdminStatCard';
import { EvolucaoBadge } from '@/components/admin/EvolucaoBadge';
import { EvolucaoPainelExecutivo } from '@/components/admin/EvolucaoPainelExecutivo';
import { EvolucaoNotaLiderGuiaGaveta } from '@/components/admin/EvolucaoNotaLiderGuiaGaveta';
import { EvolucaoSparkline } from '@/components/admin/EvolucaoSparkline';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { listarUnidadesCadastro, listarSetoresCadastro } from '@/lib/tenant/org-catalog';
import {
  formatarDelta,
  formatarIli,
  formatarNota,
  rotuloComparacaoEvolucao,
  rotuloSituacao,
  tomSituacao,
  type SituacaoEvolucao,
} from '@/lib/evolucao';
import type { ColaboradorEvolucao, PayloadEvolucaoRede, SetorEvolucao, UnidadeEvolucao } from '@/lib/evolucao-rede';
import type { LiderEvolucao, PayloadEvolucaoLideranca } from '@/lib/evolucao-lideranca';

type Aba = 'rede' | 'colaboradores' | 'unidades' | 'setores' | 'lideranca';
type ModoRanking = 'atual' | 'evolucao';

function filtrarColaboradores(
  lista: ColaboradorEvolucao[],
  busca: string,
  situacao: SituacaoEvolucao | ''
): ColaboradorEvolucao[] {
  const q = busca.trim().toLowerCase();
  return lista.filter((c) => {
    if (situacao && c.situacao !== situacao) return false;
    if (!q) return true;
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.setor ?? '').toLowerCase().includes(q) ||
      (c.unidade_nome ?? '').toLowerCase().includes(q)
    );
  });
}

function filtrarLideres(
  lista: LiderEvolucao[],
  busca: string,
  situacao: SituacaoEvolucao | ''
): LiderEvolucao[] {
  const q = busca.trim().toLowerCase();
  return lista.filter((l) => {
    if (situacao && l.situacao !== situacao) return false;
    if (!q) return true;
    return (
      l.nome.toLowerCase().includes(q) ||
      (l.setor ?? '').toLowerCase().includes(q) ||
      (l.unidade_nome ?? '').toLowerCase().includes(q)
    );
  });
}

function LinhaLider({
  l,
  expandido,
  onToggle,
}: {
  l: LiderEvolucao;
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-b border-cream-200 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 hover:bg-cream-50/80 transition-colors flex flex-wrap items-center gap-3"
      >
        <div className="min-w-0 flex-1 basis-[12rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-coffee-base">{l.nome}</span>
            <EvolucaoBadge situacao={l.situacao} compacto delta={l.delta} />
            {!l.elegivel_semana_atual && (
              <span className="text-[10px] uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                Semana incompleta
              </span>
            )}
          </div>
          <p className="text-sm text-cafeteria-600 mt-0.5 truncate">
            {l.setor ?? '—'} · {l.unidade_nome ?? '—'} · equipe {l.n_equipe}
          </p>
        </div>
        <div className="hidden sm:block shrink-0 w-[120px]">
          <EvolucaoSparkline pontos={l.historico} />
        </div>
        <div className="text-right shrink-0 min-w-[4rem]">
          <p className="text-[10px] uppercase text-cafeteria-500">Nota</p>
          <p className="text-xl font-display font-semibold tabular-nums">{formatarIli(l.ili_atual)}</p>
        </div>
        <div className="text-right shrink-0 min-w-[3.5rem]">
          <p className="text-[10px] uppercase text-cafeteria-500">Mudança</p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              l.delta != null && l.delta > 0
                ? 'text-emerald-700'
                : l.delta != null && l.delta < 0
                  ? 'text-red-700'
                  : 'text-coffee-base'
            }`}
          >
            {formatarDelta(l.delta)}
          </p>
        </div>
        <span className="text-cafeteria-400 text-sm shrink-0" aria-hidden>
          {expandido ? '▲' : '▼'}
        </span>
      </button>
      {expandido && (
        <div className="px-4 pb-4 pt-0 bg-cream-50/50 border-t border-cream-100">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="rounded-xl bg-white border border-cafeteria-100 p-3">
              <p className="text-xs text-cafeteria-600">Média das últimas 4 sem.</p>
              <p className="text-lg font-semibold tabular-nums">{formatarIli(l.ili_media_recente)}</p>
            </div>
            <div className="rounded-xl bg-white border border-cafeteria-100 p-3">
              <p className="text-xs text-cafeteria-600">Média equipe</p>
              <p className="text-lg font-semibold tabular-nums">{formatarNota(l.media_equipe)}</p>
            </div>
            <div className="rounded-xl bg-white border border-cafeteria-100 p-3">
              <p className="text-xs text-cafeteria-600">O que a equipe avaliou</p>
              <p className="text-lg font-semibold tabular-nums">{formatarNota(l.media_feedback)}</p>
            </div>
            <div className="rounded-xl bg-white border border-cafeteria-100 p-3">
              <p className="text-xs text-cafeteria-600">Semanas no histórico</p>
              <p className="text-lg font-semibold">{l.semanas_validas}</p>
            </div>
          </div>
          {l.motivos_elegibilidade.length > 0 && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
              Semana atual: {l.motivos_elegibilidade.join(' · ')}
            </p>
          )}
          <p className="text-xs text-cafeteria-500 mt-3">
            Abra «O que é a nota do líder?» acima para a explicação. Tendência nas últimas semanas:{' '}
            {rotuloSituacao(l.situacao)}.
          </p>
        </div>
      )}
    </li>
  );
}

function CardSetor({ s }: { s: SetorEvolucao }) {
  const pctEvoluindo = s.total > 0 ? Math.round((s.evoluindo / s.total) * 100) : 0;
  return (
    <article className="rounded-2xl border border-cafeteria-200/90 bg-gradient-to-br from-white via-cream-50/40 to-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-lg text-coffee-base leading-snug">{s.setor}</h3>
          <p className="text-xs text-cafeteria-600 mt-0.5">{s.total} colaborador(es)</p>
        </div>
        <EvolucaoBadge situacao={s.situacao} delta={s.delta} compacto />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-cafeteria-500">Média recente</p>
          <p className="text-2xl font-display font-semibold tabular-nums">{formatarNota(s.media_atual)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-cafeteria-500">Variação</p>
          <p className="text-2xl font-display font-semibold tabular-nums">{formatarDelta(s.delta)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5">🟢 {s.evoluindo}</span>
        <span className="rounded-full bg-slate-50 text-slate-700 px-2 py-0.5">➡️ {s.estavel}</span>
        <span className="rounded-full bg-red-50 text-red-800 px-2 py-0.5">🔴 {s.regredindo}</span>
      </div>
      {s.total > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-cream-200 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctEvoluindo}%` }} />
        </div>
      )}
    </article>
  );
}

function CardUnidade({ u }: { u: UnidadeEvolucao }) {
  const pctEvoluindo = u.total > 0 ? Math.round((u.evoluindo / u.total) * 100) : 0;
  return (
    <article className="rounded-2xl border border-cafeteria-200/90 bg-gradient-to-br from-white via-cream-50/40 to-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display font-semibold text-lg text-coffee-base">{u.nome}</h3>
          <p className="text-xs text-cafeteria-600 mt-0.5">{u.total} colaborador(es) com histórico</p>
        </div>
        <EvolucaoBadge situacao={u.situacao} delta={u.delta} compacto />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-cafeteria-500">Média recente</p>
          <p className="text-2xl font-display font-semibold tabular-nums text-coffee-base">
            {formatarNota(u.media_atual)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-cafeteria-500">Variação</p>
          <p className="text-2xl font-display font-semibold tabular-nums text-coffee-base">
            {formatarDelta(u.delta)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 border border-emerald-100">
          🟢 {u.evoluindo}
        </span>
        <span className="rounded-full bg-slate-50 text-slate-700 px-2 py-0.5 border border-slate-200">
          ➡️ {u.estavel}
        </span>
        <span className="rounded-full bg-red-50 text-red-800 px-2 py-0.5 border border-red-100">
          🔴 {u.regredindo}
        </span>
        {u.sem_historico > 0 && (
          <span className="rounded-full bg-cream-100 text-coffee-100 px-2 py-0.5">⚪ {u.sem_historico}</span>
        )}
      </div>
      {u.total > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-cream-200 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pctEvoluindo}%` }}
            title={`${pctEvoluindo}% evoluindo`}
          />
        </div>
      )}
    </article>
  );
}

function LinhaColaborador({
  c,
  expandido,
  onToggle,
}: {
  c: ColaboradorEvolucao;
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-b border-cream-200 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 hover:bg-cream-50/80 transition-colors flex flex-wrap items-center gap-3"
      >
        <div className="min-w-0 flex-1 basis-[12rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-coffee-base">{c.nome}</span>
            <EvolucaoBadge situacao={c.situacao} compacto delta={c.delta} />
          </div>
          <p className="text-sm text-cafeteria-600 mt-0.5 truncate">
            {c.setor ?? '—'} · {c.unidade_nome ?? '—'}
          </p>
        </div>
        <div className="hidden sm:block shrink-0 w-[120px]">
          <EvolucaoSparkline pontos={c.historico} />
        </div>
        <div className="text-right shrink-0 min-w-[4.5rem]">
          <p className="text-[10px] uppercase text-cafeteria-500">Média 4 sem.</p>
          <p className="text-xl font-display font-semibold tabular-nums">
            {formatarNota(c.media_recente ?? c.nota_atual)}
          </p>
        </div>
        <div className="text-right shrink-0 min-w-[3.5rem]">
          <p className="text-[10px] uppercase text-cafeteria-500">Δ</p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              c.delta != null && c.delta > 0
                ? 'text-emerald-700'
                : c.delta != null && c.delta < 0
                  ? 'text-red-700'
                  : 'text-coffee-base'
            }`}
          >
            {formatarDelta(c.delta)}
          </p>
        </div>
        <span className="text-cafeteria-400 text-sm shrink-0" aria-hidden>
          {expandido ? '▲' : '▼'}
        </span>
      </button>
      {expandido && (
        <div className="px-4 pb-4 pt-0 bg-cream-50/50 border-t border-cream-100">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="rounded-xl bg-white border border-cafeteria-100 p-3">
              <p className="text-xs text-cafeteria-600">Última semana</p>
              <p className="text-lg font-semibold tabular-nums">{formatarNota(c.nota_atual)}</p>
            </div>
            <div className="rounded-xl bg-white border border-cafeteria-100 p-3">
              <p className="text-xs text-cafeteria-600">Semanas válidas</p>
              <p className="text-lg font-semibold">{c.semanas_validas}</p>
            </div>
            {c.melhor_criterio && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-3">
                <p className="text-xs text-emerald-800">Melhor evolução</p>
                <p className="text-sm font-medium text-emerald-900">{c.melhor_criterio}</p>
              </div>
            )}
            {c.pior_criterio && (
              <div className="rounded-xl bg-amber-50/80 border border-amber-100 p-3">
                <p className="text-xs text-amber-900">Precisa atenção</p>
                <p className="text-sm font-medium text-amber-950">{c.pior_criterio}</p>
              </div>
            )}
          </div>
          <div className="mt-3 sm:hidden">
            <EvolucaoSparkline pontos={c.historico} altura={48} className="max-w-full" />
          </div>
          <p className="text-xs text-cafeteria-500 mt-3">
            Tendência: compara semanas recentes vs anteriores (±0,1). Com pouco histórico usa janela menor; a partir de 8 semanas, 4×4. {rotuloSituacao(c.situacao)}.
          </p>
        </div>
      )}
    </li>
  );
}

export function EvolucaoAdminPanel() {
  const searchParams = useSearchParams();
  const abaInicial = (searchParams.get('aba') ?? 'rede') as Aba;
  const abaValida: Aba[] = ['rede', 'colaboradores', 'unidades', 'setores', 'lideranca'];
  const abaDefault = abaValida.includes(abaInicial) ? abaInicial : 'rede';

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [payload, setPayload] = useState<PayloadEvolucaoRede | null>(null);
  const [aba, setAba] = useState<Aba>(abaDefault);
  const [modoRanking, setModoRanking] = useState<ModoRanking>('atual');
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [setor, setSetor] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<SituacaoEvolucao | ''>('');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [lideranca, setLideranca] = useState<PayloadEvolucaoLideranca | null>(null);
  const [loadingLideranca, setLoadingLideranca] = useState(false);
  const [erroLideranca, setErroLideranca] = useState<string | null>(null);
  const [buscaLider, setBuscaLider] = useState('');
  const [filtroLider, setFiltroLider] = useState<SituacaoEvolucao | ''>('');
  const [expandidoLiderId, setExpandidoLiderId] = useState<string | null>(null);
  const [modoRankingLider, setModoRankingLider] = useState<ModoRanking>('atual');

  useEffect(() => {
    const valid: Aba[] = ['rede', 'colaboradores', 'unidades', 'setores', 'lideranca'];
    if (valid.includes(abaInicial)) setAba(abaInicial);
  }, [abaInicial]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const q = new URLSearchParams();
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      if (setor) q.set('setor', setor);
      const res = await fetch(`/api/admin/evolucao?${q}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setErro(String(data.erro ?? 'Erro ao carregar evolução.'));
        setPayload(null);
        return;
      }
      setPayload(data as PayloadEvolucaoRede);
    } catch {
      setErro('Erro de conexão.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [unidadeSlug, setor]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const carregarLideranca = useCallback(async () => {
    setLoadingLideranca(true);
    setErroLideranca(null);
    try {
      const res = await fetch('/api/admin/evolucao/lideranca', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setErroLideranca(String(data.erro ?? 'Erro ao carregar liderança.'));
        return;
      }
      setLideranca(data as PayloadEvolucaoLideranca);
    } catch {
      setErroLideranca('Erro de conexão ao carregar notas dos líderes.');
    } finally {
      setLoadingLideranca(false);
    }
  }, []);

  useEffect(() => {
    if (aba === 'lideranca' && !lideranca && !loadingLideranca) {
      void carregarLideranca();
    }
  }, [aba, lideranca, loadingLideranca, carregarLideranca]);

  const colaboradoresFiltrados = useMemo(
    () => filtrarColaboradores(payload?.colaboradores ?? [], busca, filtroSituacao),
    [payload, busca, filtroSituacao]
  );

  const lideresFiltrados = useMemo(
    () => filtrarLideres(lideranca?.lideres ?? [], buscaLider, filtroLider),
    [lideranca, buscaLider, filtroLider]
  );

  const resumo = payload?.resumo;

  const maxSemanasHistorico = useMemo(() => {
    const cols = payload?.colaboradores ?? [];
    if (cols.length === 0) return 0;
    return Math.max(...cols.map((c) => c.semanas_validas));
  }, [payload]);

  const rotuloJanela = rotuloComparacaoEvolucao(maxSemanasHistorico);

  const tabs: { id: Aba; label: string }[] = [
    { id: 'rede', label: 'Visão rede' },
    { id: 'colaboradores', label: 'Colaboradores' },
    { id: 'setores', label: 'Setores' },
    { id: 'unidades', label: 'Unidades' },
    { id: 'lideranca', label: 'Liderança' },
  ];

  if (loading && !payload) {
    return (
      <div className="py-16 flex justify-center">
        <XicaraCarregando size="lg" label="Calculando evolução da equipe…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        title="Saúde da equipe"
        description="Evolução semanal — individual, por unidade e visão da rede. Ideal para sócios, administração e RH."
        actions={
          <button
            type="button"
            onClick={() => (aba === 'lideranca' ? void carregarLideranca() : void carregar())}
            disabled={aba === 'lideranca' ? loadingLideranca : loading}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-cafeteria-200 bg-white px-4 py-2 text-sm font-medium text-coffee-base hover:bg-cream-50 disabled:opacity-60"
          >
            {aba === 'lideranca'
              ? loadingLideranca
                ? 'Carregando…'
                : 'Atualizar'
              : loading
                ? 'Atualizando…'
                : 'Atualizar'}
          </button>
        }
      />

      {(erro || erroLideranca) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {aba === 'lideranca' ? erroLideranca : erro}
        </div>
      )}

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-cream-100/80 border border-cafeteria-100 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAba(t.id)}
            className={`flex-1 min-w-[7rem] rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              aba === t.id
                ? 'bg-white text-coffee-base shadow-sm border border-cafeteria-200'
                : 'text-cafeteria-600 hover:text-coffee-base'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba !== 'lideranca' && (
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <label className="flex-1 min-w-[10rem]">
          <span className="text-xs font-medium text-cafeteria-600 block mb-1">Unidade</span>
          <select
            value={unidadeSlug}
            onChange={(e) => setUnidadeSlug(e.target.value)}
            className="w-full rounded-xl border border-cafeteria-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          >
            <option value="">Toda a rede</option>
            {listarUnidadesCadastro().map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[10rem]">
          <span className="text-xs font-medium text-cafeteria-600 block mb-1">Setor</span>
          <select
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="w-full rounded-xl border border-cafeteria-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          >
            <option value="">Todos</option>
            {listarSetoresCadastro().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {aba === 'colaboradores' && (
          <>
            <label className="flex-[2] min-w-[12rem]">
              <span className="text-xs font-medium text-cafeteria-600 block mb-1">Buscar</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, setor ou unidade"
                className="w-full rounded-xl border border-cafeteria-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
              />
            </label>
            <label className="min-w-[10rem]">
              <span className="text-xs font-medium text-cafeteria-600 block mb-1">Tendência</span>
              <select
                value={filtroSituacao}
                onChange={(e) => setFiltroSituacao(e.target.value as SituacaoEvolucao | '')}
                className="w-full rounded-xl border border-cafeteria-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
              >
                <option value="">Todas</option>
                <option value="evoluindo">Evoluindo</option>
                <option value="estavel">Estável</option>
                <option value="regredindo">Atenção</option>
                <option value="sem_historico">Sem histórico</option>
              </select>
            </label>
          </>
        )}
      </div>
      )}

      {aba === 'lideranca' && (
        <>
          <EvolucaoNotaLiderGuiaGaveta />
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-[2] min-w-[12rem]">
            <span className="text-xs font-medium text-cafeteria-600 block mb-1">Buscar líder</span>
            <input
              type="search"
              value={buscaLider}
              onChange={(e) => setBuscaLider(e.target.value)}
              placeholder="Nome, setor ou unidade"
              className="w-full rounded-xl border border-cafeteria-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            />
          </label>
          <label className="min-w-[10rem]">
            <span className="text-xs font-medium text-cafeteria-600 block mb-1">Subiu ou desceu?</span>
            <select
              value={filtroLider}
              onChange={(e) => setFiltroLider(e.target.value as SituacaoEvolucao | '')}
              className="w-full rounded-xl border border-cafeteria-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="">Todas</option>
              <option value="evoluindo">Evoluindo</option>
              <option value="estavel">Estável</option>
              <option value="regredindo">Atenção</option>
              <option value="sem_historico">Sem histórico</option>
            </select>
          </label>
        </div>
        </>
      )}

      {resumo && aba !== 'lideranca' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <AdminStatCard
            emoji="📊"
            label="Média da rede"
            valor={formatarNota(resumo.media_rede)}
            sub={`Δ ${formatarDelta(resumo.delta_rede)} (${rotuloJanela})`}
            tom={tomSituacao(resumo.situacao_rede)}
          />
          <AdminStatCard emoji="🟢" label="Evoluindo" valor={resumo.evoluindo} sub="Tendência positiva" tom="verde" />
          <AdminStatCard emoji="➡️" label="Estável" valor={resumo.estavel} sub="Dentro da faixa" tom="neutro" />
          <AdminStatCard emoji="🔴" label="Atenção" valor={resumo.regredindo} sub="Queda recente" tom="vermelho" />
          <AdminStatCard
            emoji="👥"
            label="Com histórico"
            valor={resumo.total_colaboradores - resumo.sem_historico}
            sub={`${resumo.sem_historico} ainda sem base`}
            tom="dourado"
          />
        </div>
      )}

      {aba === 'rede' && payload && (
        <div className="space-y-4 md:space-y-6">
          {payload.executivo && (
            <EvolucaoPainelExecutivo
              executivo={payload.executivo}
              onIrSetores={() => setAba('setores')}
              onIrUnidades={() => setAba('unidades')}
              onIrLideranca={() => setAba('lideranca')}
            />
          )}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          <AdminSection
            title="Rankings rápidos"
            description="Top 15 — clique em Colaboradores para ver a lista completa"
            action={
              <div className="flex rounded-lg border border-cafeteria-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setModoRanking('atual')}
                  className={`px-3 py-1.5 font-medium ${modoRanking === 'atual' ? 'bg-dourado-base text-cream-100' : 'bg-white text-coffee-base'}`}
                >
                  Nota atual
                </button>
                <button
                  type="button"
                  onClick={() => setModoRanking('evolucao')}
                  className={`px-3 py-1.5 font-medium ${modoRanking === 'evolucao' ? 'bg-dourado-base text-cream-100' : 'bg-white text-coffee-base'}`}
                >
                  Evolução
                </button>
              </div>
            }
          >
            <ol className="space-y-2 list-none m-0 p-0">
              {(modoRanking === 'atual' ? payload.ranking_atual : payload.ranking_evolucao).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-cafeteria-100 bg-white/80 px-3 py-2.5 hover:border-dourado-200 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-dourado-100 text-dourado-800 flex items-center justify-center text-sm font-bold shrink-0">
                    {r.posicao}
                  </span>
                  <span className="flex-1 font-medium text-coffee-base truncate">{r.nome}</span>
                  <span className="text-lg font-display font-semibold tabular-nums text-coffee-base shrink-0">
                    {'media' in r
                      ? formatarNota(r.media)
                      : formatarDelta((r as { delta: number }).delta)}
                  </span>
                </li>
              ))}
              {(modoRanking === 'atual' ? payload.ranking_atual : payload.ranking_evolucao).length === 0 && (
                <p className="text-sm text-cafeteria-600 py-4 text-center">Sem dados suficientes para ranking.</p>
              )}
            </ol>
          </AdminSection>

          <AdminSection title="Unidades em resumo" description="Clique na aba Unidades para detalhar">
            <div className="grid sm:grid-cols-2 gap-3">
              {payload.unidades
                .filter((u) => u.total > 0)
                .slice(0, 4)
                .map((u) => (
                  <CardUnidade key={u.slug} u={u} />
                ))}
            </div>
            <button
              type="button"
              onClick={() => setAba('unidades')}
              className="mt-3 text-sm font-medium text-dourado-base hover:underline"
            >
              Ver todas as unidades →
            </button>
          </AdminSection>

          <AdminSection title="Como ler" className="lg:col-span-2">
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-cafeteria-700">
              <div className="rounded-xl bg-cream-50 border border-cream-200 p-4">
                <p className="font-semibold text-coffee-base mb-1">Individual</p>
                <p>Compare a média das últimas 4 semanas com as 4 anteriores. Expanda cada linha para critérios.</p>
              </div>
              <div className="rounded-xl bg-cream-50 border border-cream-200 p-4">
                <p className="font-semibold text-coffee-base mb-1">Unidade</p>
                <p>Agregação dos colaboradores da filial — útil para sócios acompanharem Mesquita, Barra, etc.</p>
              </div>
              <div className="rounded-xl bg-cream-50 border border-cream-200 p-4">
                <p className="font-semibold text-coffee-base mb-1">Liderança</p>
                <p>Nota de cada líder na aba Liderança — equipe, avaliações em dia e o que a equipe fala do líder.</p>
              </div>
            </div>
          </AdminSection>
        </div>
        </div>
      )}

      {aba === 'setores' && payload && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {payload.setores
            .filter((s) => s.total > 0)
            .map((s) => (
              <CardSetor key={s.setor} s={s} />
            ))}
          {payload.setores.filter((s) => s.total > 0).length === 0 && (
            <p className="text-sm text-cafeteria-600 col-span-full py-8 text-center">
              Sem dados por setor com os filtros actuais.
            </p>
          )}
        </div>
      )}

      {aba === 'colaboradores' && (
        <AdminSection
          title="Colaboradores"
          description={`${colaboradoresFiltrados.length} de ${payload?.colaboradores.length ?? 0} — toque para expandir detalhes`}
          action={
            <Link href="/admin/avaliacoes-diarias" className="text-sm font-medium text-dourado-base hover:underline">
              Avaliações semanais →
            </Link>
          }
        >
          {colaboradoresFiltrados.length === 0 ? (
            <p className="text-sm text-cafeteria-600 py-8 text-center">Nenhum colaborador com estes filtros.</p>
          ) : (
            <ul className="rounded-2xl border border-cafeteria-200 overflow-hidden bg-white list-none m-0 p-0">
              {colaboradoresFiltrados.map((c) => (
                <LinhaColaborador
                  key={c.id}
                  c={c}
                  expandido={expandidoId === c.id}
                  onToggle={() => setExpandidoId((atual) => (atual === c.id ? null : c.id))}
                />
              ))}
            </ul>
          )}
        </AdminSection>
      )}

      {aba === 'unidades' && payload && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {payload.unidades.map((u) => (
            <CardUnidade key={u.slug} u={u} />
          ))}
        </div>
      )}

      {aba === 'lideranca' && (
        <>
          {loadingLideranca && !lideranca ? (
            <div className="py-12 flex justify-center">
              <XicaraCarregando size="md" label="Carregando notas dos líderes…" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
              <AdminSection
                title="Ranking dos líderes"
                description={
                  lideranca?.semana_referencia
                    ? `Semana de ${lideranca.semana_referencia}`
                    : 'Nota de 0 a 100 na semana'
                }
                action={
                  <div className="flex rounded-lg border border-cafeteria-200 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setModoRankingLider('atual')}
                      className={`px-3 py-1.5 font-medium ${modoRankingLider === 'atual' ? 'bg-dourado-base text-cream-100' : 'bg-white text-coffee-base'}`}
                    >
                      Nota da semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoRankingLider('evolucao')}
                      className={`px-3 py-1.5 font-medium ${modoRankingLider === 'evolucao' ? 'bg-dourado-base text-cream-100' : 'bg-white text-coffee-base'}`}
                    >
                      Evolução
                    </button>
                  </div>
                }
              >
                <ol className="space-y-2 list-none m-0 p-0">
                  {(modoRankingLider === 'atual'
                    ? lideranca?.ranking_ili_atual
                    : lideranca?.ranking_evolucao
                  )?.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-xl border border-cafeteria-100 bg-white/80 px-3 py-2.5"
                    >
                      <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-900 flex items-center justify-center text-sm font-bold shrink-0">
                        {r.posicao}
                      </span>
                      <span className="flex-1 font-medium text-coffee-base truncate">{r.nome}</span>
                      {'ili' in r && !r.elegivel && (
                        <span className="text-[10px] text-amber-800 shrink-0">incompleta</span>
                      )}
                      <span className="text-lg font-display font-semibold tabular-nums shrink-0">
                        {'ili' in r ? formatarIli(r.ili) : formatarDelta(r.delta)}
                      </span>
                    </li>
                  ))}
                </ol>
              </AdminSection>

              <AdminSection
                title="Líderes"
                description={`${lideresFiltrados.length} de ${lideranca?.lideres.length ?? 0}`}
                action={
                  <Link
                    href="/admin/avaliacoes-lideranca"
                    className="text-sm font-medium text-dourado-base hover:underline"
                  >
                    Feedback liderança →
                  </Link>
                }
                className="lg:col-span-2"
              >
                {lideresFiltrados.length === 0 ? (
                  <p className="text-sm text-cafeteria-600 py-8 text-center">Nenhum líder com estes filtros.</p>
                ) : (
                  <ul className="rounded-2xl border border-cafeteria-200 overflow-hidden bg-white list-none m-0 p-0">
                    {lideresFiltrados.map((l) => (
                      <LinhaLider
                        key={l.id}
                        l={l}
                        expandido={expandidoLiderId === l.id}
                        onToggle={() =>
                          setExpandidoLiderId((atual) => (atual === l.id ? null : l.id))
                        }
                      />
                    ))}
                  </ul>
                )}
              </AdminSection>
            </div>
          )}
        </>
      )}

      {payload?.gerado_em && aba !== 'lideranca' && (
        <p className="text-xs text-cafeteria-500 text-center">
          Atualizado em {new Date(payload.gerado_em).toLocaleString('pt-BR')}
        </p>
      )}

      {lideranca?.gerado_em && aba === 'lideranca' && (
        <p className="text-xs text-cafeteria-500 text-center">
          Atualizado em {new Date(lideranca.gerado_em).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}
