'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalBalaoCard } from '@/components/portal/vivo/PortalBalaoCard';
import { PortalDecoracaoRamosPagina } from '@/components/portal/vivo/PortalBalaoCard';
import { IlustracaoMegafone } from '@/components/portal/vivo/PortalIlustracao';
import { emitSugestoesAtualizado } from '@/lib/sugestoes-events';

interface MinhaMsg {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean;
  created_at: string;
  visualizado_em: string | null;
  graos_destaque_em: string | null;
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

interface ReclamacaoFeedItem {
  id: string;
  texto: string;
  created_at: string;
  autor: string;
}

function mensagemAcolhimento(tipo: string, visualizado: boolean, destaqueGraos: boolean): string | null {
  if (destaqueGraos) {
    return 'Gostamos da sua sugestão — vamos analisar com carinho.';
  }
  if (!visualizado) return null;
  if (tipo === 'sugestao') {
    return 'Obrigado pela ideia. Já vimos sua sugestão e estamos em análise.';
  }
  return 'Recebemos sua mensagem e estamos acompanhando.';
}

export default function SugestoesPage() {
  const router = useRouter();
  const [modoReclamacaoUrl, setModoReclamacaoUrl] = useState(false);

  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [podeReclamacao, setPodeReclamacao] = useState(false);
  const [tipo, setTipo] = useState<'sugestao' | 'reclamacao'>('sugestao');
  const [texto, setTexto] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [minhas, setMinhas] = useState<MinhaMsg[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedReclamacoes, setFeedReclamacoes] = useState<ReclamacaoFeedItem[]>([]);
  const [carregandoMural, setCarregandoMural] = useState(true);
  const [curtindo, setCurtindo] = useState<string | null>(null);

  const carregarMural = () => {
    setCarregandoMural(true);
    fetch('/api/portal/sugestoes', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          if (Array.isArray(data.minhas)) setMinhas(data.minhas);
          if (Array.isArray(data.feed)) setFeed(data.feed);
          if (Array.isArray(data.feed_reclamacoes)) setFeedReclamacoes(data.feed_reclamacoes);
          else setFeedReclamacoes([]);
          const gestao = data.pode_enviar_reclamacao === true;
          setPodeReclamacao(gestao);
          if (!gestao) setTipo('sugestao');
          else if (modoReclamacaoUrl) setTipo('reclamacao');
        }
      })
      .finally(() => setCarregandoMural(false));
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setModoReclamacaoUrl(new URLSearchParams(window.location.search).get('tipo') === 'reclamacao');
    }
  }, []);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId) router.push('/login');
    else setSession(s);
  }, [router]);

  useEffect(() => {
    if (session?.colaboradorId) carregarMural();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, modoReclamacaoUrl]);

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
        emitSugestoesAtualizado();
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

  const tituloPagina =
    podeReclamacao && tipo === 'reclamacao' ? 'Registrar reclamação' : 'Sugestões da Equipe';

  return (
    <main className="relative">
      <PortalDecoracaoRamosPagina />

      <div className="relative z-[1] space-y-8">
        <PortalBalaoCard tom="verde" ramoCanto="ambos" className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-display font-semibold text-cafeteria-800">{tituloPagina}</h1>
              <p className="text-sm text-cafeteria-600 mt-1 leading-relaxed">
                {podeReclamacao && tipo === 'reclamacao'
                  ? 'Canal confidencial para sócios e administração.'
                  : 'Compartilhe ideias para melhorar a operação. Pode ser anônimo.'}
              </p>
            </div>
            <IlustracaoMegafone className="w-24 h-20 shrink-0 opacity-95" />
          </div>
        </PortalBalaoCard>

        {enviado ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <p className="text-green-800 font-medium">Enviado com sucesso!</p>
            <p className="text-green-700 text-sm mt-1">
              Obrigado pelo seu feedback. Sua {tipo === 'sugestao' ? 'sugestão' : 'reclamação'} foi registrada.
            </p>
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="mt-4 text-green-700 text-sm font-medium hover:underline min-h-[44px]"
            >
              Enviar outro
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
            {podeReclamacao && (
              <div>
                <span className="block text-sm font-medium text-coffee-base mb-2">Tipo</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
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
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      name="tipo"
                      value="reclamacao"
                      checked={tipo === 'reclamacao'}
                      onChange={() => setTipo('reclamacao')}
                      className="text-dourado-base"
                    />
                    <span className="text-coffee-base">Reclamação (gestão)</span>
                  </label>
                </div>
              </div>
            )}

            {tipo === 'sugestao' && (
              <p className="text-sm text-coffee-100">
                Envio vale 3 Grãos na semana. Se a gestão destacar a ideia («gostamos, vamos analisar»), mais 7 Grãos.
              </p>
            )}

            <div>
              <label htmlFor="texto" className="block text-sm font-medium text-coffee-base mb-1">
                Sua mensagem *
              </label>
              <textarea
                id="texto"
                rows={4}
                required
                minLength={5}
                placeholder={
                  tipo === 'sugestao'
                    ? 'O que você sugeriria para melhorar?'
                    : 'Descreva o que aconteceu...'
                }
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
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
              className="rounded-lg bg-dourado-base px-4 py-2.5 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50 min-h-[44px]"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        )}

        <section className="max-w-xl">
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
                const destaque = !!m.graos_destaque_em;
                const extra = mensagemAcolhimento(m.tipo, visto, destaque);
                return (
                  <li
                    key={m.id}
                    className="rounded-lg border border-cream-300 bg-cream-50 p-3 text-sm"
                  >
                    <div className="flex justify-between gap-2 text-xs text-coffee-100 mb-1">
                      <span className="uppercase font-medium">
                        {m.tipo === 'sugestao' ? 'Sugestão' : 'Reclamação'}
                      </span>
                      <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-coffee-base whitespace-pre-wrap break-words">{m.texto}</p>
                    {m.tipo === 'sugestao' && (
                      <p className="text-xs text-coffee-100 mt-1">
                        {m.curtidas} curtida{m.curtidas === 1 ? '' : 's'}
                      </p>
                    )}
                    {extra && <p className="text-green-800 text-sm mt-2 font-medium">{extra}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {podeReclamacao && feedReclamacoes.length > 0 && (
          <section className="max-w-xl">
            <h2 className="text-lg font-semibold text-cafeteria-800 mb-3">Reclamações da unidade</h2>
            <p className="text-sm text-coffee-100 mb-3">
              Visível apenas para sócios e administração. Tratamento interno e confidencial.
            </p>
            <ul className="space-y-3">
              {feedReclamacoes.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm"
                >
                  <p className="text-coffee-base whitespace-pre-wrap break-words">{r.texto}</p>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-coffee-100 mt-2">
                    <span>— {r.autor}</span>
                    <span>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PortalBalaoCard tom="creme" ramoCanto="direita" className="max-w-xl p-5">
          <h2 className="text-lg font-semibold text-cafeteria-800 mb-2">Feed da unidade</h2>
          <p className="text-sm text-coffee-100 mb-3">
            Curta as ideias dos colegas. Só sugestões da mesma unidade aparecem aqui.
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
                  className="rounded-lg border border-dourado-200 bg-white/90 p-3 flex flex-col gap-2"
                >
                  <p className="text-coffee-base text-sm whitespace-pre-wrap break-words">{f.texto}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-coffee-100">
                    <span>— {f.autor}</span>
                    <span>{new Date(f.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => curtir(f.id)}
                      disabled={curtindo === f.id}
                      className={`text-xs rounded-lg px-3 py-1.5 border min-h-[36px] ${
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
        </PortalBalaoCard>

        <p className="text-sm text-cafeteria-600">
          <Link href="/portal/comunicacao" className="text-dourado-base font-medium hover:underline">
            ← Voltar à Comunicação
          </Link>
        </p>
      </div>
    </main>
  );
}
