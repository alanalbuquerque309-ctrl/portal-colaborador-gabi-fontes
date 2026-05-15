'use client';

import { useEffect, useState } from 'react';

type MensagemAjuda = {
  id: string;
  mensagem: string;
  resposta: string | null;
  respondido_por_nome: string | null;
  created_at: string;
  respondido_em: string | null;
};

const NOME_ATENDIMENTO = process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_NOME?.trim() || 'Daniel';

export function BotaoAjuda() {
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState<MensagemAjuda[]>([]);
  const [chatIndisponivel, setChatIndisponivel] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    setChatIndisponivel(false);
    try {
      const res = await fetch('/api/portal/ajuda-chat', { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        if (data.code === 'ajuda_chat_missing_table') {
          setChatIndisponivel(true);
        }
        setErro(data.erro || 'Não foi possível carregar o chat.');
        return;
      }
      setItens(Array.isArray(data.itens) ? data.itens : []);
    } catch {
      setErro('Erro de conexão ao carregar chat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!aberto) return;
    void carregar();
  }, [aberto]);

  const enviar = async () => {
    if (chatIndisponivel) return;
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

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-dourado-base text-cream-100 shadow-lg hover:bg-dourado-400 transition-colors flex items-center justify-center"
        aria-label="Preciso de ajuda"
        title="Preciso de ajuda"
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
          <div className="fixed bottom-36 right-4 left-4 md:bottom-24 md:left-auto md:right-6 md:w-[360px] z-50 rounded-xl bg-white border border-dourado-200 shadow-xl p-4">
            <h3 className="font-display font-semibold text-coffee-base mb-2">
              Canal direto com {NOME_ATENDIMENTO}
            </h3>
            <p className="text-xs text-coffee-100 mb-3">
              Envie por aqui. Quem atende no dia a dia é o {NOME_ATENDIMENTO}; sócios e admin também podem responder no
              Inbox ajuda.
            </p>
            <div className="rounded-lg border border-cream-300 bg-cream-50 p-2 h-48 overflow-y-auto space-y-2">
              {loading && <p className="text-xs text-coffee-100">Carregando conversa…</p>}
              {!loading && itens.length === 0 && (
                <p className="text-xs text-coffee-100">Sem mensagens ainda. Escreva abaixo para iniciar.</p>
              )}
              {!loading &&
                itens.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="rounded-md bg-white border border-cream-300 px-2 py-1">
                      <p className="text-[11px] text-coffee-100 font-medium mb-0.5">Você</p>
                      <p className="text-xs text-coffee-base">{item.mensagem}</p>
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
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="mt-3 w-full rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base"
              rows={3}
              placeholder="Escreva sua mensagem..."
              disabled={chatIndisponivel}
            />
            {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={chatIndisponivel}
              className="mt-2 w-full rounded-lg bg-dourado-base px-4 py-2 text-sm font-medium text-cream-100 hover:bg-dourado-400"
            >
              {chatIndisponivel ? 'Canal em ativação' : 'Enviar mensagem'}
            </button>
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
