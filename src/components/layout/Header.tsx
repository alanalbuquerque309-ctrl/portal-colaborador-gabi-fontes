'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getPortalSession, clearPortalSession, setPortalSession } from '@/lib/utils/session';
import { manualPorSetor } from '@/lib/manual-por-setor';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import {
  canResponderAjudaFinal,
  canVisualizarAjuda,
  normalizePortalRole,
  podeVerGraosCafePortal,
} from '@/lib/roles';
import { podeAcessarAdminPortal } from '@/lib/admin-access';
import { podeVerBonificacaoInterna, podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { AJUDA_CHAT_ATUALIZADO } from '@/lib/ajuda-chat-events';
import { SUGESTOES_ATUALIZADO } from '@/lib/sugestoes-events';

const POLL_AJUDA_MS = 60_000;
const POLL_SUGESTOES_MS = 60_000;
const POLL_PENDENCIAS_MS = 90_000;

function pollSeAbaVisivel(fn: () => void) {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  fn();
}

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: 'mural' | 'escala' | 'sugestoes' | 'comunicacao' | 'manuais' | 'perfil' | 'meu-manual' | 'avaliacao' | 'desempenho' | 'familia' | 'graos' | 'treinamento';
};

function dedupeNavPorHref(items: NavItem[]): NavItem[] {
  const vistos = new Set<string>();
  return items.filter((item) => {
    if (vistos.has(item.href)) return false;
    vistos.add(item.href);
    return true;
  });
}

function navAtivo(pathname: string | null | undefined, href: string): boolean {
  const p = pathname ?? '';
  if (!p || !href) return false;
  if (href === '/portal') {
    return p === '/portal';
  }
  if (href === '/portal/meu-manual') {
    return p === href || p.startsWith('/portal/manual');
  }
  if (href === '/portal/treinamento') {
    return p === href || p.startsWith('/portal/treinamento/');
  }
  if (href === '/portal/comunicacao') {
    return (
      p === '/portal/comunicacao' ||
      p === '/portal/sugestoes' ||
      p.startsWith('/portal/ajuda')
    );
  }
  if (p === href) return true;
  const base = href.split('?')[0]?.split('#')[0] ?? href;
  return p.startsWith(`${base}/`);
}

const itemTreinamento: NavItem = {
  href: '/portal/treinamento',
  label: 'Treinamento',
  short: 'Treino',
  icon: 'treinamento',
};

const itemComunicacao: NavItem = {
  href: '/portal/comunicacao',
  label: 'Comunicação',
  short: 'Comunicação',
  icon: 'comunicacao',
};

const itemAniversariantes: NavItem = {
  href: '/portal/aniversariantes',
  label: 'Aniversários',
  short: 'Aniv.',
  icon: 'familia',
};

function NavIcon({ type }: { type: string }) {
  const base = 'w-5 h-5 shrink-0';
  switch (type) {
    case 'mural':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'familia':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'escala':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'sugestoes':
    case 'comunicacao':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      );
    case 'perfil':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'manuais':
    case 'meu-manual':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'treinamento':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'avaliacao':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'desempenho':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'graos':
      return (
        <svg className={base} viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="14" rx="4" ry="6" opacity="0.85" />
          <ellipse cx="8" cy="11" rx="3" ry="5" opacity="0.65" />
          <ellipse cx="16" cy="11" rx="3" ry="5" opacity="0.65" />
        </svg>
      );
    default:
      return null;
  }
}

type HeaderProps = {
  /** Role já validado pelo PortalLayout (evita flash de nav de colaborador). */
  perfilRole?: string;
  perfilCarregado?: boolean;
};

export function Header({ perfilRole: perfilRoleLayout, perfilCarregado = false }: HeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [podeAdmin, setPodeAdmin] = useState(false);
  const [podeGerenteAvaliador, setPodeGerenteAvaliador] = useState(false);
  const [podeAvaliarEquipe, setPodeAvaliarEquipe] = useState(false);
  const [podeVerMinhaLideranca, setPodeVerMinhaLideranca] = useState(false);
  const [podeVerDesempenho, setPodeVerDesempenho] = useState(false);
  const [podeAvaliarLideranca, setPodeAvaliarLideranca] = useState(false);
  const [podeVisitaRh, setPodeVisitaRh] = useState(false);
  const [podeRelatoriosAvaliacoes, setPodeRelatoriosAvaliacoes] = useState(false);
  const [podeResponderAjuda, setPodeResponderAjuda] = useState(false);
  const [podeVisualizarAjuda, setPodeVisualizarAjuda] = useState(false);
  const [pendenciasAjuda, setPendenciasAjuda] = useState(0);
  const [sugestoesPendentes, setSugestoesPendentes] = useState(0);
  const [pendenciasSemana, setPendenciasSemana] = useState(0);
  const [pendenciasSemanaCriticas, setPendenciasSemanaCriticas] = useState(false);
  const [mostrarMeuManual, setMostrarMeuManual] = useState(false);
  const [perfilRoleLocal, setPerfilRoleLocal] = useState<string | null>(null);
  const [colaboradorIdNav, setColaboradorIdNav] = useState<string | null>(null);
  const [mostrarGraosNav, setMostrarGraosNav] = useState(false);
  const [graosSaldo, setGraosSaldo] = useState<number | null>(null);
  const [maisAberto, setMaisAberto] = useState(false);

  const roleNav = perfilCarregado
    ? normalizePortalRole(perfilRoleLayout)
    : normalizePortalRole(perfilRoleLocal ?? 'colaborador');

  const colaboradorIdEfetivo =
    colaboradorIdNav ?? getPortalSession()?.colaboradorId ?? null;

  const podeContadorSugestoes = podeVerBonificacaoInterna(roleNav);

  useEffect(() => {
    if (!perfilCarregado || !podeContadorSugestoes) {
      setSugestoesPendentes(0);
      return;
    }
    let cancel = false;
    const carregar = () => {
      pollSeAbaVisivel(() => {
        fetch(`/api/admin/sugestoes/pendentes?_=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
          .then((r) => r.json())
          .then((d: { ok?: boolean; pendentes?: number }) => {
            if (cancel || d.ok !== true) return;
            setSugestoesPendentes(Math.max(0, Number(d.pendentes ?? 0)));
          })
          .catch(() => {});
      });
    };
    carregar();
    const timer = window.setInterval(carregar, POLL_SUGESTOES_MS);
    window.addEventListener('focus', carregar);
    window.addEventListener(SUGESTOES_ATUALIZADO, carregar);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', carregar);
      window.removeEventListener(SUGESTOES_ATUALIZADO, carregar);
    };
  }, [perfilCarregado, podeContadorSugestoes, pathname]);

  useEffect(() => {
    if (!perfilCarregado || !podeVerPendenciasSemanaRede(roleNav)) {
      setPendenciasSemana(0);
      return;
    }
    let cancel = false;
    const carregar = () => {
      pollSeAbaVisivel(() => {
        fetch(`/api/portal/avaliacoes-pendentes?resumo=1&_=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
          .then((r) => r.json())
          .then((d: { ok?: boolean; total?: number; meta?: { alerta_critico_sexta?: boolean } }) => {
            if (cancel || d.ok !== true) return;
            setPendenciasSemana(Math.max(0, Number(d.total ?? 0)));
            setPendenciasSemanaCriticas(d.meta?.alerta_critico_sexta === true);
          })
          .catch(() => {});
      });
    };
    carregar();
    const timer = window.setInterval(carregar, POLL_PENDENCIAS_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    window.addEventListener('focus', carregar);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', carregar);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [perfilCarregado, roleNav, pathname]);

  useEffect(() => {
    if (!perfilCarregado || !podeVerGraosCafePortal(roleNav, colaboradorIdEfetivo)) {
      setMostrarGraosNav(false);
      setGraosSaldo(null);
      return;
    }
    let cancel = false;
    fetch('/api/portal/graos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; saldo_confirmado?: number; modo_gestao?: boolean; apenas_visualizacao?: boolean }) => {
        if (cancel) return;
        const ok = d.ok === true;
        setMostrarGraosNav(ok);
        if (d.modo_gestao || d.apenas_visualizacao) {
          setGraosSaldo(null);
        } else {
          setGraosSaldo(ok && typeof d.saldo_confirmado === 'number' ? d.saldo_confirmado : null);
        }
      })
      .catch(() => {
        if (!cancel) {
          setMostrarGraosNav(false);
          setGraosSaldo(null);
        }
      });
    return () => {
      cancel = true;
    };
  }, [perfilCarregado, roleNav, colaboradorIdEfetivo, pathname]);

  useEffect(() => {
    let cancelled = false;

    const aplicarRole = (r: string, cid?: string, unidadeId?: string) => {
      setPerfilRoleLocal(r);
      if (cid) setColaboradorIdNav(cid);
      setPodeAdmin(podeAcessarAdminPortal(r));
      setPodeGerenteAvaliador(r === 'gerente' || r === 'master');
      setPodeAvaliarEquipe(r === 'gerente' || r === 'master' || r === 'admin');
      setPodeVerMinhaLideranca(r === 'gerente' || r === 'master' || r === 'admin');
      setPodeVerDesempenho(r === 'colaborador');
      setPodeAvaliarLideranca(r === 'colaborador' || r === 'admin' || r === 'rh');
      setPodeRelatoriosAvaliacoes(podeVerRelatoriosAvaliacoesCompletos(r));
      setPodeResponderAjuda(canResponderAjudaFinal(cid, r));
      setPodeVisualizarAjuda(canVisualizarAjuda(r, cid));
    };

    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((d: { ok?: boolean; colaborador?: { role?: string; id?: string; unidade_id?: string } }) => {
        if (cancelled) return;
        if (d?.ok && d.colaborador) {
          const r = normalizePortalRole(d.colaborador.role);
          const cid = d.colaborador.id;
          const uid = d.colaborador.unidade_id;
          if (cid && uid) {
            setPortalSession(String(cid), String(uid), r);
          }
          aplicarRole(r, cid, uid);
          return;
        }
        const s = getPortalSession();
        const r = normalizePortalRole(s?.role);
        aplicarRole(r, s?.colaboradorId, s?.unidadeId);
      })
      .catch(() => {
        if (cancelled) return;
        const s = getPortalSession();
        const r = normalizePortalRole(s?.role);
        aplicarRole(r, s?.colaboradorId, s?.unidadeId);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Contador no link Inbox ajuda: some sozinho quando a API já não tem pendentes (respondidos saem da lista). */
  useEffect(() => {
    if (!podeVisualizarAjuda) {
      setPendenciasAjuda(0);
      return;
    }
    let cancel = false;
    const carregar = () => {
      pollSeAbaVisivel(() => {
        fetch(`/api/admin/ajuda-chat?somente_pendentes=1&resumo=1&_=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
          .then((r) => r.json())
          .then((data: { ok?: boolean; pendentes?: number }) => {
            if (cancel || !data.ok) return;
            setPendenciasAjuda(Math.max(0, Number(data.pendentes ?? 0)));
          })
          .catch(() => {});
      });
    };
    carregar();
    const timer = window.setInterval(carregar, POLL_AJUDA_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    window.addEventListener('focus', carregar);
    window.addEventListener(AJUDA_CHAT_ATUALIZADO, carregar);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', carregar);
      window.removeEventListener(AJUDA_CHAT_ATUALIZADO, carregar);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [podeVisualizarAjuda]);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          pode_visita_rh?: boolean;
          pode_avaliacao_equipe?: boolean;
          colaborador?: {
            id?: string;
            role?: string | null;
            setor?: string | null;
            cargo?: string | null;
            onboarding_completo?: boolean;
            onboarding_manual_escolhido_file?: string | null;
          };
        }) => {
          if (cancel) return;
          const roleApi = normalizePortalRole(data?.colaborador?.role ?? '');
          const cidApi = data?.colaborador && typeof data.colaborador === 'object' && 'id' in data.colaborador
            ? String((data.colaborador as { id?: string }).id ?? '')
            : '';
          if (data.ok && roleApi) {
            setPerfilRoleLocal(roleApi);
            if (cidApi) setColaboradorIdNav(cidApi);
            setPodeAdmin(podeAcessarAdminPortal(roleApi));
            setPodeGerenteAvaliador(roleApi === 'gerente' || roleApi === 'master');
            setPodeAvaliarEquipe(
              roleApi === 'gerente' ||
                roleApi === 'master' ||
                roleApi === 'admin' ||
                data.pode_avaliacao_equipe === true
            );
            setPodeVerMinhaLideranca(
              roleApi === 'gerente' || roleApi === 'master' || roleApi === 'admin'
            );
            setPodeVerDesempenho(roleApi === 'colaborador');
            setPodeAvaliarLideranca(roleApi === 'colaborador' || roleApi === 'admin' || roleApi === 'rh');
            setPodeRelatoriosAvaliacoes(podeVerRelatoriosAvaliacoesCompletos(roleApi));
            setPodeVisitaRh(data.pode_visita_rh === true);
            setPodeResponderAjuda(canResponderAjudaFinal(cidApi || undefined, roleApi));
            setPodeVisualizarAjuda(canVisualizarAjuda(roleApi, cidApi || undefined));
          }
          const c = data.colaborador;
          const escolhido = c?.onboarding_manual_escolhido_file?.trim();
          const porSetor = manualPorSetor(c?.setor, c?.role, c?.cargo);
          let file: string | null = null;
          if (data.ok && c?.onboarding_completo && escolhido) {
            file = escolhido;
          } else if (porSetor?.file) {
            file = porSetor.file;
          }
          setMostrarMeuManual(Boolean(data.ok && file));
        }
      )
      .catch(() => {
        if (!cancel) setMostrarMeuManual(false);
      });
    return () => {
      cancel = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMaisAberto(false);
  }, [pathname]);

  const manualNav: NavItem[] = mostrarMeuManual
    ? [{ href: '/portal/meu-manual', label: 'Meu manual', short: 'Manual', icon: 'meu-manual' }]
    : [];

  const isAdm = roleNav === 'admin' || roleNav === 'socio';
  const isLider = roleNav === 'gerente' || roleNav === 'master';
  const naAbaGraos = navAtivo(pathname, '/portal/graos');

  const itemGraos: NavItem = {
    href: '/portal/graos',
    label: 'Grãos de café',
    short: 'Grãos',
    icon: 'graos',
  };

  const injetarGraos = (items: NavItem[]): NavItem[] => {
    if (!mostrarGraosNav || items.some((i) => i.href === '/portal/graos')) return items;
    const idx = items.findIndex((i) => i.href === '/portal');
    const at = idx >= 0 ? idx + 1 : 0;
    return [...items.slice(0, at), itemGraos, ...items.slice(at)];
  };

  const injetarTreinamento = (items: NavItem[]): NavItem[] => {
    if (items.some((i) => i.href === '/portal/treinamento')) return items;
    const idxInicio = items.findIndex((i) => i.href === '/portal');
    const idxComunicacao = items.findIndex((i) => i.href === '/portal/comunicacao');
    const at =
      isAdm && idxInicio >= 0
        ? idxInicio + 1
        : idxComunicacao >= 0
          ? idxComunicacao + 1
          : items.length;
    return [...items.slice(0, at), itemTreinamento, ...items.slice(at)];
  };

  const navMobile: NavItem[] = injetarTreinamento(injetarGraos(
    isAdm
    ? [
        { href: '/portal', label: 'Início', short: 'Início', icon: 'mural' },
        ...(roleNav === 'admin' && podeAvaliarEquipe
          ? [{ href: '/portal/avaliacao-master', label: 'Avaliação da equipe', short: 'Avaliar', icon: 'avaliacao' as const }]
          : []),
        { href: '/portal/mural', label: 'Mural', short: 'Mural', icon: 'mural' },
        itemAniversariantes,
        itemComunicacao,
        { href: '/portal/perfil', label: 'Meu perfil', short: 'Perfil', icon: 'perfil' },
      ]
    : isLider
      ? [
          { href: '/portal', label: 'Início', short: 'Início', icon: 'mural' },
          ...(podeAvaliarEquipe
            ? [{ href: '/portal/avaliacao-master', label: 'Avaliação da equipe', short: 'Avaliar', icon: 'avaliacao' as const }]
            : []),
          ...(podeGerenteAvaliador
            ? [{ href: '/portal/gerente-equipe', label: 'Equipe no mês', short: 'Equipe', icon: 'desempenho' as const }]
            : []),
          { href: '/portal/escala', label: 'Minha escala', short: 'Escala', icon: 'escala' },
          { href: '/portal/mural', label: 'Mural', short: 'Mural', icon: 'mural' },
          itemAniversariantes,
          itemComunicacao,
          { href: '/portal/perfil', label: 'Meu perfil', short: 'Perfil', icon: 'perfil' },
        ]
      : [
          { href: '/portal', label: 'Início', short: 'Início', icon: 'mural' },
          ...manualNav,
          { href: '/portal/escala', label: 'Minha escala', short: 'Escala', icon: 'escala' },
          ...(podeVerDesempenho
            ? [{ href: '/portal/desempenho', label: 'Desempenho', short: 'Desempenho', icon: 'desempenho' as const }]
            : []),
          { href: '/portal/mural', label: 'Mural', short: 'Mural', icon: 'mural' },
          itemAniversariantes,
          itemComunicacao,
          { href: '/portal/perfil', label: 'Meu perfil', short: 'Perfil', icon: 'perfil' },
        ]
  ));

  const navDesktop: NavItem[] = dedupeNavPorHref([
    ...navMobile.filter((i) => i.href !== '/portal/perfil' && i.href !== '/portal/comunicacao'),
    itemComunicacao,
    { href: '/portal/manuais', label: 'Manuais', short: 'Manuais', icon: 'manuais' },
    { href: '/portal/perfil', label: 'Meu perfil', short: 'Perfil', icon: 'perfil' },
  ]);

  const handleSair = () => {
    if (typeof window !== 'undefined' && !window.confirm('Deseja sair do portal?')) {
      return;
    }
    clearPortalSession();
    router.push('/login');
  };

  const iconePorHref: Record<string, string> = Object.fromEntries(
    [...navMobile, ...navDesktop].map((item) => [item.href, item.icon])
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-cream-100/95 backdrop-blur border-b border-cafeteria-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/portal" className="font-display text-xl text-cafeteria-800 font-semibold shrink-0">
            Cafeteria Gabi Fontes
          </Link>
          <nav className="hidden md:flex gap-6 text-cafeteria-700 items-center">
            {navDesktop.map(({ href, label }) => {
              const ativo = navAtivo(pathname, href);
              const alertaAjuda =
                href === '/portal/comunicacao' && podeVisualizarAjuda && pendenciasAjuda > 0;
              const alertaSugestoes =
                href === '/portal/comunicacao' && podeContadorSugestoes && sugestoesPendentes > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative hover:text-cafeteria-900 ${ativo ? 'font-semibold text-cafeteria-800' : ''}`}
                >
                  {label}
                  {alertaSugestoes && (
                    <span
                      className="ml-1.5 inline-flex min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-coffee-base text-xs font-bold items-center justify-center align-middle"
                      title={`${sugestoesPendentes} sugestão(ões) aguardando análise`}
                    >
                      {sugestoesPendentes > 99 ? '99+' : sugestoesPendentes}
                    </span>
                  )}
                  {alertaAjuda && (
                    <span className="ml-1.5 inline-flex min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold items-center justify-center align-middle animate-pulse">
                      {pendenciasAjuda > 99 ? '99+' : pendenciasAjuda}
                    </span>
                  )}
                </Link>
              );
            })}
            {podeVerPendenciasSemanaRede(roleNav) && (
              <Link
                href="/portal/pendencias-semana"
                className={`relative hover:text-cafeteria-900 ${
                  navAtivo(pathname, '/portal/pendencias-semana') ? 'font-semibold text-cafeteria-800' : ''
                }`}
              >
                Pendências
                {pendenciasSemana > 0 && (
                  <span
                    className={`ml-1.5 inline-flex min-w-[20px] h-5 px-1 rounded-full text-white text-xs font-bold items-center justify-center align-middle ${
                      pendenciasSemanaCriticas ? 'bg-red-600 animate-pulse' : 'bg-orange-500'
                    }`}
                    title={
                      pendenciasSemanaCriticas
                        ? `${pendenciasSemana} pendência(s) — alerta crítico de sexta`
                        : `${pendenciasSemana} pendência(s) na semana`
                    }
                  >
                    {pendenciasSemana > 99 ? '99+' : pendenciasSemana}
                  </span>
                )}
              </Link>
            )}
            {podeAdmin && (
              <Link
                href="/admin/dashboard"
                className="relative text-dourado-base font-medium hover:text-dourado-600"
              >
                Admin
                {sugestoesPendentes > 0 && podeContadorSugestoes && (
                  <span className="ml-1.5 inline-flex min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-coffee-base text-xs font-bold items-center justify-center align-middle">
                    {sugestoesPendentes > 99 ? '99+' : sugestoesPendentes}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={handleSair}
              className="text-cafeteria-600 hover:text-cafeteria-900 text-sm font-medium"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      {/* Nav inferior no mobile — 4 fixos + Mais (resto, Admin e Sair na gaveta) */}
      {(() => {
        const primarios = navMobile.slice(0, 4);
        const extras = dedupeNavPorHref(navMobile.slice(4));
        const extraTemAlerta =
          extras.some((i) => i.href === '/portal/comunicacao') &&
          ((podeContadorSugestoes && sugestoesPendentes > 0) || (podeVisualizarAjuda && pendenciasAjuda > 0));
        const maisAtivo =
          extras.some((i) => navAtivo(pathname, i.href)) || (pathname?.startsWith('/admin') ?? false);

        const itemClasse = (ativo: boolean) =>
          `flex flex-col items-center justify-center py-2.5 px-1 flex-1 min-w-0 min-h-[54px] ${
            ativo ? 'text-dourado-base font-medium' : 'text-cafeteria-600'
          }`;

        return (
          <>
            {maisAberto && (
              <div
                className="md:hidden fixed inset-0 z-[60] bg-coffee-base/40 backdrop-blur-[1px]"
                onClick={() => setMaisAberto(false)}
                aria-hidden
              />
            )}

            {maisAberto && (
              <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl bg-white border-t border-cafeteria-200 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] max-h-[75vh] overflow-y-auto"
                role="dialog"
                aria-label="Mais opções"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 pt-3 pb-2">
                  <span className="mx-auto h-1.5 w-10 rounded-full bg-cafeteria-200" aria-hidden />
                </div>
                <div className="flex items-center justify-between px-5 pb-2">
                  <h2 className="text-base font-display font-semibold text-cafeteria-900">Mais opções</h2>
                  <button
                    type="button"
                    onClick={() => setMaisAberto(false)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-cafeteria-600 hover:bg-cream-100 min-h-[40px]"
                  >
                    Fechar
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-2 px-4 pt-1 list-none m-0">
                  {extras.map(({ href, label }) => {
                    const ativo = navAtivo(pathname, href);
                    const iconKey = iconePorHref[href] ?? 'mural';
                    const alertaAjuda = href === '/portal/comunicacao' && podeVisualizarAjuda && pendenciasAjuda > 0;
                    const alertaSugestoes =
                      href === '/portal/comunicacao' && podeContadorSugestoes && sugestoesPendentes > 0;
                    const badgeGraos =
                      href === '/portal/graos' &&
                      !naAbaGraos &&
                      graosSaldo != null &&
                      graosSaldo > 0;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setMaisAberto(false)}
                          aria-current={ativo ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-3 min-h-[56px] ${
                            ativo
                              ? 'border-dourado-base bg-dourado-50/70 text-cafeteria-900'
                              : 'border-cafeteria-200 bg-white text-cafeteria-700'
                          }`}
                        >
                          <span className="relative shrink-0 text-cafeteria-600">
                            <NavIcon type={iconKey} />
                            {(badgeGraos || alertaSugestoes || alertaAjuda) && (
                              <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-terracota-500" />
                            )}
                          </span>
                          <span className="text-sm font-medium leading-tight">{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {podeAdmin && (
                    <li>
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMaisAberto(false)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 min-h-[56px] ${
                          pathname?.startsWith('/admin')
                            ? 'border-dourado-base bg-dourado-50/70'
                            : 'border-dourado-base/40 bg-dourado-50/40'
                        }`}
                      >
                        <span className="relative shrink-0 text-dourado-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {sugestoesPendentes > 0 && podeContadorSugestoes && (
                            <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-terracota-500" />
                          )}
                        </span>
                        <span className="text-sm font-semibold text-dourado-500 leading-tight">Admin</span>
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={handleSair}
                      className="w-full flex items-center gap-3 rounded-xl border border-cafeteria-200 bg-white px-3 py-3 min-h-[56px] text-cafeteria-700"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-sm font-medium leading-tight">Sair</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            <nav
              className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-cafeteria-200 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] ${maisAberto ? 'pointer-events-none opacity-0' : ''}`}
              aria-label="Navegação principal"
              aria-hidden={maisAberto}
            >
              <div className="flex">
                {primarios.map(({ href, label, short }) => {
                  const ativo = navAtivo(pathname, href);
                  const iconKey = iconePorHref[href] ?? 'mural';
                  const alertaAjuda = href === '/portal/comunicacao' && podeVisualizarAjuda && pendenciasAjuda > 0;
                  const alertaSugestoes =
                    href === '/portal/comunicacao' && podeContadorSugestoes && sugestoesPendentes > 0;
                  const badgeGraos =
                    href === '/portal/graos' &&
                    !naAbaGraos &&
                    graosSaldo != null &&
                    graosSaldo > 0;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={ativo ? 'page' : undefined}
                      aria-label={
                        alertaSugestoes
                          ? `${label}: ${sugestoesPendentes} sugestão(ões) aguardando análise`
                          : alertaAjuda
                            ? `${label}: ${pendenciasAjuda} sem resposta`
                            : label
                      }
                      className={itemClasse(ativo)}
                    >
                      <span className="relative">
                        <NavIcon type={iconKey} />
                        {badgeGraos && (
                          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {graosSaldo > 99 ? '99+' : graosSaldo}
                          </span>
                        )}
                        {alertaSugestoes && (
                          <span className="absolute -top-2 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-coffee-base text-[10px] font-bold flex items-center justify-center">
                            {sugestoesPendentes > 9 ? '9+' : sugestoesPendentes}
                          </span>
                        )}
                        {alertaAjuda && (
                          <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                            {pendenciasAjuda > 9 ? '9+' : pendenciasAjuda}
                          </span>
                        )}
                      </span>
                      <span className="text-[12px] mt-1 max-w-[76px] text-center leading-tight whitespace-normal">
                        {short}
                      </span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMaisAberto((v) => !v)}
                  aria-expanded={maisAberto}
                  aria-label="Mais opções"
                  className={itemClasse(maisAtivo)}
                >
                  <span className="relative">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {extraTemAlerta && (
                      <span className="absolute -top-1.5 -right-2 h-2.5 w-2.5 rounded-full bg-terracota-500" />
                    )}
                  </span>
                  <span className="text-[12px] mt-1 text-center leading-tight">Mais</span>
                </button>
              </div>
            </nav>
          </>
        );
      })()}
    </>
  );
}
