'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { formatarExibicaoAvaliacaoAdmin } from '@/lib/avaliacao-diaria';
import {
  filtrarLinhasAdminBusca,
  type LinhaAdminAvaliacaoEquipe,
} from '@/lib/admin-avaliacoes-equipe-agrupar';
import {
  AvaliacaoNotasGaveta,
  type LinhaAvaliacaoGaveta,
} from '@/components/admin/AvaliacaoNotasGaveta';
import { AdminAvaliacoesEquipeAgrupado } from '@/components/admin/AdminAvaliacoesEquipeAgrupado';
import { AdminAvaliacaoAdminAcao } from '@/components/admin/AdminAvaliacaoAdminAcao';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';
import { AvaliacoesPendentesModal } from '@/components/admin/AvaliacoesPendentesModal';
import type { SituacaoEvolucao } from '@/lib/evolucao';

type Linha = LinhaAdminAvaliacaoEquipe;

type ModoVisualizacao = 'agrupado' | 'detalhada';

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
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState<ModoVisualizacao>('agrupado');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [podeVerDetalhe, setPodeVerDetalhe] = useState(false);
  const [gavetaId, setGavetaId] = useState<string | null>(null);
  const [pendentesAberto, setPendentesAberto] = useState(false);
  const [infoAberta, setInfoAberta] = useState(false);
  const [tendencias, setTendencias] = useState<
    Record<string, { situacao: SituacaoEvolucao; delta: number | null }>
  >({});

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPodeVerDetalhe(data.pode_ver_detalhe_notas_avaliacao === true);
      })
      .catch(() => setPodeVerDetalhe(false));
  }, []);

  const linhaGaveta: LinhaAvaliacaoGaveta | null = gavetaId
    ? (linhas.find((l) => l.id === gavetaId) ?? null)
    : null;

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setGavetaId(null);
    try {
      const q = new URLSearchParams({ inicio, fim, limite: '800' });
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      const evoQ = new URLSearchParams({ resumo: '1', criterios: '0' });
      if (unidadeSlug) evoQ.set('unidade_slug', unidadeSlug);
      const [res, evoRes] = await Promise.all([
        fetch(`/api/admin/avaliacoes-diarias?${q}`, { credentials: 'include' }),
        fetch(`/api/admin/evolucao?${evoQ}`, { credentials: 'include' }),
      ]);
      const data = await res.json();
      const evoData = await evoRes.json().catch(() => ({ ok: false }));
      if (evoData.ok && evoData.tendencias) {
        setTendencias(evoData.tendencias as Record<string, { situacao: SituacaoEvolucao; delta: number | null }>);
      }
      if (!data.ok) {
        setErro(data.erro || 'Erro ao listar.');
        setLinhas([]);
        return;
      }
      setLinhas(Array.isArray(data.linhas) ? data.linhas : []);
      if (typeof data.pode_ver_detalhe === 'boolean') setPodeVerDetalhe(data.pode_ver_detalhe);
    } catch {
      setErro('Erro de conexão.');
      setLinhas([]);
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, unidadeSlug]);

  const abrirGaveta = (id: string) => {
    if (!podeVerDetalhe) return;
    setGavetaId((atual) => (atual === id ? null : id));
  };

  const linhasExibidas = filtrarLinhasAdminBusca(linhas, busca);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">
          Avaliação de Equipe (semanal)
        </h1>
        <button
          type="button"
          onClick={() => setInfoAberta((v) => !v)}
          aria-expanded={infoAberta}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-dourado-600 hover:text-dourado-500"
        >
          <svg
            className={`w-4 h-4 shrink-0 transition-transform ${infoAberta ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
          {infoAberta ? 'Ocultar orientações' : 'Como funciona'}
        </button>
        {infoAberta && (
          <div className="mt-3 rounded-xl border border-cream-300 bg-cream-50/80 p-4 text-sm text-coffee-base leading-relaxed space-y-3">
            <p>
              Avaliações semanais que os líderes fizeram da equipe. Falta injustificada aparece com média{' '}
              <strong>0,00</strong>; repasse ao outro líder aparece como <strong>Outro líder</strong>.
              {podeVerDetalhe ? (
                <>
                  {' '}
                  Clique na <strong>média</strong> para ver cada critério (sócio / administrador). Use{' '}
                  <strong>Ignorar avaliação</strong> quando o vínculo estava errado: some da média e do ranking, o
                  registro permanece.
                </>
              ) : null}
            </p>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <Link href="/admin/avaliacoes-lideranca" className="text-dourado-500 hover:underline">
                Feedback sobre liderança →
              </Link>
              <Link href="/admin/pendencias-semana" className="text-dourado-500 hover:underline">
                Pendências da semana (ao vivo) →
              </Link>
              <Link href="/portal/relatorios-avaliacoes" className="text-dourado-500 hover:underline">
                Relatório completo no portal →
              </Link>
              <Link href="/admin/avaliacao-entre-pares" className="text-dourado-500 hover:underline">
                Troféus entre pares →
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-coffee-base mb-1">Início</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-base mb-1">Fim</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-coffee-base mb-1">Unidade (opcional)</label>
            <select
              value={unidadeSlug}
              onChange={(e) => setUnidadeSlug(e.target.value)}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base text-sm"
            >
              <option value="">Todas</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="block text-sm font-medium text-coffee-base mb-1">Buscar nome, setor ou avaliador</label>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: Cleverton, Estoque…"
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base text-sm"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
            <button
              type="button"
              onClick={() => void buscar()}
              disabled={carregando}
              className="w-full sm:w-auto rounded-lg bg-dourado-base text-cream-100 px-5 py-2.5 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
            >
              {carregando ? 'Carregando…' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={() => setPendentesAberto(true)}
              className="w-full sm:w-auto rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-950 px-5 py-2.5 text-sm font-semibold hover:bg-amber-100"
            >
              Pendentes da semana
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center pt-3 border-t border-cream-200">
          <span className="text-sm font-medium text-coffee-base mr-1">Visualização:</span>
          <button
            type="button"
            onClick={() => setModo('agrupado')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              modo === 'agrupado'
                ? 'bg-dourado-base text-cream-100'
                : 'bg-cream-100 text-coffee-base hover:bg-cream-200'
            }`}
          >
            Por colaborador e semana
          </button>
          <button
            type="button"
            onClick={() => setModo('detalhada')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              modo === 'detalhada'
                ? 'bg-dourado-base text-cream-100'
                : 'bg-cream-100 text-coffee-base hover:bg-cream-200'
            }`}
          >
            Lista detalhada
          </button>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {linhas.length > 0 && (
          <p className="text-xs text-coffee-100">
            {linhas.length} registro{linhas.length === 1 ? '' : 's'} no período.
            {modo === 'agrupado' && ' Mesma pessoa na mesma semana aparece uma vez, com todas as notas dos avaliadores.'}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white overflow-hidden shadow-sm">
        {modo === 'agrupado' ? (
          carregando && linhas.length === 0 ? (
            <p className="text-sm text-coffee-100 px-4 py-10 text-center">Carregando…</p>
          ) : (
            <AdminAvaliacoesEquipeAgrupado
              linhas={linhasExibidas}
              busca=""
              podeVerDetalhe={podeVerDetalhe}
              podeIgnorar={podeVerDetalhe}
              gavetaId={gavetaId}
              onAbrirGaveta={abrirGaveta}
              onRecarregar={() => void buscar()}
              tendencias={tendencias}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-100 text-coffee-base border-b border-cream-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">Semana (segunda)</th>
                  <th className="px-3 py-2 font-semibold">Colaborador</th>
                  <th className="px-3 py-2 font-semibold">Setor · Função</th>
                  <th className="px-3 py-2 font-semibold">Avaliador</th>
                  <th className="px-3 py-2 font-semibold">Média</th>
                  <th className="px-3 py-2 font-semibold">Justificativa</th>
                  {podeVerDetalhe && <th className="px-3 py-2 font-semibold">Ação</th>}
                </tr>
              </thead>
              <tbody>
                {linhasExibidas.length === 0 ? (
                  <tr>
                    <td colSpan={podeVerDetalhe ? 7 : 6} className="px-3 py-8 text-center text-coffee-100">
                      {carregando ? '…' : 'Nenhum registro. Ajuste o período e busque.'}
                    </td>
                  </tr>
                ) : (
                  linhasExibidas.map((l) => {
                    const exib = formatarExibicaoAvaliacaoAdmin(l);
                    const gavetaAberta = gavetaId === l.id;
                    const ignorada = avaliacaoEstaIgnorada(l);
                    return (
                      <tr
                        key={l.id}
                        className={`border-b border-cream-200 hover:bg-cream-50/80 ${
                          ignorada
                            ? 'bg-cream-100/60 opacity-80'
                            : exib.faltaInjustificada
                              ? 'bg-red-50/40'
                              : gavetaAberta
                                ? 'bg-dourado-50/50'
                                : ''
                        }`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-coffee-base">{l.data_referencia}</td>
                        <td className="px-3 py-2 text-coffee-base">{l.colaborador_nome ?? l.colaborador_id}</td>
                        <td className="px-3 py-2 text-coffee-100 text-xs">
                          {l.colaborador_setor ?? '—'}
                          <br />
                          <span className="text-coffee-base">{l.colaborador_cargo ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-coffee-base">
                          {l.avaliador_rotulo ?? l.avaliador_nome ?? l.avaliador_id}
                        </td>
                        <td className="px-3 py-2">
                          {podeVerDetalhe ? (
                            <button
                              type="button"
                              onClick={() => abrirGaveta(l.id)}
                              className={`font-medium rounded-md px-1.5 py-0.5 -mx-1.5 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-dourado-base/40 ${
                                exib.faltaInjustificada
                                  ? 'text-red-700'
                                  : exib.foraPlantao
                                    ? 'text-violet-800'
                                    : exib.legado
                                      ? 'text-coffee-100'
                                      : 'text-dourado-600 hover:text-dourado-500'
                              } ${gavetaAberta ? 'ring-2 ring-dourado-base/30 bg-dourado-50' : ''}`}
                              title="Ver notas por critério"
                            >
                              {exib.mediaLabel}
                            </button>
                          ) : (
                            <span
                              className={`font-medium ${
                                exib.faltaInjustificada
                                  ? 'text-red-700'
                                  : exib.foraPlantao
                                    ? 'text-violet-800'
                                    : exib.legado
                                      ? 'text-coffee-100'
                                      : 'text-coffee-base'
                              }`}
                            >
                              {exib.mediaLabel}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 max-w-md ${
                            exib.faltaInjustificada ? 'text-red-900 font-medium' : 'text-coffee-100'
                          }`}
                        >
                          {exib.justificativaLabel}
                          {ignorada && l.ignorada_motivo && (
                            <span className="block text-[10px] text-coffee-100 mt-1">
                              Ignorada: {l.ignorada_motivo}
                            </span>
                          )}
                        </td>
                        {podeVerDetalhe && (
                          <td className="px-3 py-2 align-top">
                            <AdminAvaliacaoAdminAcao
                              avaliacaoId={l.id}
                              colaboradorNome={l.colaborador_nome}
                              avaliadorRotulo={l.avaliador_rotulo ?? l.avaliador_nome}
                              jaIgnorada={ignorada}
                              onAlterada={() => void buscar()}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AvaliacaoNotasGaveta linha={linhaGaveta} onFechar={() => setGavetaId(null)} />
      <AvaliacoesPendentesModal aberto={pendentesAberto} onFechar={() => setPendentesAberto(false)} />
    </div>
  );
}
