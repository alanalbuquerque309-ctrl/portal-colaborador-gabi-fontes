'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  canExcluirMensagensAjuda,
  canVisualizarAjuda,
  normalizePortalRole,
} from '@/lib/roles';
import { getPortalSession } from '@/lib/utils/session';
import { usePortalPerfil } from '@/contexts/PortalPerfilContext';
import { AJUDA_CHAT_ATUALIZADO } from '@/lib/ajuda-chat-events';
import { CanalAjudaPainel } from '@/components/ajuda/CanalAjudaPainel';

export function BotaoAjuda() {
  const { role: ctxRole, carregado } = usePortalPerfil();
  const [mostrarFabAjuda, setMostrarFabAjuda] = useState<boolean | null>(null);
  const [podeInbox, setPodeInbox] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [aberto, setAberto] = useState(false);

  const carregarPendentes = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    fetch(`/api/admin/ajuda-chat?somente_pendentes=1&resumo=1&_=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; pendentes?: number }) => {
        if (!data.ok) return;
        setPendentes(Math.max(0, Number(data.pendentes ?? 0)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!carregado) return;
    const sess = getPortalSession();
    const cidRaw = sess?.colaboradorId?.trim() ?? '';
    const cid = cidRaw && cidRaw !== 'pending' ? cidRaw : '';
    const role = normalizePortalRole(ctxRole);
    const podeVerInbox = canVisualizarAjuda(role, cid || undefined);
    const podeExcluir = canExcluirMensagensAjuda(role);
    setPodeInbox(podeVerInbox);
    setMostrarFabAjuda(!podeVerInbox || podeExcluir);
  }, [carregado, ctxRole]);

  useEffect(() => {
    if (!podeInbox) {
      setPendentes(0);
      return;
    }
    carregarPendentes();
    const timer = window.setInterval(carregarPendentes, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') carregarPendentes();
    };
    const onAtualizado = () => carregarPendentes();
    window.addEventListener('focus', carregarPendentes);
    window.addEventListener(AJUDA_CHAT_ATUALIZADO, onAtualizado);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', carregarPendentes);
      window.removeEventListener(AJUDA_CHAT_ATUALIZADO, onAtualizado);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [podeInbox, carregarPendentes]);

  if (mostrarFabAjuda !== true) return null;

  const temPendentes = podeInbox && pendentes > 0 && !aberto;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-cream-100 shadow-lg transition-colors items-center justify-center ${
          temPendentes
            ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-400/50'
            : 'bg-dourado-base hover:bg-dourado-400'
        }`}
        aria-label={temPendentes ? `Ajuda: ${pendentes} mensagem(ns) sem resposta` : 'Preciso de ajuda'}
        title={temPendentes ? `${pendentes} mensagem(ns) sem resposta` : 'Preciso de ajuda'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {temPendentes && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-white text-red-600 text-xs font-bold flex items-center justify-center shadow">
            {pendentes > 99 ? '99+' : pendentes}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div
            className="hidden md:block fixed inset-0 z-40 bg-black/40"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div className="hidden md:block fixed bottom-24 right-6 z-50 w-[min(420px,calc(100vw-2rem))]">
            <CanalAjudaPainel
              variant="modal"
              onClose={() => setAberto(false)}
              onChatAtualizado={carregarPendentes}
            />
          </div>
        </>
      )}
    </>
  );
}
