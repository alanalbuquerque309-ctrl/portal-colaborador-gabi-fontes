'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
      const res = await fetch('/api/portal/equipe-chat/sala', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
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
      const res = await fetch('/api/portal/equipe-chat/direto/resumo', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.ok && Array.isArray(data.conversas)) {
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
        const res = await fetch(`/api/portal/equipe-chat/direto?com=${encodeURIComponent(contatoId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();
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
      if (aba === 'sala') void carregarSala();
      else if (contatoAtivo) void carregarDireto(contatoAtivo);
      else void carregarResumo();
    };
    const id = window.setInterval(tick, 12000);
    return () => window.clearInterval(id);
  }, [aba, contatoAtivo, indisponivel, carregarSala, carregarDireto, carregarResumo]);

  const enviarSala = async () => {
    const mensagem = textoSala.trim();
    if (mensagem.length < 2) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch('/api/portal/equipe-chat/sala', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível enviar.');
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
      const res = await fetch('/api/portal/equipe-chat/direto', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario_id: contatoAtivo, mensagem }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível enviar.');
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
            {msgsSala.map((m) => (
              <div key={m.id} className="rounded-lg bg-cream-50 border border-cream-200 px-3 py-2">
                <p className="text-xs font-medium text-cafeteria-700">
                  {m.autor_nome} · {new Date(m.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-cafeteria-900 mt-1">{m.mensagem}</p>
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
                    msgsDireto.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          m.minha
                            ? 'ml-auto bg-coffee-base text-cream-100'
                            : 'mr-auto bg-cream-50 border border-cream-200 text-cafeteria-900'
                        }`}
                      >
                        {!m.minha && <p className="text-[10px] font-medium opacity-80 mb-0.5">{m.autor_nome}</p>}
                        <p>{m.mensagem}</p>
                        <p className={`text-[10px] mt-1 ${m.minha ? 'text-cream-100/70' : 'text-cafeteria-500'}`}>
                          {new Date(m.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
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
