'use client';

import { useEffect, useState } from 'react';

type ItemInbox = {
  id: string;
  colaborador_nome: string;
  colaborador_telefone: string | null;
  unidade_nome: string;
  mensagem: string;
  resposta: string | null;
  created_at: string;
  respondido_em: string | null;
  lido_admin_em: string | null;
};

export default function AjudaInboxPage() {
  const [itens, setItens] = useState<ItemInbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [textoResposta, setTextoResposta] = useState<Record<string, string>>({});
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [podeResponder, setPodeResponder] = useState(false);
  const [somentePendentes, setSomentePendentes] = useState(false);

  const carregar = async (somentePendentes = false) => {
    setLoading(true);
    setErro(null);
    setSomentePendentes(somentePendentes);
    try {
      const qs = somentePendentes ? '?somente_pendentes=1' : '';
      const res = await fetch(`/api/admin/ajuda-chat${qs}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível carregar as mensagens.');
        return;
      }
      setItens(Array.isArray(data.itens) ? data.itens : []);
      setPodeResponder(data.pode_responder === true);
    } catch {
      setErro('Erro de conexão ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar(false);
  }, []);

  const responder = async (id: string) => {
    const resposta = String(textoResposta[id] ?? '').trim();
    if (resposta.length < 2) return;
    setEnviandoId(id);
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
      setItens((prev) =>
        prev.map((item) => (item.id === id ? { ...item, resposta, respondido_em: new Date().toISOString() } : item))
      );
      setTextoResposta((prev) => ({ ...prev, [id]: '' }));
    } catch {
      setErro('Erro de conexão ao responder.');
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <main className="max-w-4xl space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold text-cafeteria-900">Inbox de ajuda</h1>
          <p className="text-sm text-cafeteria-600 mt-1">
            Mensagens enviadas pelo botão flutuante de ajuda. O responsável configurado no sistema responde; sócios
            acompanham todas as conversas (somente leitura das respostas enviadas aqui).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void carregar(true)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              somentePendentes
                ? 'bg-dourado-base text-cream-100'
                : 'border border-cafeteria-200 bg-white text-cafeteria-800'
            }`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => void carregar(false)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              !somentePendentes
                ? 'bg-dourado-base text-cream-100'
                : 'border border-cafeteria-200 bg-white text-cafeteria-800'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {erro && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{erro}</p>}

      <div className="space-y-3">
        {loading && <p className="text-sm text-cafeteria-600">Carregando mensagens…</p>}
        {!loading && itens.length === 0 && (
          <p className="rounded-lg border border-cafeteria-200 bg-white px-4 py-6 text-sm text-cafeteria-600">
            {somentePendentes ? 'Nenhuma mensagem pendente.' : 'Nenhuma conversa registrada.'}
          </p>
        )}

        {!loading &&
          itens.map((item) => (
            <section key={item.id} className="rounded-xl border border-cafeteria-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-cafeteria-900">
                  {item.colaborador_nome} · {item.unidade_nome}
                </p>
                <span className="text-xs text-cafeteria-500">
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-cafeteria-500">Remetente: {item.colaborador_nome}</p>
              <p className="text-sm text-cafeteria-800">{item.mensagem}</p>
              {item.colaborador_telefone && (
                <p className="text-xs text-cafeteria-500">Contato: {item.colaborador_telefone}</p>
              )}

              {item.resposta ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Resposta enviada</p>
                  <p className="text-sm text-emerald-900">{item.resposta}</p>
                </div>
              ) : podeResponder ? (
                <div className="space-y-2">
                  <textarea
                    value={textoResposta[item.id] ?? ''}
                    onChange={(e) => setTextoResposta((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full rounded-lg border border-cafeteria-200 px-3 py-2 text-sm text-cafeteria-900"
                    rows={3}
                    placeholder="Escreva a resposta para o colaborador…"
                  />
                  <button
                    type="button"
                    onClick={() => void responder(item.id)}
                    disabled={enviandoId === item.id}
                    className="rounded-lg bg-coffee-base px-3 py-2 text-sm font-medium text-cream-100 hover:bg-coffee-300 disabled:opacity-60"
                  >
                    {enviandoId === item.id ? 'Enviando…' : 'Responder'}
                  </button>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aguardando resposta do atendimento.
                </p>
              )}
            </section>
          ))}
      </div>
    </main>
  );
}
