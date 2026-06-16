'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  canExcluirMensagensAjuda,
  canResponderAjudaFinal,
  canVisualizarAjuda,
  normalizePortalRole,
} from '@/lib/roles';
import { getPortalSession } from '@/lib/utils/session';
import { emitAjudaChatAtualizado } from '@/lib/ajuda-chat-events';

const POLL_MS = 8000;
const NOVO_TOPICO_ID = '__novo__';

type MensagemAjuda = {
  id: string;
  mensagem: string;
  resposta: string | null;
  respondido_por_nome: string | null;
  created_at: string;
  respondido_em: string | null;
  colaborador_nome?: string | null;
};

export const NOME_ATENDIMENTO_AJUDA =
  process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_NOME?.trim() || 'Daniel';

type Props = {
  /** Página embutida (sem botão fechar) ou modal do FAB. */
  variant?: 'embedded' | 'modal';
  onClose?: () => void;
  /** Chamado após responder/apagar (atualiza badge do FAB e menu). */
  onChatAtualizado?: () => void;
};

function fmtDataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function rotuloTopico(item: MensagemAjuda, modoGestor: boolean): string {
  const texto = item.mensagem.trim().replace(/\s+/g, ' ');
  const preview = texto.length > 52 ? `${texto.slice(0, 52)}…` : texto;
  if (modoGestor) {
    const nome = item.colaborador_nome?.trim() || 'Colaborador';
    return `${nome}: ${preview}`;
  }
  return preview || 'Mensagem';
}

function notificarAtualizacao(onChatAtualizado?: () => void) {
  onChatAtualizado?.();
  emitAjudaChatAtualizado();
}

export function CanalAjudaPainel({ variant = 'embedded', onClose, onChatAtualizado }: Props) {
  const [modoGestor, setModoGestor] = useState(false);
  const [podeResponder, setPodeResponder] = useState(false);
  const [podeExcluir, setPodeExcluir] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [textoResposta, setTextoResposta] = useState('');
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [itens, setItens] = useState<MensagemAjuda[]>([]);
  const [chatIndisponivel, setChatIndisponivel] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [perfilOk, setPerfilOk] = useState(false);
  const [topicoAtivo, setTopicoAtivo] = useState<string>(NOVO_TOPICO_ID);
  const [filtroGestor, setFiltroGestor] = useState<'pendentes' | 'todas'>('pendentes');

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { id?: string; role?: string | null } }) => {
        if (cancel) return;
        if (!data.ok || !data.colaborador) {
          setModoGestor(false);
          setPodeResponder(false);
          setPodeExcluir(false);
          setPerfilOk(true);
          return;
        }
        const sess = getPortalSession();
        const cid = String(data.colaborador.id ?? sess?.colaboradorId ?? '').trim();
        const role = normalizePortalRole(data.colaborador.role);
        const gestor = canVisualizarAjuda(role, cid || undefined);
        setModoGestor(gestor);
        setPodeResponder(canResponderAjudaFinal(cid || undefined, role));
        setPodeExcluir(canExcluirMensagensAjuda(role));
        setPerfilOk(true);
      })
      .catch(() => {
        if (!cancel) {
          setModoGestor(false);
          setPodeResponder(false);
          setPodeExcluir(false);
          setPerfilOk(true);
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  const carregar = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setErro(null);
      }
      setChatIndisponivel(false);
      try {
        const url = modoGestor
          ? (() => {
              const params = new URLSearchParams();
              if (filtroGestor === 'pendentes') params.set('somente_pendentes', '1');
              params.set('_', String(Date.now()));
              return `/api/admin/ajuda-chat?${params.toString()}`;
            })()
          : '/api/portal/ajuda-chat';
        const res = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        const data = await res.json();
        if (!data.ok) {
          if (data.code === 'ajuda_chat_missing_table') {
            setChatIndisponivel(true);
          }
          if (!silent) setErro(data.erro || 'Não foi possível carregar o chat.');
          return;
        }
        const raw = Array.isArray(data.itens) ? data.itens : [];
        if (modoGestor) {
          if (data.pode_responder === true) setPodeResponder(true);
          if (data.pode_excluir === true) setPodeExcluir(true);
          setItens(
            raw.map((row: Record<string, unknown>) => ({
              id: String(row.id ?? ''),
              mensagem: String(row.mensagem ?? ''),
              resposta: row.resposta != null ? String(row.resposta) : null,
              respondido_por_nome:
                row.respondido_por_nome != null ? String(row.respondido_por_nome) : null,
              created_at: String(row.created_at ?? ''),
              respondido_em: row.respondido_em != null ? String(row.respondido_em) : null,
              colaborador_nome: row.colaborador_nome != null ? String(row.colaborador_nome) : null,
            }))
          );
        } else {
          setItens(raw as MensagemAjuda[]);
        }
      } catch {
        if (!silent) setErro('Erro de conexão ao carregar chat.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [modoGestor, filtroGestor]
  );

  useEffect(() => {
    if (!perfilOk) return;
    void carregar(false);
    const onVis = () => {
      if (document.visibilityState === 'visible') void carregar(true);
    };
    const id = window.setInterval(() => void carregar(true), POLL_MS);
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [perfilOk, carregar]);

  useEffect(() => {
    if (topicoAtivo === NOVO_TOPICO_ID) return;
    if (!itens.some((i) => i.id === topicoAtivo)) {
      const primeiroPendente = itens.find((i) => !i.resposta);
      if (primeiroPendente) setTopicoAtivo(primeiroPendente.id);
      else if (itens.length > 0) setTopicoAtivo(itens[itens.length - 1].id);
      else if (!modoGestor) setTopicoAtivo(NOVO_TOPICO_ID);
      else setTopicoAtivo('');
    }
  }, [itens, topicoAtivo, modoGestor]);

  useEffect(() => {
    setTextoResposta('');
  }, [topicoAtivo]);

  const itemAtivo = useMemo(
    () => itens.find((i) => i.id === topicoAtivo) ?? null,
    [itens, topicoAtivo]
  );

  const apagar = async (id: string) => {
    if (
      !window.confirm(
        'Apagar esta mensagem do canal de ajuda? Não dá para desfazer. O colaborador deixa de ver no histórico.'
      )
    ) {
      return;
    }
    setExcluindoId(id);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/ajuda-chat/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível apagar.');
        return;
      }
      await carregar(true);
      notificarAtualizacao(onChatAtualizado);
    } catch {
      setErro('Erro de conexão ao apagar.');
    } finally {
      setExcluindoId(null);
    }
  };

  const responder = async (id: string) => {
    const resposta = textoResposta.trim();
    if (resposta.length < 2) return;
    setEnviandoResposta(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/ajuda-chat/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível enviar a resposta.');
        return;
      }
      setTextoResposta('');
      await carregar(true);
      notificarAtualizacao(onChatAtualizado);
    } catch {
      setErro('Erro de conexão ao responder.');
    } finally {
      setEnviandoResposta(false);
    }
  };

  const enviar = async () => {
    if (modoGestor || chatIndisponivel) return;
    const mensagem = texto.trim();
    if (mensagem.length < 3) return;
    setErro(null);
    try {
      const res = await fetch('/api/portal/ajuda-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível enviar a mensagem.');
        return;
      }
      setTexto('');
      await carregar(true);
      setTopicoAtivo(NOVO_TOPICO_ID);
      notificarAtualizacao(onChatAtualizado);
    } catch {
      setErro('Erro de conexão ao enviar.');
    }
  };

  const shellClass =
    variant === 'modal'
      ? 'rounded-xl bg-white border border-dourado-200 shadow-xl p-4 max-h-[min(85vh,560px)] flex flex-col'
      : 'rounded-2xl border border-cafeteria-200 bg-white p-4 sm:p-5 flex flex-col';

  const mostrarFormulario = !modoGestor && (topicoAtivo === NOVO_TOPICO_ID || itens.length === 0);

  return (
    <div className={shellClass}>
      <h3 className="font-display font-semibold text-coffee-base mb-2">
        {modoGestor ? 'Inbox ajuda (atalho)' : `Canal direto com ${NOME_ATENDIMENTO_AJUDA}`}
      </h3>
      <p className="text-xs text-coffee-100 mb-3">
        {modoGestor ? (
          <>
            Histórico de todos os pedidos. {podeResponder ? 'Você pode responder aqui' : 'Somente visualização'}.
            {podeExcluir ? ' Sócios/admin podem apagar registros.' : ''}{' '}
            <Link href="/portal/ajuda-inbox" className="text-dourado-base underline font-medium">
              Abrir inbox completo
            </Link>
          </>
        ) : (
          <>
            Envie por aqui. Quem atende no dia a dia é o {NOME_ATENDIMENTO_AJUDA}; sócios e admin também podem
            responder.
          </>
        )}
      </p>

      {modoGestor && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setFiltroGestor('pendentes')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filtroGestor === 'pendentes'
                ? 'bg-dourado-base text-cream-100'
                : 'border border-cream-300 text-coffee-base'
            }`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setFiltroGestor('todas')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filtroGestor === 'todas'
                ? 'bg-dourado-base text-cream-100'
                : 'border border-cream-300 text-coffee-base'
            }`}
          >
            Todas (histórico)
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-[minmax(148px,220px)_1fr] gap-3 flex-1 min-h-0">
        <aside className="rounded-lg border border-cream-300 bg-cream-50 flex flex-col min-h-[200px] md:min-h-0 md:max-h-[min(52vh,420px)]">
          <p className="px-3 py-2 text-xs font-semibold text-coffee-base border-b border-cream-200 shrink-0">
            {modoGestor ? 'Conversas' : 'Histórico de atividades'}
          </p>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading && <p className="text-xs text-coffee-100 px-1">Carregando…</p>}
            {!modoGestor && (
              <button
                type="button"
                onClick={() => setTopicoAtivo(NOVO_TOPICO_ID)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  topicoAtivo === NOVO_TOPICO_ID
                    ? 'bg-dourado-base/15 text-coffee-base font-medium'
                    : 'hover:bg-white text-coffee-base'
                }`}
              >
                + Nova mensagem
              </button>
            )}
            {!loading && itens.length === 0 && modoGestor && (
              <p className="text-xs text-coffee-100 px-1">
                {filtroGestor === 'pendentes' ? 'Nenhuma mensagem pendente.' : 'Nenhuma conversa registrada.'}
              </p>
            )}
            {itens.map((item) => {
              const ativo = topicoAtivo === item.id;
              const pendente = !item.resposta;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTopicoAtivo(item.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                    ativo ? 'bg-dourado-base/15 text-coffee-base' : 'hover:bg-white text-coffee-base'
                  }`}
                >
                  <span className="block font-medium leading-snug break-words">
                    {rotuloTopico(item, modoGestor)}
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-[10px] text-coffee-100">
                    <span>{fmtDataCurta(item.created_at)}</span>
                    {pendente && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-900 font-medium">
                        Aguardando
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-lg border border-cream-300 bg-cream-50/60 flex flex-col min-h-[240px] md:min-h-0 md:max-h-[min(52vh,420px)]">
          {mostrarFormulario ? (
            <div className="p-3 flex flex-col flex-1">
              <p className="text-sm font-medium text-coffee-base mb-2">Nova mensagem para ADM/RH</p>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="flex-1 w-full rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base min-h-[120px]"
                rows={4}
                placeholder="Escreva sua mensagem para ADM/RH..."
                disabled={chatIndisponivel}
              />
              <button
                type="button"
                onClick={() => void enviar()}
                disabled={chatIndisponivel || texto.trim().length < 3}
                className="mt-3 w-full rounded-lg bg-dourado-base px-4 py-3 text-sm font-medium text-cream-100 hover:bg-dourado-400 disabled:opacity-50 min-h-[44px]"
              >
                {chatIndisponivel ? 'Canal em ativação' : 'Enviar mensagem'}
              </button>
            </div>
          ) : itemAtivo ? (
            <div className="p-3 flex flex-col flex-1 overflow-y-auto">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-xs text-coffee-100 font-medium">
                    {modoGestor
                      ? `${itemAtivo.colaborador_nome ?? 'Colaborador'} · ${fmtDataCurta(itemAtivo.created_at)}`
                      : `Você · ${fmtDataCurta(itemAtivo.created_at)}`}
                  </p>
                  <p className="text-sm text-coffee-base mt-2 break-words whitespace-pre-wrap leading-relaxed">
                    {itemAtivo.mensagem}
                  </p>
                </div>
                {modoGestor && podeExcluir && (
                  <button
                    type="button"
                    onClick={() => void apagar(itemAtivo.id)}
                    disabled={excluindoId === itemAtivo.id}
                    className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {excluindoId === itemAtivo.id ? '…' : 'Apagar'}
                  </button>
                )}
              </div>
              {itemAtivo.resposta ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 mt-auto">
                  <p className="text-xs text-emerald-800 font-medium">
                    {itemAtivo.respondido_por_nome
                      ? `${itemAtivo.respondido_por_nome} (atendimento)`
                      : 'Atendimento'}
                    {itemAtivo.respondido_em ? ` · ${fmtDataCurta(itemAtivo.respondido_em)}` : ''}
                  </p>
                  <p className="text-sm text-emerald-900 mt-1 break-words whitespace-pre-wrap">{itemAtivo.resposta}</p>
                </div>
              ) : podeResponder && modoGestor ? (
                <div className="space-y-2 mt-auto">
                  <textarea
                    value={textoResposta}
                    onChange={(e) => setTextoResposta(e.target.value)}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base min-h-[88px]"
                    rows={3}
                    placeholder="Escreva a resposta para o colaborador…"
                  />
                  <button
                    type="button"
                    onClick={() => void responder(itemAtivo.id)}
                    disabled={enviandoResposta || textoResposta.trim().length < 2}
                    className="w-full rounded-lg bg-coffee-base px-4 py-2.5 text-sm font-medium text-cream-100 hover:bg-coffee-300 disabled:opacity-50 min-h-[44px]"
                  >
                    {enviandoResposta ? 'Enviando…' : 'Responder'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-auto">
                  Aguardando resposta do atendimento.
                </p>
              )}
            </div>
          ) : (
            <p className="p-4 text-sm text-coffee-100">Selecione uma conversa à esquerda.</p>
          )}
        </section>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      {variant === 'modal' && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-coffee-100 text-sm hover:underline"
        >
          Fechar
        </button>
      )}
    </div>
  );
}
