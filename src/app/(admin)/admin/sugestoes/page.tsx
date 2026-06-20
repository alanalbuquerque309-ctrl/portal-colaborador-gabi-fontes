'use client';

import { useState, useEffect } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { emitSugestoesAtualizado } from '@/lib/sugestoes-events';
import {
  OPCOES_RESPOSTA_SUGESTAO,
  rotuloRespostaAdmin,
  type GraosRespostaSugestao,
} from '@/lib/sugestao-resposta-graos';

interface Item {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean;
  anonimo_no_portal?: boolean;
  created_at: string;
  visualizado_em: string | null;
  graos_destaque_em: string | null;
  graos_resposta_bonus: number | null;
  curtidas: number;
  autor: string;
  autor_setor?: string | null;
  unidade: string;
}

function rotuloTipo(tipo: string): string {
  if (tipo === 'reclamacao') return 'Reclamação';
  if (tipo === 'elogio') return 'Elogio';
  return 'Sugestão';
}

function classesCard(tipo: string): string {
  if (tipo === 'reclamacao') return 'border-amber-200 bg-amber-50/50';
  if (tipo === 'elogio') return 'border-emerald-200 bg-emerald-50/40';
  return 'border-dourado-200 bg-cream-50';
}

export default function SugestoesPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('');
  const [marcando, setMarcando] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [podeReclamacoes, setPodeReclamacoes] = useState(true);
  const [podeDestacarGraos, setPodeDestacarGraos] = useState(false);
  const [pendentesAnalise, setPendentesAnalise] = useState(0);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [avisoDb, setAvisoDb] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; podeVerReclamacoes?: boolean; podeVerBonificacao?: boolean }) => {
        if (data.ok && data.podeVerReclamacoes === false) {
          setPodeReclamacoes(false);
          setFiltro((f) => (f === 'reclamacao' ? '' : f));
        }
        if (data.ok && data.podeVerBonificacao === true) {
          setPodeDestacarGraos(true);
        }
      })
      .catch(() => {});
  }, []);

  const carregarPendentes = () => {
    if (!podeDestacarGraos) return;
    fetch('/api/admin/sugestoes/pendentes', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; pendentes?: number }) => {
        if (d.ok) setPendentesAnalise(Math.max(0, Number(d.pendentes ?? 0)));
      })
      .catch(() => {});
  };

  const carregar = () => {
    setLoading(true);
    setErroLista(null);
    setAvisoDb(null);
    const params = filtro ? `?tipo=${filtro}` : '';
    fetch(`/api/admin/sugestoes${params}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; itens?: Item[]; erro?: string; aviso?: string; pode_destacar_graos?: boolean }) => {
        if (data.ok && data.itens) {
          setItens(data.itens);
          if (data.aviso) setAvisoDb(String(data.aviso));
        } else {
          setItens([]);
          setErroLista(data.erro || 'Erro ao carregar sugestões.');
        }
        if (data.ok && data.pode_destacar_graos === true) setPodeDestacarGraos(true);
      })
      .catch(() => {
        setItens([]);
        setErroLista('Erro de conexão ao carregar sugestões.');
      })
      .finally(() => setLoading(false));
    carregarPendentes();
  };

  useEffect(() => {
    carregarPendentes();
  }, [podeDestacarGraos]);

  useEffect(() => {
    carregar();
  }, [filtro]);

  const marcarVisto = async (id: string) => {
    setMarcando(id);
    try {
      const res = await fetch(`/api/admin/sugestoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visualizado: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setItens((prev) =>
          prev.map((i) => (i.id === id ? { ...i, visualizado_em: new Date().toISOString() } : i))
        );
        emitSugestoesAtualizado();
        carregarPendentes();
      }
    } finally {
      setMarcando(null);
    }
  };

  const excluirItem = async (id: string, autor: string, tipo: string) => {
    if (
      !window.confirm(
        `Excluir ${rotuloTipo(tipo).toLowerCase()} de «${autor}»?\n\nEsta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    setExcluindo(id);
    try {
      const res = await fetch(`/api/admin/sugestoes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setItens((prev) => prev.filter((i) => i.id !== id));
        emitSugestoesAtualizado();
        carregarPendentes();
      } else {
        alert(data.erro || 'Não foi possível excluir.');
      }
    } finally {
      setExcluindo(null);
    }
  };

  const responderSugestao = async (id: string, graos: GraosRespostaSugestao) => {
    const op = OPCOES_RESPOSTA_SUGESTAO.find((o) => o.graos === graos);
    if (
      !window.confirm(
        `Responder esta sugestão?\n\n«${op?.labelAdmin ?? 'Resposta'}» — bônus +${graos} Grãos (+1 já creditado no envio).`
      )
    ) {
      return;
    }
    setRespondendo(`${id}:${graos}`);
    try {
      const res = await fetch(`/api/admin/sugestoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resposta_graos: graos }),
      });
      const data = await res.json();
      if (data.ok) {
        setItens((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  graos_destaque_em: new Date().toISOString(),
                  graos_resposta_bonus: graos,
                  visualizado_em: i.visualizado_em ?? new Date().toISOString(),
                }
              : i
          )
        );
        emitSugestoesAtualizado();
        carregarPendentes();
      } else {
        alert(data.erro || 'Não foi possível responder.');
      }
    } finally {
      setRespondendo(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-coffee-base">
            {podeReclamacoes ? 'Sugestões, Elogios e Reclamações' : 'Sugestões e Elogios'}
          </h1>
          {!podeReclamacoes && (
            <p className="text-sm text-coffee-100 mt-1 max-w-xl">
              Reclamações ficam visíveis apenas para sócios (evita conflito quando a mensagem envolve a própria
              equipe administrativa).
            </p>
          )}
          {podeDestacarGraos && (
            <p className="text-sm text-coffee-100 mt-1 max-w-xl">
              Sugestões: +1 Grão no envio. Responda com bônus de 0, 3, 5 ou 9 Grãos conforme a qualidade da ideia
              (reprovada = +0 de bônus).
            </p>
          )}
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-lg border border-cream-300 px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">{podeReclamacoes ? 'Todos' : 'Sugestões e elogios'}</option>
          <option value="sugestao">Sugestões</option>
          <option value="elogio">Elogios</option>
          {podeReclamacoes ? <option value="reclamacao">Reclamações</option> : null}
        </select>
      </div>

      {podeDestacarGraos && pendentesAnalise > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>{pendentesAnalise}</strong> sugestão{pendentesAnalise === 1 ? '' : 'ões'} aguardando análise.
          Marque como visto ou responda com a quantidade de Grãos adequada.
        </div>
      )}

      {erroLista && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erroLista}
        </div>
      )}

      {avisoDb && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {avisoDb}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <XicaraCarregando size="md" label="Carregando…" />
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-50 p-8">
          <p className="text-coffee-base">Nenhuma mensagem registrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itens.map((i) => (
            <div
              key={i.id}
              className={`rounded-xl border p-4 ${classesCard(i.tipo)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-coffee-100 uppercase">
                  {rotuloTipo(i.tipo)}
                </span>
                <span className="text-coffee-100 text-xs">
                  {new Date(i.created_at).toLocaleString('pt-BR')}
                  {i.unidade !== '-' && ` · ${i.unidade}`}
                </span>
              </div>
              <p className="text-coffee-base whitespace-pre-wrap">{i.texto}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-cafeteria-200/60">
                <div className="min-w-0">
                  <p className="text-coffee-base text-sm font-semibold">
                    {i.autor}
                    {(i.anonimo_no_portal ?? i.anonimo) && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 align-middle">
                        Anônimo no portal
                      </span>
                    )}
                  </p>
                  {i.autor_setor ? (
                    <p className="text-xs text-cafeteria-600 mt-0.5">{i.autor_setor}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  {i.tipo === 'sugestao' && (
                    <span className="text-xs text-coffee-100 self-end">
                      {i.curtidas} curtida{i.curtidas === 1 ? '' : 's'}
                    </span>
                  )}
                  {i.tipo === 'sugestao' && i.graos_destaque_em ? (
                    <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                      {rotuloRespostaAdmin(i.graos_resposta_bonus ?? 7)}
                    </span>
                  ) : null}
                  {i.tipo === 'sugestao' && podeDestacarGraos && !i.graos_destaque_em ? (
                    <div className="flex flex-wrap justify-end gap-1.5 max-w-md">
                      {OPCOES_RESPOSTA_SUGESTAO.map((op) => {
                        const busy = respondendo === `${i.id}:${op.graos}`;
                        return (
                          <button
                            key={op.graos}
                            type="button"
                            onClick={() => void responderSugestao(i.id, op.graos)}
                            disabled={!!respondendo}
                            className={`text-xs rounded-lg border px-2.5 py-1.5 font-medium min-h-[36px] disabled:opacity-50 ${
                              op.graos === 0
                                ? 'border-cream-400 bg-white text-coffee-base hover:bg-cream-50'
                                :                               op.graos === 9
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                  : 'border-dourado-base bg-dourado-50 text-coffee-base hover:bg-dourado-100'
                            }`}
                          >
                            {busy ? '…' : `${op.labelAdmin} (+${op.graos})`}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {i.tipo !== 'sugestao' || !podeDestacarGraos ? (
                    !i.visualizado_em ? (
                      <button
                        type="button"
                        onClick={() => marcarVisto(i.id)}
                        disabled={marcando === i.id}
                        className="text-xs rounded-lg border border-dourado-base px-3 py-1 text-dourado-base hover:bg-dourado-50 disabled:opacity-50"
                      >
                        {marcando === i.id ? '…' : 'Marcar como visto'}
                      </button>
                    ) : (
                      <span className="text-xs text-green-700">
                        Visto em {new Date(i.visualizado_em).toLocaleString('pt-BR')}
                      </span>
                    )
                  ) : i.graos_destaque_em ? (
                    <span className="text-xs text-green-700">
                      Respondido em {new Date(i.graos_destaque_em).toLocaleString('pt-BR')}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void excluirItem(i.id, i.autor, i.tipo)}
                    disabled={!!excluindo}
                    className="text-xs rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-red-800 hover:bg-red-100 disabled:opacity-50 min-h-[36px]"
                  >
                    {excluindo === i.id ? 'Excluindo…' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
