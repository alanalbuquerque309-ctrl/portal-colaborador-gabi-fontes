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
import { AniversarioBalaoPortal } from '@/components/aniversario/AniversarioBalaoPortal';
import { PortalPwaRefresh } from '@/components/portal/PortalPwaRefresh';
import { PortalAmbientePagina } from '@/components/portal/vivo/PortalBalaoCard';
import { PortalPerfilProvider } from '@/contexts/PortalPerfilContext';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalNavigationLoader } from '@/components/portal/PortalNavigationLoader';
import { PortalPresenceHeartbeat } from '@/components/portal/PortalPresence';
import {
  roleAplicaBloqueioQuintaHard,
  rotaLiberadaComBloqueioQuinta,
} from '@/lib/graos/lider-quinta-bloqueio-shared';

type ColaboradorGate = {
  role?: string | null;
  cpf_cadastrado?: boolean;
  perfil_completo?: boolean;
  onboarding_completo?: boolean;
  foto_cadastrada?: boolean;
  id?: string;
  unidade_id?: string;
  setor?: string | null;
  cargo?: string | null;
  onboarding_manual_escolhido_file?: string | null;
};

type PerfilResposta = {
  ok?: boolean;
  pode_visita_rh?: boolean;
  pode_avaliacao_equipe?: boolean;
  graos_congelado?: boolean;
  colaborador?: ColaboradorGate;
};

function PortalLayoutSkeleton() {
  return (
    <div className="flex justify-center py-16 md:py-24" aria-busy="true">
      <XicaraCarregando size="lg" label="Carregando portal…" />
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
  const [perfilRole, setPerfilRole] = useState(roleInicialDoCookie);
  const [podeVisitaRh, setPodeVisitaRh] = useState(false);
  const [podeAvaliacaoEquipe, setPodeAvaliacaoEquipe] = useState(false);
  const [graosCongeladoFlag, setGraosCongeladoFlag] = useState(true);
  const [colaboradorIdCtx, setColaboradorIdCtx] = useState<string | null>(
    () => getPortalSession()?.colaboradorId ?? null
  );
  const [unidadeIdCtx, setUnidadeIdCtx] = useState<string | null>(
    () => getPortalSession()?.unidadeId ?? null
  );
  const [onboardingCompleto, setOnboardingCompleto] = useState(false);
  const [onboardingManualFile, setOnboardingManualFile] = useState<string | null>(null);
  const [setorCtx, setSetorCtx] = useState<string | null>(null);
  const [cargoCtx, setCargoCtx] = useState<string | null>(null);
  const [perfilValidado, setPerfilValidado] = useState(false);

  const perfilCacheRef = useRef<PerfilResposta | null>(null);
  const sessaoValidadaRef = useRef(false);
  const pathnameAnteriorRef = useRef(pathname);

  const aplicarPerfilNaSessao = (d: PerfilResposta) => {
    perfilCacheRef.current = d;
    const col = d.colaborador;
    const role = normalizePortalRole(col?.role ?? 'colaborador');
    setPerfilRole(role);
    setPodeVisitaRh(d.pode_visita_rh === true);
    setPodeAvaliacaoEquipe(d.pode_avaliacao_equipe === true);
    setGraosCongeladoFlag(d.graos_congelado !== false);
    setColaboradorIdCtx(col?.id ? String(col.id) : null);
    setUnidadeIdCtx(col?.unidade_id ? String(col.unidade_id) : null);
    setOnboardingCompleto(col?.onboarding_completo === true);
    setOnboardingManualFile(col?.onboarding_manual_escolhido_file?.trim() || null);
    setSetorCtx(col?.setor ?? null);
    setCargoCtx(col?.cargo ?? null);
    if (col?.id && col?.unidade_id) {
      setPortalSession(String(col.id), String(col.unidade_id), role);
    }
    sessaoValidadaRef.current = true;
    setPerfilValidado(true);
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
        aplicarPerfilNaSessao(fresh);
        checarRedirecionamentos(fresh, pathname);
      })
      .catch(() => {});

    return () => {
      cancel = true;
    };
  }, [pathname, gateOk, router]);


  useEffect(() => {
    if (!gateOk || isPendingRegistration()) return;
    const role = normalizePortalRole(perfilRole);
    // Só gerente/master: admin (Daniel) e sócios não são jogados para Avaliação.
    if (!roleAplicaBloqueioQuintaHard(role)) return;
    if (rotaLiberadaComBloqueioQuinta(pathname)) return;

    try {
      const cached = sessionStorage.getItem('portal_lider_bloqueio');
      if (cached) {
        const parsed = JSON.parse(cached) as { bloqueado: boolean; ts: number };
        if (Date.now() - parsed.ts < 10 * 60 * 1000) {
          if (parsed.bloqueado) router.replace('/portal/avaliacao-master');
          return;
        }
      }
    } catch { /* noop */ }

    let cancel = false;
    fetch('/api/portal/graos/lider-bloqueio', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; bloqueado?: boolean }) => {
        if (cancel) return;
        try {
          sessionStorage.setItem(
            'portal_lider_bloqueio',
            JSON.stringify({ bloqueado: !!d.bloqueado, ts: Date.now() })
          );
        } catch { /* noop */ }
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

  const perfilCtx = {
    role: perfilRole,
    colaboradorId: colaboradorIdCtx,
    unidadeId: unidadeIdCtx,
    podeVisitaRh,
    podeAvaliacaoEquipe,
    graosCongelado: graosCongeladoFlag,
    onboardingCompleto,
    onboardingManualEscolhidoFile: onboardingManualFile,
    setor: setorCtx,
    cargo: cargoCtx,
    carregado: perfilValidado,
  };


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
        <PortalNavigationLoader />
        <PortalAmbientePagina />
        <Header perfilRole={perfilRole} perfilCarregado={gateOk} />
        <PortalPwaRefresh />
        {!carregandoInicial && gateOk && <PortalPresenceHeartbeat />}
        <main className="relative z-[1] max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
          {carregandoInicial ? <PortalLayoutSkeleton /> : children}
        </main>
        <BotaoAjuda />
        {!carregandoInicial && <ManualEventosToast />}
        {!carregandoInicial && <AniversarioBalaoPortal ativo={gateOk} />}
      </div>
    </PortalPerfilProvider>
  );
}
