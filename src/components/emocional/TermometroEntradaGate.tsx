'use client';

import { useCallback, useEffect, useState } from 'react';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';
import { usePortalPerfil } from '@/contexts/PortalPerfilContext';
import { normalizePortalRole } from '@/lib/roles';
import { getPortalSession } from '@/lib/utils/session';
import { emitPortalHomeAtualizado } from '@/lib/portal-home-events';
import { gravarEmocionalCacheCliente, lerEmocionalCacheCliente } from '@/lib/emocional-cache-cliente';

/**
 * Colaborador de operação: ao entrar na home, precisa registrar o termômetro do dia
 * antes de usar o restante do portal. Líderes/RH/admin/sócios não são bloqueados.
 */
export function TermometroEntradaGate({ children }: { children: React.ReactNode }) {
  const { role, carregado } = usePortalPerfil();
  const [estado, setEstado] = useState<'checando' | 'bloqueado' | 'liberado'>('checando');

  const ehColaborador = normalizePortalRole(role) === 'colaborador';

  const verificar = useCallback(async () => {
    if (!carregado) return;
    if (!ehColaborador) {
      setEstado('liberado');
      return;
    }
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setEstado('liberado');
      return;
    }
    const cached = lerEmocionalCacheCliente(session.colaboradorId);
    if (cached?.emocao) {
      setEstado('liberado');
      return;
    }
    try {
      const res = await fetch('/api/portal/emocional', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data?.ok && data.emocao) {
        gravarEmocionalCacheCliente(session.colaboradorId, data.emocao, data.motivo ?? null);
        setEstado('liberado');
      } else {
        setEstado('bloqueado');
      }
    } catch {
      setEstado('liberado');
    }
  }, [carregado, ehColaborador]);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  useEffect(() => {
    if (estado !== 'bloqueado') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [estado]);

  const onRegistro = () => {
    const session = getPortalSession();
    if (session?.colaboradorId) {
      gravarEmocionalCacheCliente(session.colaboradorId, 'registrado', null);
    }
    setEstado('liberado');
    emitPortalHomeAtualizado();
  };

  if (!carregado || estado === 'checando') {
    return (
      <div className="flex justify-center py-16" aria-busy>
        <span className="text-sm text-cafeteria-600">Preparando o portal…</span>
      </div>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-coffee-base/50 backdrop-blur-[2px] p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="termometro-gate-titulo"
      >
        <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-terracota-200/80 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <div className="px-5 pt-5 pb-3 border-b border-cream-200 bg-gradient-to-br from-terracota-50/80 via-white to-cream-50">
            <p className="text-xs font-bold uppercase tracking-wide text-terracota-700 mb-1">
              Antes de começar
            </p>
            <h2 id="termometro-gate-titulo" className="text-xl font-display font-semibold text-cafeteria-900">
              Como você está hoje?
            </h2>
            <p className="text-sm text-cafeteria-600 mt-1.5 leading-relaxed">
              Responda o termômetro para liberar o portal. Se algo não estiver bem, liderança e RH
              podem te procurar com cuidado.
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <TermometroEmocional onRegistroConcluido={onRegistro} modoGate />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
