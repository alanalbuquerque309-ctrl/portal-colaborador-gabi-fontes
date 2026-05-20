'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  canExcluirMensagensAjuda,
  canVisualizarAjuda,
  normalizePortalRole,
} from '@/lib/roles';
import { getPortalSession } from '@/lib/utils/session';

const POLL_MS = 8000;

type MensagemAjuda = {
  id: string;
  mensagem: string;
  resposta: string | null;
  respondido_por_nome: string | null;
  created_at: string;
  respondido_em: string | null;
  /** Só modo gestor (lista admin): quem enviou */
  colaborador_nome?: string | null;
};

const NOME_ATENDIMENTO = process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_NOME?.trim() || 'Daniel';

export function BotaoAjuda() {
  /**
   * FAB oculto só para quem vê Inbox mas não pode exclusão (ex.: responsável dedicado, RH).
   * Sócio/admin mantêm o atalho com lista + apagar.
   */
  const [mostrarFabAjuda, setMostrarFabAjuda] = useState<boolean | null>(null);
  const [modoGestorAjuda, setModoGestorAjuda] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState<MensagemAjuda[]>([]);
  const [chatIndisponivel, setChatIndisponivel] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { role?: string | null } }) => {
        if (cancel) return;
        if (!data.ok || !data.colaborador) {
          setModoGestorAjuda(false);
          setMostrarFabAjuda(true);
          return;
        }
        const sess = getPortalSession();
        const cidRaw = sess?.colaboradorId?.trim() ?? '';
        const cid = cidRaw && cidRaw !== 'pending' ? cidRaw : '';
        const role = normalizePortalRole(data.colaborador.role);
        const podeInbox = canVisualizarAjuda(role, cid || undefined);
        const podeExcluir = canExcluirMensagensAjuda(role);
        setModoGestorAjuda(podeExcluir);
        setMostrarFabAjuda(!podeInbox || podeExcluir);
      })
      .catch(() => {
        if (!cancel) {
          setModoGestorAjuda(false);
          setMostrarFabAjuda(true);
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
        const url = modoGestorAjuda
          ? `/api/admin/ajuda-chat?_=${Date.now()}`
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
        if (modoGestorAjuda) {
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
    [modoGestorAjuda]
  );

  useEffect(() => {
    if (!aberto) return;
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
  }, [aberto, carregar]);

  const apagar = async (id: string) => {
    if (
      !window.confirm(
        'Apagar esta mensagem do canal de ajuda? Não dá para desfazer. O colaborador deixa de ver no histórico do botão.'
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
    } catch {
      setErro('Erro de conexão ao apagar.');
    } finally {
      setExcluindoId(null);
    }
  };

  const enviar = async () => {
    if (modoGestorAjuda || chatIndisponivel) return;
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
      await carregar();
    } catch {
      setErro('Erro de conexão ao enviar.');
    }
  };

  if (mostrarFabAjuda !== true) return null;

  const tituloFab = modoGestorAjuda ? 'Atalho canal de ajuda' : 'Preciso de ajuda';

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-dourado-base text-cream-100 shadow-lg hover:bg-dourado-400 transition-colors flex items-center justify-center"
        aria-label={tituloFab}
        title={tituloFab}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div className="fixed bottom-36 right-4 left-4 md:bottom-24 md:left-auto md:right-6 md:w-[380px] z-50 rounded-xl bg-white border border-dourado-200 shadow-xl p-4 max-h-[min(85vh,520px)] flex flex-col">
            <h3 className="font-display font-semibold text-coffee-base mb-2">
              {modoGestorAjuda ? 'Canal de ajuda (atalho)' : `Canal direto com ${NOME_ATENDIMENTO}`}
            </h3>
            <p className="text-xs text-coffee-100 mb-3">
              {modoGestorAjuda ? (
                <>
                  Últimos pedidos de todos os colaboradores. Use <strong>Apagar</strong> para remover um registro.
                  Para responder, abra a{' '}
                  <Link href="/portal/ajuda-inbox" className="text-dourado-base underline font-medium">
                    Inbox ajuda
                  </Link>
                  .
                </>
              ) : (
                <>
                  Envie por aqui. Quem atende no dia a dia é o {NOME_ATENDIMENTO}; sócios e admin também podem responder
                  no Inbox ajuda.
                </>
              )}
            </p>
            <div className="rounded-lg border border-cream-300 bg-cream-50 p-2 min-h-[160px] max-h-[280px] overflow-y-auto space-y-2 shrink">
              {loading && <p className="text-xs text-coffee-100">Carregando conversa…</p>}
              {!loading && itens.length === 0 && (
                <p className="text-xs text-coffee-100">
                  {modoGestorAjuda ? 'Nenhuma mensagem registrada.' : 'Sem mensagens ainda. Escreva abaixo para iniciar.'}
                </p>
              )}
              {!loading &&
                itens.map((item) => (
                  <div key={item.id} className="space-y-1 rounded-md border border-cream-200/80 bg-white/90 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-coffee-100 font-medium mb-0.5">
                          {modoGestorAjuda
                            ? `${item.colaborador_nome ?? 'Colaborador'} · mensagem`
                            : 'Você'}
                        </p>
                        <p className="text-xs text-coffee-base break-words">{item.mensagem}</p>
                      </div>
                      {modoGestorAjuda && (
                        <button
                          type="button"
                          onClick={() => void apagar(item.id)}
                          disabled={excluindoId === item.id}
                          className="shrink-0 rounded border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {excluindoId === item.id ? '…' : 'Apagar'}
                        </button>
                      )}
                    </div>
                    {item.resposta && (
                      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1">
                        <p className="text-[11px] text-emerald-800 font-medium">
                          {item.respondido_por_nome ? `${item.respondido_por_nome} (atendimento)` : 'Atendimento'}
                        </p>
                        <p className="text-xs text-emerald-900">{item.resposta}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            {!modoGestorAjuda && (
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="mt-3 w-full rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base shrink-0"
                rows={3}
                placeholder="Escreva sua mensagem..."
                disabled={chatIndisponivel}
              />
            )}
            {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
            {!modoGestorAjuda && (
              <button
                type="button"
                onClick={() => void enviar()}
                disabled={chatIndisponivel}
                className="mt-2 w-full rounded-lg bg-dourado-base px-4 py-2 text-sm font-medium text-cream-100 hover:bg-dourado-400 shrink-0"
              >
                {chatIndisponivel ? 'Canal em ativação' : 'Enviar mensagem'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-3 w-full text-coffee-100 text-sm hover:underline"
            >
              Fechar
            </button>
          </div>
        </>
      )}
    </>
  );
}
