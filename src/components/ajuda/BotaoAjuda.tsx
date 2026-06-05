'use client';

import { useEffect, useState } from 'react';
import {
  canExcluirMensagensAjuda,
  canVisualizarAjuda,
  normalizePortalRole,
} from '@/lib/roles';
import { getPortalSession } from '@/lib/utils/session';
import { CanalAjudaPainel } from '@/components/ajuda/CanalAjudaPainel';

export function BotaoAjuda() {
  /**
   * FAB oculto no mobile (menu Comunicação) e para quem vê Inbox sem poder apagar (ex.: RH dedicado).
   * Sócio/admin mantêm o atalho flutuante no desktop.
   */
  const [mostrarFabAjuda, setMostrarFabAjuda] = useState<boolean | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { role?: string | null } }) => {
        if (cancel) return;
        if (!data.ok || !data.colaborador) {
          setMostrarFabAjuda(true);
          return;
        }
        const sess = getPortalSession();
        const cidRaw = sess?.colaboradorId?.trim() ?? '';
        const cid = cidRaw && cidRaw !== 'pending' ? cidRaw : '';
        const role = normalizePortalRole(data.colaborador.role);
        const podeInbox = canVisualizarAjuda(role, cid || undefined);
        const podeExcluir = canExcluirMensagensAjuda(role);
        setMostrarFabAjuda(!podeInbox || podeExcluir);
      })
      .catch(() => {
        if (!cancel) setMostrarFabAjuda(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (mostrarFabAjuda !== true) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-dourado-base text-cream-100 shadow-lg hover:bg-dourado-400 transition-colors items-center justify-center"
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
            className="hidden md:block fixed inset-0 z-40 bg-black/40"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div className="hidden md:block fixed bottom-24 right-6 z-50 w-[380px]">
            <CanalAjudaPainel variant="modal" onClose={() => setAberto(false)} />
          </div>
        </>
      )}
    </>
  );
}
