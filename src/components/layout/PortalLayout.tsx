'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from './Header';
import { BotaoAjuda } from '@/components/ajuda/BotaoAjuda';
import { clearPortalSession, isPendingRegistration, setPortalSession } from '@/lib/utils/session';
import { CompleteRegistrationForm } from '@/components/portal/CompleteRegistrationForm';
import { normalizePortalRole } from '@/lib/roles';
import { ManualEventosToast } from '@/components/notificacoes/ManualEventosToast';
import { PortalOnlineStrip, PortalPresenceHeartbeat } from '@/components/portal/PortalPresence';
import { urlOnboardingColaborador } from '@/lib/onboarding-reabrir';
import { fotoObrigatoriaPortal } from '@/lib/perfil-completo';
import { EMOCOES_TERMOMETRO } from '@/lib/emocional-opcoes';
import { AniversarioBalaoPortal } from '@/components/aniversario/AniversarioBalaoPortal';
import { PortalPwaRefresh } from '@/components/portal/PortalPwaRefresh';

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gateOk, setGateOk] = useState(false);
  const [abrirEmocionalObrigatorio, setAbrirEmocionalObrigatorio] = useState(false);
  const [enviandoEmocao, setEnviandoEmocao] = useState(false);
  const [perfilRole, setPerfilRole] = useState<string>('colaborador');

  useEffect(() => {
    setGateOk(false);
    if (isPendingRegistration()) {
      setGateOk(true);
      return;
    }
    let cancelled = false;
    const aplicarPerfil = (d: {
      ok?: boolean;
      colaborador?: {
        role?: string | null;
        cpf_cadastrado?: boolean;
        perfil_completo?: boolean;
        onboarding_completo?: boolean;
        foto_cadastrada?: boolean;
        id?: string;
        unidade_id?: string;
      };
    }) => {
      if (cancelled) return;
      if (d.ok && d.colaborador && d.colaborador.cpf_cadastrado === false) {
        router.replace('/completar-cpf');
        return;
      }
      if (
        d.ok &&
        d.colaborador &&
        d.colaborador.perfil_completo === false &&
        pathname !== '/portal/perfil'
      ) {
        router.replace('/portal/perfil?completar=1');
        return;
      }
      if (
        d.ok &&
        d.colaborador &&
        d.colaborador.perfil_completo === true &&
        d.colaborador.onboarding_completo === false &&
        d.colaborador.id &&
        d.colaborador.unidade_id
      ) {
        router.replace(urlOnboardingColaborador(d.colaborador.id, d.colaborador.unidade_id));
        return;
      }
      const role = normalizePortalRole(d?.colaborador?.role ?? 'colaborador');
      const onboardingOk =
        role !== 'colaborador' || d.colaborador?.onboarding_completo === true;
      if (
        d.ok &&
        d.colaborador &&
        fotoObrigatoriaPortal(role) &&
        d.colaborador.perfil_completo === true &&
        onboardingOk &&
        d.colaborador.foto_cadastrada === false &&
        pathname !== '/portal/perfil'
      ) {
        router.replace('/portal/perfil?foto=1');
        return;
      }
      setPerfilRole(role);
      if (d.ok && role === 'colaborador' && d.colaborador?.perfil_completo === true && d.colaborador?.foto_cadastrada === true) {
        fetch('/api/portal/emocional', { credentials: 'include', cache: 'no-store' })
          .then((r) => r.json())
          .then((emo) => {
            if (cancelled) return;
            setAbrirEmocionalObrigatorio(!(emo?.ok && emo?.emocao));
          })
          .catch(() => {
            if (!cancelled) setAbrirEmocionalObrigatorio(false);
          });
      } else {
        setAbrirEmocionalObrigatorio(false);
      }
      setGateOk(true);
    };

    const carregarPerfil = () =>
      fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' }).then((r) => r.json());

    carregarPerfil()
      .then(async (d) => {
        if (cancelled) return;
        if (d?.ok) {
          aplicarPerfil(d);
          return;
        }
        const adminAuth = await fetch('/api/admin/auth', {
          credentials: 'include',
          cache: 'no-store',
        })
          .then((r) => r.json())
          .catch(() => ({ ok: false }));
        if (!adminAuth?.ok) {
          router.replace('/login');
          return;
        }
        const restaurado = await fetch('/api/admin/restaurar-portal', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
          .then((r) => r.json())
          .catch(() => ({ ok: false }));
        if (restaurado?.ok && restaurado.colaborador?.id) {
          setPortalSession(
            String(restaurado.colaborador.id),
            String(restaurado.colaborador.unidade_id ?? ''),
            restaurado.colaborador.role
          );
          const d2 = await carregarPerfil();
          if (!cancelled && d2?.ok) {
            aplicarPerfil(d2);
            return;
          }
        }
        if (!cancelled) {
          clearPortalSession();
          router.replace('/login');
        }
      })
      .catch(() => {
        if (!cancelled) setGateOk(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== '/portal') return;
    if (isPendingRegistration()) return;

    let skipTrap = false;
    try {
      if (sessionStorage.getItem('portal_skip_back_guard_once') === '1') {
        sessionStorage.removeItem('portal_skip_back_guard_once');
        skipTrap = true;
      }
    } catch {
      /* noop */
    }

    if (skipTrap) {
      return () => {};
    }

    const state = (window.history.state || {}) as Record<string, unknown>;
    if (state.portalGuard !== true) {
      window.history.pushState({ ...state, portalGuard: true }, '', window.location.href);
    }

    const onPopState = () => {
      const confirmar = window.confirm('Deseja sair do portal?');
      if (confirmar) {
        clearPortalSession();
        router.replace('/login');
        return;
      }
      const st = (window.history.state || {}) as Record<string, unknown>;
      window.history.pushState({ ...st, portalGuard: true }, '', window.location.href);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [pathname, router]);

  if (!isPendingRegistration() && !gateOk) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <p className="text-coffee-base text-sm">Carregando…</p>
      </div>
    );
  }

  if (isPendingRegistration()) {
    return (
      <div className="min-h-screen bg-cream-100">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
          <CompleteRegistrationForm />
        </main>
        <BotaoAjuda />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-cream-100">
      <Header />
      <PortalPresenceHeartbeat />
      <PortalPwaRefresh />
      <PortalOnlineStrip />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
        {children}
      </main>
      <BotaoAjuda />
      <ManualEventosToast />
      <AniversarioBalaoPortal ativo={gateOk} />
      {perfilRole === 'colaborador' && abrirEmocionalObrigatorio && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-dourado-200 bg-white p-5 shadow-2xl">
            <h2 className="font-display text-xl text-coffee-base font-semibold">Termômetro de emoções</h2>
            <p className="text-sm text-coffee-100 mt-1">
              Primeiro acesso do dia: selecione como você está se sentindo para continuar no portal.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EMOCOES_TERMOMETRO.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={enviandoEmocao}
                  onClick={async () => {
                    setEnviandoEmocao(true);
                    try {
                      const res = await fetch('/api/portal/emocional', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ emocao: e.id }),
                      });
                      const data = await res.json();
                      if (data.ok) setAbrirEmocionalObrigatorio(false);
                    } finally {
                      setEnviandoEmocao(false);
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-left hover:border-dourado-base/60 hover:bg-dourado-50 disabled:opacity-60"
                >
                  <span className="text-2xl">{e.emoji}</span>
                  <span>
                    <span className="block text-sm font-medium text-coffee-base">{e.label}</span>
                    <span className="block text-xs text-coffee-100">{e.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
