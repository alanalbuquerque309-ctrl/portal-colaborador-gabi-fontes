'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

export default function SugestoesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [tipo, setTipo] = useState<'sugestao' | 'reclamacao'>('sugestao');
  const [texto, setTexto] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId) router.push('/login');
    else setSession(s);
  }, [router]);

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
      } else {
        setErro(data.erro || 'Erro ao enviar.');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
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
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
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
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
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
    </main>
  );
}
