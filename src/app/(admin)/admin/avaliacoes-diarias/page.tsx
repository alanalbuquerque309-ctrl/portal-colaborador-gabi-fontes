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
import { AdminAvaliacaoIgnorarAcao } from '@/components/admin/AdminAvaliacaoIgnorarAcao';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';

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
      const res = await fetch(`/api/admin/avaliacoes-diarias?${q}`, { credentials: 'include' });
      const data = await res.json();
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
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">Avaliações semanais (equipe)</h1>
        <p className="text-sm text-coffee-100 mt-1">
          Avaliações semanais que os líderes fizeram da equipe.           Falta injustificada aparece com média{' '}
          <strong>0,00</strong>; semanas isentas mostram <strong>Isenta</strong>.
          {podeVerDetalhe ? (
            <>
              {' '}
              Clique na <strong>média</strong> (chip ou tabela) para ver cada critério (sócio / administrador).
              {' '}
              Use <strong>Ignorar avaliação</strong> quando o vínculo estava errado: some da média e do ranking, o registro permanece.
            </>
          ) : null}
        </p>
        <p className="text-sm mt-2">
          <Link href="/admin/avaliacoes-lideranca" className="text-dourado-500 hover:underline">
            Ver feedback dos colaboradores sobre a liderança →
          </Link>
          {' · '}
          <Link href="/portal/relatorios-avaliacoes" className="text-dourado-500 hover:underline">
            Relatório completo no portal →
          </Link>
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
          <div className="min-w-[200px] flex-1">
            <label className="block text-xs font-medium text-coffee-base mb-1">Buscar nome, setor ou avaliador</label>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: Cleverton, Estoque…"
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
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

        <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-cream-200">
          <span className="text-xs font-medium text-coffee-base mr-1">Visualização:</span>
          <button
            type="button"
            onClick={() => setModo('agrupado')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
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
            className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                                  : exib.isenta
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
                                  : exib.isenta
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
                            {ignorada ? (
                              <span className="text-xs text-coffee-100">Ignorada</span>
                            ) : (
                              <AdminAvaliacaoIgnorarAcao
                                avaliacaoId={l.id}
                                colaboradorNome={l.colaborador_nome}
                                avaliadorRotulo={l.avaliador_rotulo ?? l.avaliador_nome}
                                onIgnorada={() => void buscar()}
                              />
                            )}
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
    </div>
  );
}
