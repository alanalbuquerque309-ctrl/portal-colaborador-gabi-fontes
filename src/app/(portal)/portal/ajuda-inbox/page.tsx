'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 10000;

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
  respondido_por_nome: string | null;
};

export default function AjudaInboxPage() {
  const [itens, setItens] = useState<ItemInbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [textoResposta, setTextoResposta] = useState<Record<string, string>>({});
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [podeResponder, setPodeResponder] = useState(false);
  const [podeExcluir, setPodeExcluir] = useState(false);
  const [somentePendentes, setSomentePendentes] = useState(false);
  const somentePendentesRef = useRef(false);

  useEffect(() => {
    somentePendentesRef.current = somentePendentes;
  }, [somentePendentes]);

  const carregar = useCallback(async (opts?: { modo?: boolean; silent?: boolean }) => {
    const modo = opts?.modo !== undefined ? opts.modo : somentePendentesRef.current;
    if (opts?.modo !== undefined) {
      somentePendentesRef.current = opts.modo;
      setSomentePendentes(opts.modo);
    }

    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setErro(null);
    }
    try {
      const qs = modo ? '?somente_pendentes=1' : '';
      const res = await fetch(`/api/admin/ajuda-chat${qs}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      const data = await res.json();
      if (!data.ok) {
        if (!silent) {
          setErro(data.erro || 'Não foi possível carregar as mensagens.');
        }
        return;
      }
      setItens(Array.isArray(data.itens) ? data.itens : []);
      setPodeResponder(data.pode_responder === true);
      setPodeExcluir(data.pode_excluir === true);
      if (!silent) setErro(null);
    } catch {
      if (!silent) setErro('Erro de conexão ao carregar mensagens.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar({ modo: false });
    const onVis = () => {
      if (document.visibilityState === 'visible') void carregar({ silent: true });
    };
    const t = window.setInterval(() => void carregar({ silent: true }), POLL_MS);
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [carregar]);

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
      setTextoResposta((prev) => ({ ...prev, [id]: '' }));
      await carregar({ silent: true });
    } catch {
      setErro('Erro de conexão ao responder.');
    } finally {
      setEnviandoId(null);
    }
  };

  const apagar = async (id: string) => {
    if (
      !window.confirm(
        'Apagar esta mensagem do canal de ajuda? O colaborador deixa de ver este registro no histórico do botão de ajuda. Não dá para desfazer.'
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
      await carregar({ silent: true });
    } catch {
      setErro('Erro de conexão ao apagar.');
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <main className="max-w-4xl space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold text-cafeteria-900">Inbox de ajuda</h1>
          <p className="text-sm text-cafeteria-600 mt-1">
            Mensagens do botão de ajuda. O responsável do dia a dia atende primeiro; sócios e admin também podem
            responder aqui quando precisar (o colaborador vê quem respondeu). Sócios e admin podem apagar registros
            (limpeza ou pedido do colaborador).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void carregar({ modo: true })}
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
            onClick={() => void carregar({ modo: false })}
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
                <div className="flex items-center gap-2 shrink-0">
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={() => void apagar(item.id)}
                      disabled={excluindoId === item.id}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {excluindoId === item.id ? 'Apagando…' : 'Apagar'}
                    </button>
                  )}
                  <span className="text-xs text-cafeteria-500">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-cafeteria-500">Remetente: {item.colaborador_nome}</p>
              <p className="text-sm text-cafeteria-800">{item.mensagem}</p>
              {item.colaborador_telefone && (
                <p className="text-xs text-cafeteria-500">Contato: {item.colaborador_telefone}</p>
              )}

              {item.resposta ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-800 mb-1">
                    Resposta enviada
                    {item.respondido_por_nome ? ` · ${item.respondido_por_nome}` : ''}
                  </p>
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
