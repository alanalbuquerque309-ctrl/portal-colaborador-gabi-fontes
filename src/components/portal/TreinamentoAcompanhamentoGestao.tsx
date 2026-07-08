'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ItemAcompanhamentoResumo, ItemAcompanhamentoTreinamento } from '@/lib/treinamento-acompanhamento';
import type { PessoaAudiencia } from '@/lib/audiencia-comunicacao';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type FiltroPublico = 'todos' | 'colaboradores' | 'lideranca';

function filtrarPorPublico(item: ItemAcompanhamentoResumo, filtro: FiltroPublico): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'lideranca') {
    return item.publico_alvo === 'lideranca' || item.id === 'quinta-lider';
  }
  return (
    item.publico_alvo === 'colaboradores' ||
    item.publico_alvo === 'todos' ||
    item.id === 'quinta-colaborador'
  );
}

function ListaNomes({
  titulo,
  corTitulo,
  pessoas,
  vazio,
  destaque,
}: {
  titulo: string;
  corTitulo: string;
  pessoas: PessoaAudiencia[];
  vazio: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${corTitulo}`}>
        {titulo} ({pessoas.length})
      </p>
      {pessoas.length === 0 ? (
        <p className="text-xs text-cafeteria-600 mt-1">{vazio}</p>
      ) : (
        <ul
          className={`mt-1.5 max-h-56 overflow-y-auto rounded-lg border divide-y ${
            destaque ? 'border-red-200 divide-red-100 bg-red-50/30' : 'border-cafeteria-200 divide-cafeteria-100'
          }`}
        >
          {pessoas.map((p) => (
            <li key={p.id} className="px-3 py-2 text-sm">
              <span className={`font-medium ${destaque ? 'text-red-900' : 'text-coffee-base'}`}>{p.nome}</span>
              {(p.setor || p.unidade_nome) && (
                <span className="text-xs text-cafeteria-600">
                  {' '}
                  · {[p.setor, p.unidade_nome].filter(Boolean).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CardTreinamentoResumo({
  resumo,
  detalhe,
  carregandoDetalhe,
  onAbrir,
}: {
  resumo: ItemAcompanhamentoResumo;
  detalhe: ItemAcompanhamentoTreinamento | null;
  carregandoDetalhe: boolean;
  onAbrir: (aberto: boolean) => void;
}) {
  const pendentes = resumo.nao_fizeram + resumo.visualizou_sem_confirmar;
  const tudoOk = pendentes === 0 && resumo.total_esperado > 0;

  return (
    <details
      className={`rounded-xl border overflow-hidden ${
        tudoOk ? 'border-emerald-200 bg-emerald-50/30' : 'border-cafeteria-200 bg-white'
      }`}
      onToggle={(e) => {
        const aberto = (e.currentTarget as HTMLDetailsElement).open;
        onAbrir(aberto);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-cream-50/60 transition-colors min-h-[52px] [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-coffee-base leading-snug">{resumo.titulo}</p>
          <p className="text-xs text-cafeteria-600 mt-0.5">
            {resumo.publico_label}
            {' · '}
            {resumo.formato === 'texto' ? 'Texto' : 'Vídeo'}
            {resumo.semana_rotulo ? ` · ${resumo.semana_rotulo}` : ''}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3 text-sm tabular-nums">
          <span className="font-semibold text-emerald-700">{resumo.concluiram} fez</span>
          <span className="text-cafeteria-400">|</span>
          <span className={`font-semibold ${pendentes > 0 ? 'text-red-700' : 'text-cafeteria-500'}`}>
            {pendentes} pend.
          </span>
        </div>
      </summary>
      <div className="border-t border-cafeteria-100 px-4 py-4">
        {carregandoDetalhe ? (
          <div className="flex justify-center py-4">
            <XicaraCarregando size="sm" label="Carregando nomes…" />
          </div>
        ) : detalhe ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ListaNomes
              titulo="Não fizeram"
              corTitulo="text-red-800"
              pessoas={detalhe.nao_assistiram}
              vazio="Todos concluíram."
              destaque={detalhe.nao_assistiram.length > 0}
            />
            {detalhe.visualizou_sem_confirmar.length > 0 ? (
              <ListaNomes
                titulo="Visualizou, não confirmou"
                corTitulo="text-sky-700"
                pessoas={detalhe.visualizou_sem_confirmar}
                vazio=""
              />
            ) : null}
            <ListaNomes
              titulo="Concluíram"
              corTitulo="text-emerald-700"
              pessoas={detalhe.assistiram}
              vazio="Ninguém concluiu ainda."
            />
          </div>
        ) : (
          <p className="text-sm text-cafeteria-600">Não foi possível carregar os nomes.</p>
        )}
      </div>
    </details>
  );
}

/**
 * Painel admin/RH/sócios: resumo leve + nomes só ao expandir; histórico carrega sob demanda.
 */
export function TreinamentoAcompanhamentoGestao() {
  const [visivel, setVisivel] = useState(false);
  const [loadingVigentes, setLoadingVigentes] = useState(true);
  const [loadingAnteriores, setLoadingAnteriores] = useState(false);
  const [vigentes, setVigentes] = useState<ItemAcompanhamentoResumo[]>([]);
  const [anteriores, setAnteriores] = useState<ItemAcompanhamentoResumo[]>([]);
  const [anterioresCarregados, setAnterioresCarregados] = useState(false);
  const [secaoAnterioresAberta, setSecaoAnterioresAberta] = useState(false);
  const [cicloQuintaRotulo, setCicloQuintaRotulo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [migracao064Pendente, setMigracao064Pendente] = useState(false);
  const [filtro, setFiltro] = useState<FiltroPublico>('todos');
  const [detalhes, setDetalhes] = useState<Record<string, ItemAcompanhamentoTreinamento>>({});
  const [carregandoDetalheId, setCarregandoDetalheId] = useState<string | null>(null);

  const carregarVigentes = useCallback(() => {
    setLoadingVigentes(true);
    return fetch('/api/portal/treinamentos/acompanhamento?resumo=1&escopo=vigentes', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          setVisivel(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.ok) {
          setVisivel(false);
          setErro(String(data.erro ?? 'Não foi possível carregar o acompanhamento.'));
          return;
        }
        setVisivel(true);
        setErro(null);
        setMigracao064Pendente(data.migracao_064_pendente === true);
        setCicloQuintaRotulo(typeof data.ciclo_quinta_rotulo === 'string' ? data.ciclo_quinta_rotulo : null);
        setVigentes(Array.isArray(data.itens) ? data.itens : []);
        setDetalhes({});
      })
      .catch(() => {
        setVisivel(false);
        setErro('Falha de conexão ao carregar acompanhamento.');
      })
      .finally(() => setLoadingVigentes(false));
  }, []);

  const carregarAnteriores = useCallback(() => {
    if (anterioresCarregados) return Promise.resolve();
    setLoadingAnteriores(true);
    return fetch('/api/portal/treinamentos/acompanhamento?resumo=1&escopo=anteriores', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.itens)) {
          setAnteriores(data.itens);
          setAnterioresCarregados(true);
        }
      })
      .finally(() => setLoadingAnteriores(false));
  }, [anterioresCarregados]);

  const carregarDetalhe = useCallback(
    async (id: string) => {
      if (detalhes[id]) return;
      setCarregandoDetalheId(id);
      try {
        const res = await fetch('/api/portal/treinamentos/acompanhamento', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.ok && data.item) {
          setDetalhes((prev) => ({ ...prev, [id]: data.item as ItemAcompanhamentoTreinamento }));
        }
      } finally {
        setCarregandoDetalheId(null);
      }
    },
    [detalhes]
  );

  useEffect(() => {
    void carregarVigentes();
  }, [carregarVigentes]);

  useEffect(() => {
    if (secaoAnterioresAberta) void carregarAnteriores();
  }, [secaoAnterioresAberta, carregarAnteriores]);

  const vigentesFiltrados = useMemo(
    () => vigentes.filter((i) => filtrarPorPublico(i, filtro)),
    [vigentes, filtro]
  );
  const anterioresFiltrados = useMemo(
    () => anteriores.filter((i) => filtrarPorPublico(i, filtro)),
    [anteriores, filtro]
  );

  const pendentesSemana = useMemo(
    () => vigentesFiltrados.reduce((acc, i) => acc + i.nao_fizeram + i.visualizou_sem_confirmar, 0),
    [vigentesFiltrados]
  );

  if (!visivel && !loadingVigentes) return null;

  if (loadingVigentes) {
    return (
      <section className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm">
        <div className="flex justify-center py-4">
          <XicaraCarregando size="sm" label="Carregando acompanhamento…" />
        </div>
      </section>
    );
  }

  if (!visivel) return null;

  const filtros: { id: FiltroPublico; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'colaboradores', label: 'Colaboradores' },
    { id: 'lideranca', label: 'Liderança' },
  ];

  const renderLista = (itens: ItemAcompanhamentoResumo[]) => (
    <div className="space-y-2">
      {itens.map((item) => (
        <CardTreinamentoResumo
          key={item.id}
          resumo={item}
          detalhe={detalhes[item.id] ?? null}
          carregandoDetalhe={carregandoDetalheId === item.id}
          onAbrir={(aberto) => {
            if (aberto) void carregarDetalhe(item.id);
          }}
        />
      ))}
    </div>
  );

  return (
    <section className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-coffee-base">Acompanhamento da equipe</h2>
          <p className="text-sm text-cafeteria-700 mt-1">
            {cicloQuintaRotulo ? `Ciclo vigente: ${cicloQuintaRotulo}. ` : ''}
            {pendentesSemana > 0 ? (
              <span className="font-semibold text-red-800">{pendentesSemana} pendência(s) nesta semana.</span>
            ) : (
              <span className="font-semibold text-emerald-700">Semana em dia.</span>
            )}
          </p>
          <p className="text-xs text-cafeteria-500 mt-1">
            Clique em um treinamento para ver os nomes. Histórico só carrega ao abrir a gaveta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAnterioresCarregados(false);
            setAnteriores([]);
            void carregarVigentes();
          }}
          className="text-sm font-medium text-dourado-base hover:underline min-h-[44px] px-2"
        >
          Atualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors min-h-[36px] ${
              filtro === f.id
                ? 'bg-dourado-base text-cream-100'
                : 'bg-white border border-cafeteria-200 text-cafeteria-700 hover:bg-cream-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {migracao064Pendente ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Migration <strong>064</strong> pendente. Rode <code className="text-xs">npm run db:apply-064</code>.
        </div>
      ) : null}

      {erro ? <p className="text-sm text-red-700">{erro}</p> : null}

      {vigentesFiltrados.length === 0 && !secaoAnterioresAberta ? (
        <p className="text-sm text-cafeteria-600">Nenhum treinamento vigente para este filtro.</p>
      ) : (
        <div className="space-y-6">
          {vigentesFiltrados.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-cafeteria-500">Esta semana</h3>
              {renderLista(vigentesFiltrados)}
            </div>
          )}

          <div className="rounded-xl border border-cafeteria-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setSecaoAnterioresAberta((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cream-50 transition-colors min-h-[48px]"
            >
              <div>
                <p className="text-sm font-semibold text-coffee-base">Semanas anteriores</p>
                <p className="text-xs text-cafeteria-600">
                  {anterioresCarregados
                    ? `${anterioresFiltrados.length} treino(s) no histórico`
                    : 'Carrega sob demanda ao abrir'}
                </p>
              </div>
              <svg
                className={`h-4 w-4 text-cafeteria-400 transition-transform ${secaoAnterioresAberta ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {secaoAnterioresAberta ? (
              <div className="border-t border-cafeteria-100 p-4">
                {loadingAnteriores ? (
                  <div className="flex justify-center py-4">
                    <XicaraCarregando size="sm" label="Carregando histórico…" />
                  </div>
                ) : anterioresFiltrados.length === 0 ? (
                  <p className="text-sm text-cafeteria-600">Nenhum treino anterior neste filtro.</p>
                ) : (
                  renderLista(anterioresFiltrados)
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
