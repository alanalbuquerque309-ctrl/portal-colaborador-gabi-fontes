'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from './Header';
import { BotaoAjuda } from '@/components/ajuda/BotaoAjuda';
import { clearPortalSession, getPortalSession, isPendingRegistration, setPortalSession } from '@/lib/utils/session';
import { CompleteRegistrationForm } from '@/components/portal/CompleteRegistrationForm';
import { normalizePortalRole } from '@/lib/roles';
import { ManualEventosToast } from '@/components/notificacoes/ManualEventosToast';
import { urlOnboardingColaborador } from '@/lib/onboarding-reabrir';
import { fotoObrigatoriaPortal } from '@/lib/perfil-completo';
import { EMOCOES_TERMOMETRO } from '@/lib/emocional-opcoes';
import { AniversarioBalaoPortal } from '@/components/aniversario/AniversarioBalaoPortal';
import { PortalPwaRefresh } from '@/components/portal/PortalPwaRefresh';
import { PortalAmbientePagina } from '@/components/portal/vivo/PortalBalaoCard';
import { PortalPerfilProvider } from '@/contexts/PortalPerfilContext';
import { LogoCarregando } from '@/components/ui/LogoCarregando';

type ColaboradorGate = {
  role?: string | null;
  cpf_cadastrado?: boolean;
  perfil_completo?: boolean;
  onboarding_completo?: boolean;
  foto_cadastrada?: boolean;
  id?: string;
  unidade_id?: string;
};

type PerfilResposta = {
  ok?: boolean;
  pode_visita_rh?: boolean;
  colaborador?: ColaboradorGate;
};

function PortalLayoutSkeleton() {
  return (
    <div className="flex justify-center py-16 md:py-24" aria-busy="true">
      <LogoCarregando size="md" revelarCor label="Carregando portal…" />
    </div>
  );
}

function sessaoPortalAtivaNoCliente(): boolean {
  if (typeof document === 'undefined') return false;
  if (isPendingRegistration()) return true;
  const s = getPortalSession();
  return Boolean(s?.colaboradorId && s.colaboradorId !== 'pending');
}

function roleInicialDoCookie(): string {
  if (typeof document === 'undefined') return 'colaborador';
  return getPortalSession()?.role ?? 'colaborador';
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  /** Com cookie de sessão, libera UI na hora; perfil valida em segundo plano. */
  const [gateOk, setGateOk] = useState(sessaoPortalAtivaNoCliente);
  const [abrirEmocionalObrigatorio, setAbrirEmocionalObrigatorio] = useState(false);
  const [enviandoEmocao, setEnviandoEmocao] = useState(false);
  const [perfilRole, setPerfilRole] = useState(roleInicialDoCookie);
  const [podeVisitaRh, setPodeVisitaRh] = useState(false);

  const perfilCacheRef = useRef<PerfilResposta | null>(null);
  const sessaoValidadaRef = useRef(false);
  const emocionalVerificadoRef = useRef(false);
  const pathnameAnteriorRef = useRef(pathname);

  const aplicarPerfilNaSessao = (d: PerfilResposta) => {
    perfilCacheRef.current = d;
    const role = normalizePortalRole(d?.colaborador?.role ?? 'colaborador');
    setPerfilRole(role);
    setPodeVisitaRh(d.pode_visita_rh === true);
    sessaoValidadaRef.current = true;
    setGateOk(true);
  };

  const checarRedirecionamentos = (d: PerfilResposta, path: string) => {
    const col = d.colaborador;
    if (!d.ok || !col) return false;

    if (col.cpf_cadastrado === false) {
      router.replace('/completar-cpf');
      return true;
    }
    if (col.perfil_completo === false && path !== '/portal/perfil') {
      router.replace('/portal/perfil?completar=1');
      return true;
    }
    if (
      col.perfil_completo === true &&
      col.onboarding_completo === false &&
      col.id &&
      col.unidade_id
    ) {
      router.replace(urlOnboardingColaborador(col.id, col.unidade_id));
      return true;
    }
    const role = normalizePortalRole(col.role);
    const onboardingOk = role !== 'colaborador' || col.onboarding_completo === true;
    if (
      fotoObrigatoriaPortal(role) &&
      col.perfil_completo === true &&
      onboardingOk &&
      col.foto_cadastrada === false &&
      path !== '/portal/perfil'
    ) {
      router.replace('/portal/perfil?foto=1');
      return true;
    }
    return false;
  };

  /** Valida sessão uma vez por aba — não refaz a cada clique interno. */
  useEffect(() => {
    if (isPendingRegistration()) {
      setGateOk(true);
      return;
    }
    if (sessaoValidadaRef.current && perfilCacheRef.current?.ok) {
      setGateOk(true);
      return;
    }

    let cancelled = false;

    const carregarPerfil = () =>
      fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' }).then((r) => r.json());

    carregarPerfil()
      .then(async (d: PerfilResposta) => {
        if (cancelled) return;
        if (d?.ok) {
          if (!checarRedirecionamentos(d, pathname)) aplicarPerfilNaSessao(d);
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
            if (!checarRedirecionamentos(d2, pathname)) aplicarPerfilNaSessao(d2);
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
  }, [router]);

  /** Ao mudar de rota: redirecionamentos com cache; refresh silencioso só ao sair do perfil. */
  useEffect(() => {
    if (!gateOk || isPendingRegistration()) return;

    const prev = pathnameAnteriorRef.current;
    pathnameAnteriorRef.current = pathname;

    const d = perfilCacheRef.current;
    if (d?.ok) {
      checarRedirecionamentos(d, pathname);
    }

    const saiuDoPerfil = prev === '/portal/perfil' && pathname !== '/portal/perfil';
    if (!saiuDoPerfil || !sessaoValidadaRef.current) return;

    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((fresh: PerfilResposta) => {
        if (cancel || !fresh?.ok) return;
        perfilCacheRef.current = fresh;
        setPerfilRole(normalizePortalRole(fresh.colaborador?.role ?? 'colaborador'));
        setPodeVisitaRh(fresh.pode_visita_rh === true);
        checarRedirecionamentos(fresh, pathname);
      })
      .catch(() => {});

    return () => {
      cancel = true;
    };
  }, [pathname, gateOk, router]);

  /** Termômetro obrigatório: uma vez por aba, não a cada navegação. */
  useEffect(() => {
    if (!gateOk || emocionalVerificadoRef.current || isPendingRegistration()) return;
    const col = perfilCacheRef.current?.colaborador;
    const role = normalizePortalRole(col?.role ?? perfilRole);
    if (role !== 'colaborador' || col?.perfil_completo !== true || col?.foto_cadastrada !== true) {
      setAbrirEmocionalObrigatorio(false);
      emocionalVerificadoRef.current = true;
      return;
    }

    let cancelled = false;
    fetch('/api/portal/emocional', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((emo) => {
        if (cancelled) return;
        setAbrirEmocionalObrigatorio(!(emo?.ok && emo?.emocao));
        emocionalVerificadoRef.current = true;
      })
      .catch(() => {
        if (!cancelled) {
          setAbrirEmocionalObrigatorio(false);
          emocionalVerificadoRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gateOk, perfilRole]);

  useEffect(() => {
    if (!gateOk || isPendingRegistration()) return;
    const role = normalizePortalRole(perfilRole);
    const isLider = role === 'gerente' || role === 'master' || role === 'admin';
    if (!isLider) return;
    if (pathname === '/portal/avaliacao-master') return;

    let cancel = false;
    fetch('/api/portal/graos/lider-bloqueio', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; bloqueado?: boolean }) => {
        if (cancel) return;
        if (d.ok && d.bloqueado) {
          router.replace('/portal/avaliacao-master');
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [gateOk, pathname, perfilRole, router]);

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

  const perfilCtx = { role: perfilRole, podeVisitaRh, carregado: gateOk };

  if (isPendingRegistration()) {
    return (
      <PortalPerfilProvider value={perfilCtx}>
        <div className="min-h-screen bg-cream-100">
          <Header perfilRole={perfilRole} perfilCarregado={gateOk} />
          <main className="max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
            <CompleteRegistrationForm />
          </main>
          <BotaoAjuda />
        </div>
      </PortalPerfilProvider>
    );
  }

  const carregandoInicial = !gateOk && !sessaoPortalAtivaNoCliente();

  return (
    <PortalPerfilProvider value={perfilCtx}>
      <div className="relative min-h-screen bg-cream-100">
        <PortalAmbientePagina />
        <Header perfilRole={perfilRole} perfilCarregado={gateOk} />
        <PortalPwaRefresh />
        <main className="relative z-[1] max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
          {carregandoInicial ? <PortalLayoutSkeleton /> : children}
        </main>
        <BotaoAjuda />
        {!carregandoInicial && <ManualEventosToast />}
        {!carregandoInicial && <AniversarioBalaoPortal ativo={gateOk} />}
        {perfilRole === 'colaborador' && abrirEmocionalObrigatorio && (
          <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-dourado-200 bg-white p-5 shadow-2xl">
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
    </PortalPerfilProvider>
  );
}
