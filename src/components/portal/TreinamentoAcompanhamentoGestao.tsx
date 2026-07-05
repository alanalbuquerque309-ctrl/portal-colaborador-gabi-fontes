'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ItemAcompanhamentoTreinamento } from '@/lib/treinamento-acompanhamento';
import type { PessoaAudiencia } from '@/lib/audiencia-comunicacao';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type FiltroPublico = 'todos' | 'colaboradores' | 'lideranca';

function filtrarPorPublico(item: ItemAcompanhamentoTreinamento, filtro: FiltroPublico): boolean {
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
          className={`mt-1.5 max-h-48 overflow-y-auto rounded-lg border divide-y ${
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

function CardTreinamentoGestao({
  item,
  destaqueSemana,
}: {
  item: ItemAcompanhamentoTreinamento;
  destaqueSemana?: boolean;
}) {
  const pct =
    item.total_esperado > 0 ? Math.round((item.assistiram.length / item.total_esperado) * 100) : 0;
  const pendentes = item.nao_assistiram.length + item.visualizou_sem_confirmar.length;
  const tudoOk = pendentes === 0 && item.total_esperado > 0;

  return (
    <details
      className={`rounded-xl border overflow-hidden group ${
        destaqueSemana
          ? tudoOk
            ? 'border-emerald-300 bg-emerald-50/40'
            : 'border-amber-300 bg-amber-50/30'
          : 'border-cafeteria-200 bg-white'
      }`}
      open={destaqueSemana && pendentes > 0}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-cream-50/60 transition-colors [&::-webkit-details-marker]:hidden">
        <div
          className={`shrink-0 flex flex-col items-center justify-center rounded-lg px-2.5 py-2 min-w-[4.5rem] text-center ${
            tudoOk ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          <span className="text-lg font-bold tabular-nums leading-none">{pendentes}</span>
          <span className="text-[10px] font-semibold uppercase mt-0.5">pend.</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-coffee-base leading-snug">{item.titulo}</p>
          <p className="text-xs text-cafeteria-600 mt-0.5">
            {item.publico_label}
            {' · '}
            {item.semana_rotulo}
            {' · '}
            {item.formato === 'texto' ? 'Texto' : 'Vídeo'}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-cream-200 overflow-hidden max-w-xs">
            <div
              className={`h-full rounded-full transition-all ${tudoOk ? 'bg-emerald-500' : 'bg-dourado-base'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-cafeteria-600 mt-1">
            <span className="font-semibold text-emerald-700">{item.assistiram.length} concluíram</span>
            {' · '}
            {item.nao_assistiram.length} não fizeram
            {item.visualizou_sem_confirmar.length > 0
              ? ` · ${item.visualizou_sem_confirmar.length} só visualizaram`
              : ''}
          </p>
        </div>
        <div className="shrink-0 text-right pt-1">
          <p className="text-sm font-semibold tabular-nums text-dourado-base">{pct}%</p>
        </div>
      </summary>
      <div className="border-t border-cafeteria-100 px-4 py-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ListaNomes
          titulo="Não fizeram"
          corTitulo="text-red-800"
          pessoas={item.nao_assistiram}
          vazio="Todos concluíram."
          destaque={item.nao_assistiram.length > 0}
        />
        {item.visualizou_sem_confirmar.length > 0 ? (
          <ListaNomes
            titulo="Visualizou, não confirmou"
            corTitulo="text-sky-700"
            pessoas={item.visualizou_sem_confirmar}
            vazio=""
          />
        ) : null}
        <ListaNomes
          titulo="Concluíram"
          corTitulo="text-emerald-700"
          pessoas={item.assistiram}
          vazio="Ninguém concluiu ainda."
        />
      </div>
    </details>
  );
}

function SecaoTreinos({
  titulo,
  subtitulo,
  itens,
  destaqueSemana,
  colapsavel,
}: {
  titulo: string;
  subtitulo?: string;
  itens: ItemAcompanhamentoTreinamento[];
  destaqueSemana?: boolean;
  colapsavel?: boolean;
}) {
  const [aberta, setAberta] = useState(!colapsavel);
  const pendentesTotal = itens.reduce(
    (acc, i) => acc + i.nao_assistiram.length + i.visualizou_sem_confirmar.length,
    0
  );

  if (itens.length === 0) return null;

  const conteudo = (
    <div className="space-y-3">
      {itens.map((item) => (
        <CardTreinamentoGestao key={item.id} item={item} destaqueSemana={destaqueSemana} />
      ))}
    </div>
  );

  if (!colapsavel) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-coffee-base">{titulo}</h3>
          {subtitulo ? <p className="text-xs text-cafeteria-600 mt-0.5">{subtitulo}</p> : null}
        </div>
        {conteudo}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cafeteria-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cream-50 transition-colors min-h-[48px]"
      >
        <div>
          <p className="text-sm font-semibold text-coffee-base">
            {titulo} ({itens.length})
          </p>
          <p className="text-xs text-cafeteria-600">
            {pendentesTotal > 0 ? `${pendentesTotal} pendência(s) no histórico` : 'Sem pendências no histórico'}
          </p>
        </div>
        <svg
          className={`h-4 w-4 text-cafeteria-400 transition-transform ${aberta ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {aberta ? <div className="border-t border-cafeteria-100 p-4">{conteudo}</div> : null}
    </div>
  );
}

/**
 * Painel para admin, RH e sócios: esta semana vs histórico, com foco em quem não fez.
 */
export function TreinamentoAcompanhamentoGestao() {
  const [visivel, setVisivel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vigentes, setVigentes] = useState<ItemAcompanhamentoTreinamento[]>([]);
  const [anteriores, setAnteriores] = useState<ItemAcompanhamentoTreinamento[]>([]);
  const [cicloQuintaRotulo, setCicloQuintaRotulo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [migracao064Pendente, setMigracao064Pendente] = useState(false);
  const [filtro, setFiltro] = useState<FiltroPublico>('todos');

  const carregar = useCallback(() => {
    setLoading(true);
    fetch('/api/portal/treinamentos/acompanhamento', { credentials: 'include', cache: 'no-store' })
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
        setVigentes(Array.isArray(data.vigentes) ? data.vigentes : data.itens ?? []);
        setAnteriores(Array.isArray(data.anteriores) ? data.anteriores : []);
      })
      .catch(() => {
        setVisivel(false);
        setErro('Falha de conexão ao carregar acompanhamento.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const vigentesFiltrados = useMemo(
    () => vigentes.filter((i) => filtrarPorPublico(i, filtro)),
    [vigentes, filtro]
  );
  const anterioresFiltrados = useMemo(
    () => anteriores.filter((i) => filtrarPorPublico(i, filtro)),
    [anteriores, filtro]
  );

  const pendentesSemana = useMemo(
    () =>
      vigentesFiltrados.reduce(
        (acc, i) => acc + i.nao_assistiram.length + i.visualizou_sem_confirmar.length,
        0
      ),
    [vigentesFiltrados]
  );

  if (!visivel && !loading) return null;

  if (loading) {
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

  return (
    <section className="rounded-2xl border border-dourado-base/30 bg-gradient-to-br from-dourado-50/50 via-white to-cream-50 p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-coffee-base">Acompanhamento da equipe</h2>
          <p className="text-sm text-cafeteria-700 mt-1 leading-relaxed">
            Visível para administração, RH e sócios.
            {cicloQuintaRotulo ? ` Ciclo vigente: ${cicloQuintaRotulo}.` : ''}
            {pendentesSemana > 0 ? (
              <span className="font-semibold text-red-800"> {pendentesSemana} pendência(s) nesta semana.</span>
            ) : (
              <span className="font-semibold text-emerald-700"> Semana em dia.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => carregar()}
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
          Migration <strong>064</strong> ainda não aplicada. Rode <code className="text-xs">npm run db:apply-064</code>.
        </div>
      ) : null}

      {erro ? <p className="text-sm text-red-700">{erro}</p> : null}

      {vigentesFiltrados.length === 0 && anterioresFiltrados.length === 0 ? (
        <p className="text-sm text-cafeteria-600">Nenhum treinamento para este filtro no momento.</p>
      ) : (
        <div className="space-y-6">
          <SecaoTreinos
            titulo="Treinamentos desta semana"
            subtitulo="O que está vigente agora. Expanda cada card para ver quem não fez."
            itens={vigentesFiltrados}
            destaqueSemana
          />
          <SecaoTreinos
            titulo="Semanas anteriores"
            subtitulo="Treinos de ciclos passados. Pendências aqui são treinos que a pessoa não concluiu."
            itens={anterioresFiltrados}
            colapsavel
          />
        </div>
      )}
    </section>
  );
}
