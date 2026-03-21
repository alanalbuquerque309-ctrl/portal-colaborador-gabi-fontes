'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface MinhaMsg {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean;
  created_at: string;
  visualizado_em: string | null;
  curtidas: number;
}

interface FeedItem {
  id: string;
  texto: string;
  created_at: string;
  curtidas: number;
  autor: string;
  curtiu: boolean;
}

function mensagemAcolhimento(tipo: string, visualizado: boolean): string | null {
  if (!visualizado) return null;
  if (tipo === 'sugestao') {
    return 'Obrigado pela ideia. Já vimos sua sugestão e estamos em análise.';
  }
  return 'Recebemos sua mensagem e estamos acompanhando.';
}

export default function SugestoesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [tipo, setTipo] = useState<'sugestao' | 'reclamacao'>('sugestao');
  const [texto, setTexto] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [minhas, setMinhas] = useState<MinhaMsg[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [carregandoMural, setCarregandoMural] = useState(true);
  const [curtindo, setCurtindo] = useState<string | null>(null);

  const carregarMural = useCallback(() => {
    setCarregandoMural(true);
    fetch('/api/portal/sugestoes', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          if (Array.isArray(data.minhas)) setMinhas(data.minhas);
          if (Array.isArray(data.feed)) setFeed(data.feed);
        }
      })
      .finally(() => setCarregandoMural(false));
  }, []);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId) router.push('/login');
    else setSession(s);
  }, [router]);

  useEffect(() => {
    if (session?.colaboradorId) carregarMural();
  }, [session, carregarMural]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.colaboradorId) {
      router.push('/login');
      return;
    }

    setErro('');
    if (!texto.trim() || texto.trim().length < 5) {
      setErro('Escreva pelo menos 5 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/portal/sugestoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tipo, texto: texto.trim(), anonimo }),
      });
      const data = await res.json();
      if (data.ok) {
        setEnviado(true);
        setTexto('');
        carregarMural();
      } else {
        setErro(data.erro || 'Erro ao enviar.');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const curtir = async (id: string) => {
    setCurtindo(id);
    try {
      const res = await fetch(`/api/portal/sugestoes/${id}/curtir`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setFeed((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, curtiu: data.curtiu === true, curtidas: data.curtidas ?? f.curtidas }
              : f
          )
        );
      }
    } finally {
      setCurtindo(null);
    }
  };

  if (!session) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6 flex justify-center">
        <XicaraCarregando size="md" label="Carregando…" />
      </div>
    );
  }

  if (!session.colaboradorId) return null;

  return (
    <main>
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-6">
        Caixa de Sugestões e Reclamações
      </h1>

      {enviado ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 mb-8">
          <p className="text-green-800 font-medium">Enviado com sucesso!</p>
          <p className="text-green-700 text-sm mt-1">
            Obrigado pelo seu feedback. Sua {tipo === 'sugestao' ? 'sugestão' : 'reclamação'} foi registrada.
          </p>
          <button
            type="button"
            onClick={() => setEnviado(false)}
            className="mt-4 text-green-700 text-sm font-medium hover:underline"
          >
            Enviar outro
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4 mb-10">
          <div>
            <span className="block text-sm font-medium text-coffee-base mb-2">Tipo</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="sugestao"
                  checked={tipo === 'sugestao'}
                  onChange={() => setTipo('sugestao')}
                  className="text-dourado-base"
                />
                <span className="text-coffee-base">Sugestão</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="reclamacao"
                  checked={tipo === 'reclamacao'}
                  onChange={() => setTipo('reclamacao')}
                  className="text-dourado-base"
                />
                <span className="text-coffee-base">Reclamação</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="texto" className="block text-sm font-medium text-coffee-base mb-1">
              Sua mensagem *
            </label>
            <textarea
              id="texto"
              rows={4}
              required
              minLength={5}
              placeholder={tipo === 'sugestao' ? 'O que você sugeriria para melhorar?' : 'Descreva o que aconteceu...'}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={(e) => setAnonimo(e.target.checked)}
              className="rounded border-cream-300 text-dourado-base"
            />
            <span className="text-sm text-coffee-base">Enviar de forma anônima</span>
          </label>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      )}

      <section className="max-w-xl mb-10">
        <h2 className="text-lg font-semibold text-cafeteria-800 mb-3">Suas mensagens</h2>
        {carregandoMural ? (
          <div className="flex justify-center py-6">
            <XicaraCarregando size="sm" label="Carregando…" />
          </div>
        ) : minhas.length === 0 ? (
          <p className="text-sm text-coffee-100">Nenhum envio ainda.</p>
        ) : (
          <ul className="space-y-3">
            {minhas.map((m) => {
              const visto = !!m.visualizado_em;
              const extra = mensagemAcolhimento(m.tipo, visto);
              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-cream-300 bg-cream-50 p-3 text-sm"
                >
                  <div className="flex justify-between gap-2 text-xs text-coffee-100 mb-1">
                    <span className="uppercase font-medium">{m.tipo === 'sugestao' ? 'Sugestão' : 'Reclamação'}</span>
                    <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-coffee-base whitespace-pre-wrap">{m.texto}</p>
                  {m.tipo === 'sugestao' && (
                    <p className="text-xs text-coffee-100 mt-1">{m.curtidas} curtida{m.curtidas === 1 ? '' : 's'}</p>
                  )}
                  {extra && <p className="text-green-800 text-sm mt-2 font-medium">{extra}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="max-w-xl">
        <h2 className="text-lg font-semibold text-cafeteria-800 mb-3">Sugestões da sua unidade</h2>
        <p className="text-sm text-coffee-100 mb-3">
          Curta as ideias dos colegas. Só aparecem sugestões (não reclamações) da mesma unidade.
        </p>
        {carregandoMural ? (
          <div className="flex justify-center py-6">
            <XicaraCarregando size="sm" label="Carregando…" />
          </div>
        ) : feed.length === 0 ? (
          <p className="text-sm text-coffee-100">Nenhuma sugestão para exibir aqui.</p>
        ) : (
          <ul className="space-y-3">
            {feed.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-dourado-200 bg-cream-50 p-3 flex flex-col gap-2"
              >
                <p className="text-coffee-base text-sm whitespace-pre-wrap">{f.texto}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-coffee-100">
                  <span>— {f.autor}</span>
                  <span>{new Date(f.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => curtir(f.id)}
                    disabled={curtindo === f.id}
                    className={`text-xs rounded-lg px-3 py-1 border ${
                      f.curtiu
                        ? 'border-dourado-base bg-dourado-50 text-dourado-800'
                        : 'border-cream-300 text-coffee-base hover:bg-cream-100'
                    } disabled:opacity-50`}
                  >
                    {curtindo === f.id ? '…' : f.curtiu ? 'Curtiu' : 'Curtir'} · {f.curtidas}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
