'use client';

import { useCallback, useEffect, useState } from 'react';

const PING_MS = 120_000;
const POLL_ONLINE_MS = 120_000;

function abaVisivel(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

async function ping(): Promise<void> {
  try {
    await fetch('/api/portal/presenca/ping', { method: 'POST', credentials: 'include', cache: 'no-store' });
  } catch {
    /* noop */
  }
}

/** Mantém o colaborador como “online” enquanto o portal está aberto. */
export function PortalPresenceHeartbeat() {
  useEffect(() => {
    void ping();
    const id = window.setInterval(() => {
      if (abaVisivel()) void ping();
    }, PING_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void ping();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return null;
}

type Item = { id: string; nome: string };

type ApiOnline = {
  ok?: boolean;
  code?: string;
  limite_minutos?: number;
  unidade_nome?: string | null;
  voce_id?: string;
  itens?: Item[];
};

/** Faixa compacta: quem da mesma unidade pingou recentemente. */
export function PortalOnlineStrip() {
  const [texto, setTexto] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<string>('');

  const carregar = useCallback(async () => {
    // O heartbeat global já faz o ping; aqui só lê quem está online.
    try {
      const res = await fetch(`/api/portal/presenca/online?_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await res.json()) as ApiOnline;
      if (!data.ok) {
        setTexto(null);
        setTitulo('');
        return;
      }
      if (data.code === 'presenca_missing_table') {
        setTexto(null);
        setTitulo('');
        return;
      }
      const min = typeof data.limite_minutos === 'number' ? data.limite_minutos : 3;
      const unidade = data.unidade_nome?.trim() || 'sua unidade';
      setTitulo(
        `Estimativa com base no último sinal nos últimos ${min} minutos. Unidade: ${unidade}. Não é precisão em tempo real absoluto.`
      );

      const voce = data.voce_id ?? '';
      const itens = Array.isArray(data.itens) ? data.itens : [];
      const nomes = itens.map((i) => {
        if (voce && i.id === voce) return `${i.nome} (você)`;
        return i.nome;
      });

      if (nomes.length === 0) {
        setTexto('Ninguém com o portal aberto nesta unidade nos últimos minutos.');
        return;
      }
      if (nomes.length === 1) {
        setTexto(`No portal agora: ${nomes[0]}.`);
        return;
      }
      const ultimo = nomes.pop();
      setTexto(`No portal agora: ${nomes.join(', ')} e ${ultimo}.`);
    } catch {
      setTexto(null);
      setTitulo('');
    }
  }, []);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => {
      if (abaVisivel()) void carregar();
    }, POLL_ONLINE_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void carregar();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [carregar]);

  if (!texto) return null;

  return (
    <div
      className="border-b border-cafeteria-200/80 bg-emerald-50/90 text-emerald-950 px-4 py-2 text-sm"
      role="status"
      title={titulo}
    >
      <div className="max-w-6xl mx-auto flex items-start gap-2">
        <span className="inline-flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        <p className="text-emerald-900 leading-snug">{texto}</p>
      </div>
    </div>
  );
}
