'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchJson } from '@/lib/fetch-json';

function fmtData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR');
}

type MsgSala = {
  id: string;
  autor_id: string;
  autor_nome: string;
  mensagem: string;
  created_at: string;
};

type MsgDireto = {
  id: string;
  autor_id: string;
  autor_nome: string;
  mensagem: string;
  created_at: string;
  minha: boolean;
};

type ConversaResumo = {
  id: string;
  nome: string;
  role: string;
  ultima_mensagem: string | null;
  ultima_em: string | null;
  nao_lidas: number;
};

type Aba = 'sala' | 'direto';

type ApiBase = { ok?: boolean; erro?: string; code?: string };
type ApiSala = ApiBase & { itens?: MsgSala[] };
type ApiDireto = ApiBase & { itens?: MsgDireto[] };

/** Mensagens seguidas da mesma pessoa viram um único bloco (estilo WhatsApp). */
function agruparDireto(msgs: MsgDireto[]): MsgDireto[][] {
  const grupos: MsgDireto[][] = [];
  for (const m of msgs) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.length && ultimo[0].minha === m.minha) ultimo.push(m);
    else grupos.push([m]);
  }
  return grupos;
}

function agruparSala(msgs: MsgSala[]): MsgSala[][] {
  const grupos: MsgSala[][] = [];
  for (const m of msgs) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.length && ultimo[0].autor_id === m.autor_id) ultimo.push(m);
    else grupos.push([m]);
  }
  return grupos;
}

function EquipeChatInner() {
  const searchParams = useSearchParams();
  const comInicial = searchParams.get('com');

  const [aba, setAba] = useState<Aba>(comInicial ? 'direto' : 'sala');
  const [erro, setErro] = useState<string | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  const [msgsSala, setMsgsSala] = useState<MsgSala[]>([]);
  const [textoSala, setTextoSala] = useState('');
  const [loadingSala, setLoadingSala] = useState(true);

  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [contatoAtivo, setContatoAtivo] = useState<string | null>(comInicial);
  const [msgsDireto, setMsgsDireto] = useState<MsgDireto[]>([]);
  const [textoDireto, setTextoDireto] = useState('');
  const [loadingDireto, setLoadingDireto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const fimSalaRef = useRef<HTMLDivElement>(null);
  const fimDiretoRef = useRef<HTMLDivElement>(null);

  const carregarSala = useCallback(async () => {
    setLoadingSala(true);
    setErro(null);
    try {
      const { data } = await fetchJson<ApiSala>('/api/portal/equipe-chat/sala', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!data) {
        setErro('Resposta inválida do servidor.');
        return;
      }
      if (data.code === 'equipe_chat_missing_table') {
        setIndisponivel(true);
        return;
      }
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível carregar a sala.');
        return;
      }
      setMsgsSala(Array.isArray(data.itens) ? data.itens : []);
    } catch {
      setErro('Erro de conexão na sala da equipe.');
    } finally {
      setLoadingSala(false);
    }
  }, []);

  const carregarResumo = useCallback(async () => {
    try {
      const { data } = await fetchJson<{ ok?: boolean; conversas?: ConversaResumo[] }>(
        '/api/portal/equipe-chat/direto/resumo',
        { credentials: 'include', cache: 'no-store' }
      );
      if (data?.ok && Array.isArray(data.conversas)) {
        setConversas(data.conversas);
      }
    } catch {
      /* silencioso */
    }
  }, []);

  const carregarDireto = useCallback(
    async (contatoId: string) => {
      setLoadingDireto(true);
      setErro(null);
      try {
        const { data } = await fetchJson<ApiDireto>(
          `/api/portal/equipe-chat/direto?com=${encodeURIComponent(contatoId)}`,
          { credentials: 'include', cache: 'no-store' }
        );
        if (!data) {
          setErro('Resposta inválida do servidor.');
          return;
        }
        if (data.code === 'equipe_chat_missing_table') {
          setIndisponivel(true);
          return;
        }
        if (!data.ok) {
          setErro(data.erro || 'Não foi possível carregar a conversa.');
          return;
        }
        setMsgsDireto(Array.isArray(data.itens) ? data.itens : []);
        void carregarResumo();
      } catch {
        setErro('Erro de conexão no chat direto.');
      } finally {
        setLoadingDireto(false);
      }
    },
    [carregarResumo]
  );

  useEffect(() => {
    void carregarSala();
    void carregarResumo();
  }, [carregarSala, carregarResumo]);

  useEffect(() => {
    if (comInicial) {
      setAba('direto');
      setContatoAtivo(comInicial);
    }
  }, [comInicial]);

  useEffect(() => {
    if (aba === 'direto' && contatoAtivo) {
      void carregarDireto(contatoAtivo);
    }
  }, [aba, contatoAtivo, carregarDireto]);

  useEffect(() => {
    fimSalaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgsSala]);

  useEffect(() => {
    fimDiretoRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgsDireto]);

  useEffect(() => {
    if (indisponivel) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (aba === 'sala') void carregarSala();
      else if (contatoAtivo) void carregarDireto(contatoAtivo);
      else void carregarResumo();
    };
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [aba, contatoAtivo, indisponivel, carregarSala, carregarDireto, carregarResumo]);

  const enviarSala = async () => {
    const mensagem = textoSala.trim();
    if (mensagem.length < 2) return;
    setEnviando(true);
    setErro(null);
    try {
      const { data } = await fetchJson<{ ok?: boolean; erro?: string }>('/api/portal/equipe-chat/sala', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem }),
      });
      if (!data?.ok) {
        setErro(data?.erro || 'Não foi possível enviar.');
        return;
      }
      setTextoSala('');
      await carregarSala();
    } catch {
      setErro('Erro de conexão ao enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const enviarDireto = async () => {
    if (!contatoAtivo) return;
    const mensagem = textoDireto.trim();
    if (mensagem.length < 2) return;
    setEnviando(true);
    setErro(null);
    try {
      const { data } = await fetchJson<{ ok?: boolean; erro?: string }>('/api/portal/equipe-chat/direto', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario_id: contatoAtivo, mensagem }),
      });
      if (!data?.ok) {
        setErro(data?.erro || 'Não foi possível enviar.');
        return;
      }
      setTextoDireto('');
      await carregarDireto(contatoAtivo);
    } catch {
      setErro('Erro de conexão ao enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const contatoNome = conversas.find((c) => c.id === contatoAtivo)?.nome ?? 'Conversa';

  return (
    <main className="max-w-4xl space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-display font-semibold text-cafeteria-900">Chat da equipe</h1>
        <p className="text-sm text-cafeteria-600 mt-1">
          Sala geral para sócios e atendimento, ou mensagens diretas 1:1 entre vocês.
        </p>
      </div>

      <div className="flex gap-2 border-b border-cafeteria-200 pb-2">
        <button
          type="button"
          onClick={() => setAba('sala')}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            aba === 'sala' ? 'bg-dourado-base text-cream-100' : 'text-cafeteria-700 hover:bg-cream-100'
          }`}
        >
          Sala da equipe
        </button>
        <button
          type="button"
          onClick={() => {
            setAba('direto');
            void carregarResumo();
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            aba === 'direto' ? 'bg-dourado-base text-cream-100' : 'text-cafeteria-700 hover:bg-cream-100'
          }`}
        >
          Mensagens diretas
        </button>
      </div>

      {indisponivel && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Chat da equipe ainda não está ativo na base. Aplique a migração{' '}
          <code className="text-xs">030_equipe_chat.sql</code> no Supabase.
        </p>
      )}

      {erro && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{erro}</p>}

      {aba === 'sala' && (
        <section className="rounded-xl border border-cafeteria-200 bg-white flex flex-col min-h-[420px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
            {loadingSala && <p className="text-sm text-cafeteria-500">Carregando…</p>}
            {!loadingSala && msgsSala.length === 0 && (
              <p className="text-sm text-cafeteria-500">Nenhuma mensagem na sala ainda.</p>
            )}
            {agruparSala(msgsSala).map((grupo) => (
              <div
                key={grupo[0].id}
                className="rounded-xl bg-cream-50 border border-cream-200 px-3 py-2 space-y-2"
              >
                <p className="text-xs font-semibold text-cafeteria-700">
                  {grupo[0].autor_nome}
                  {grupo[grupo.length - 1].created_at
                    ? ` · ${fmtData(grupo[grupo.length - 1].created_at)}`
                    : ''}
                </p>
                <div className="flex flex-col gap-2 border-t border-cream-200/80 pt-2">
                  {grupo.map((m) => (
                    <p key={m.id} className="text-sm text-cafeteria-900 leading-snug whitespace-pre-wrap">
                      {m.mensagem}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            <div ref={fimSalaRef} />
          </div>
          <div className="border-t border-cafeteria-200 p-3 flex gap-2">
            <textarea
              value={textoSala}
              onChange={(e) => setTextoSala(e.target.value)}
              rows={2}
              disabled={indisponivel || enviando}
              placeholder="Mensagem para toda a equipe…"
              className="flex-1 rounded-lg border border-cafeteria-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void enviarSala()}
              disabled={indisponivel || enviando}
              className="self-end rounded-lg bg-coffee-base px-4 py-2 text-sm font-medium text-cream-100 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </section>
      )}

      {aba === 'direto' && (
        <div className="grid md:grid-cols-[220px_1fr] gap-3 min-h-[420px]">
          <aside className="rounded-xl border border-cafeteria-200 bg-white p-2 space-y-1 max-h-[60vh] overflow-y-auto">
            {conversas.length === 0 && <p className="text-xs text-cafeteria-500 p-2">Sem contatos.</p>}
            {conversas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setContatoAtivo(c.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  contatoAtivo === c.id ? 'bg-dourado-base/15 text-cafeteria-900' : 'hover:bg-cream-50 text-cafeteria-800'
                }`}
              >
                <span className="font-medium block truncate">{c.nome}</span>
                {c.ultima_mensagem && (
                  <span className="text-xs text-cafeteria-500 block truncate">{c.ultima_mensagem}</span>
                )}
                {c.nao_lidas > 0 && (
                  <span className="inline-block mt-1 text-[10px] font-semibold bg-dourado-base text-cream-100 rounded-full px-2 py-0.5">
                    {c.nao_lidas}
                  </span>
                )}
              </button>
            ))}
          </aside>

          <section className="rounded-xl border border-cafeteria-200 bg-white flex flex-col min-h-[420px]">
            {!contatoAtivo ? (
              <p className="p-6 text-sm text-cafeteria-500">Escolha alguém para conversar.</p>
            ) : (
              <>
                <p className="px-4 py-2 border-b border-cafeteria-100 text-sm font-semibold text-cafeteria-900">
                  {contatoNome}
                </p>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[45vh]">
                  {loadingDireto && <p className="text-sm text-cafeteria-500">Carregando…</p>}
                  {!loadingDireto &&
                    agruparDireto(msgsDireto).map((grupo) => {
                      const minha = grupo[0].minha;
                      const ultima = grupo[grupo.length - 1];
                      return (
                        <div
                          key={grupo[0].id}
                          className={`flex flex-col gap-1 max-w-[88%] ${minha ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                        >
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                              minha
                                ? 'bg-coffee-base text-cream-100 rounded-br-md'
                                : 'bg-cream-50 border border-cream-200 text-cafeteria-900 rounded-bl-md'
                            }`}
                          >
                            {!minha && (
                              <p className="text-[10px] font-semibold text-cafeteria-700 mb-1.5">{grupo[0].autor_nome}</p>
                            )}
                            <div className="flex flex-col gap-2">
                              {grupo.map((m, idx) => (
                                <p
                                  key={m.id}
                                  className={`leading-snug whitespace-pre-wrap ${
                                    idx > 0
                                      ? `pt-2 border-t ${minha ? 'border-white/20' : 'border-cafeteria-200/90'}`
                                      : ''
                                  }`}
                                >
                                  {m.mensagem}
                                </p>
                              ))}
                            </div>
                            <p
                              className={`text-[10px] mt-2 ${minha ? 'text-cream-100/75' : 'text-cafeteria-500'}`}
                            >
                              {fmtData(ultima.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  <div ref={fimDiretoRef} />
                </div>
                <div className="border-t border-cafeteria-200 p-3 flex gap-2">
                  <textarea
                    value={textoDireto}
                    onChange={(e) => setTextoDireto(e.target.value)}
                    rows={2}
                    disabled={indisponivel || enviando}
                    placeholder="Mensagem privada…"
                    className="flex-1 rounded-lg border border-cafeteria-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void enviarDireto()}
                    disabled={indisponivel || enviando}
                    className="self-end rounded-lg bg-coffee-base px-4 py-2 text-sm font-medium text-cream-100 disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default function EquipeChatPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-cafeteria-600">Carregando chat…</main>}>
      <EquipeChatInner />
    </Suspense>
  );
}
