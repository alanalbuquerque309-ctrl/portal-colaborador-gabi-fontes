'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getPortalSession, clearPortalSession } from '@/lib/utils/session';

const navItensBase = [
  { href: '/portal/mural', label: 'Mural', short: 'Mural', icon: 'mural' as const },
  { href: '/portal/aniversariantes', label: 'Mural da Família', short: 'Família', icon: 'familia' as const },
  { href: '/portal/escala', label: 'Minha escala', short: 'Escala', icon: 'escala' as const },
  { href: '/portal/sugestoes', label: 'Sugestões', short: 'Sugestões', icon: 'sugestoes' as const },
  { href: '/portal/manuais', label: 'Manuais', short: 'Manuais', icon: 'manuais' as const },
  { href: '/portal/perfil', label: 'Meu perfil', short: 'Perfil', icon: 'perfil' as const },
];

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
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      );
    case 'perfil':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'manuais':
      return (
        <svg className={base} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
    default:
      return null;
  }
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [podeAdmin, setPodeAdmin] = useState(false);
  const [podeGerenteAvaliador, setPodeGerenteAvaliador] = useState(false);
  const [podeVerDesempenho, setPodeVerDesempenho] = useState(false);
  const [podeRelatoriosAvaliacoes, setPodeRelatoriosAvaliacoes] = useState(false);
  useEffect(() => {
    const s = getPortalSession();
    const r = (s?.role || '').toLowerCase();
    setPodeAdmin(r === 'socio' || r === 'admin');
    setPodeGerenteAvaliador(r === 'gerente' || r === 'master');
    setPodeVerDesempenho(r === 'colaborador');
    setPodeRelatoriosAvaliacoes(r === 'socio');
  }, []);

  const navItens = [
    ...navItensBase,
    ...(podeGerenteAvaliador
      ? [
          {
            href: '/portal/avaliacao-master' as const,
            label: 'Avaliação da equipe',
            short: 'Avaliação',
            icon: 'avaliacao' as const,
          },
          {
            href: '/portal/gerente-equipe' as const,
            label: 'Equipe no mês',
            short: 'Equipe',
            icon: 'desempenho' as const,
          },
        ]
      : []),
    ...(podeVerDesempenho
      ? [
          {
            href: '/portal/desempenho' as const,
            label: 'Desempenho',
            short: 'Desempenho',
            icon: 'desempenho' as const,
          },
          {
            href: '/portal/avaliacao-lideranca' as const,
            label: 'Avaliar liderança',
            short: 'Líder',
            icon: 'avaliacao' as const,
          },
        ]
      : []),
    ...(podeRelatoriosAvaliacoes
      ? [
          {
            href: '/portal/relatorios-avaliacoes' as const,
            label: 'Relatórios avaliações',
            short: 'Relatórios',
            icon: 'avaliacao' as const,
          },
        ]
      : []),
  ];

  const handleSair = () => {
    if (typeof window !== 'undefined' && !window.confirm('Deseja sair do portal?')) {
      return;
    }
    clearPortalSession();
    router.push('/login');
  };

  const iconePorHref: Record<string, string> = Object.fromEntries(
    navItens.map((item) => [item.href, item.icon])
  );

  return (
    <>
      <header className="bg-cream-100/80 backdrop-blur border-b border-cafeteria-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/portal" className="font-display text-xl text-cafeteria-800 font-semibold shrink-0">
            Cafeteria Gabi Fontes
          </Link>
          <nav className="hidden md:flex gap-6 text-cafeteria-700 items-center">
            {navItens.map(({ href, label }) => {
              const ativo = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`hover:text-cafeteria-900 ${ativo ? 'font-semibold text-cafeteria-800' : ''}`}
                >
                  {label}
                </Link>
              );
            })}
            {podeAdmin && (
              <Link
                href="/admin/dashboard"
                className="text-dourado-base font-medium hover:text-dourado-600"
              >
                Admin
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
      {/* Nav inferior no mobile — flex com scroll para garantir que Perfil sempre apareça */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cafeteria-200 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        aria-label="Navegação principal"
      >
        <div className="flex overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
          {navItens.map(({ href, label, short }) => {
            const ativo = pathname === href || pathname.startsWith(href + '/');
            const iconKey = iconePorHref[href] ?? 'mural';
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                aria-label={label}
                className={`flex flex-col items-center justify-center py-3 flex-1 min-w-[52px] shrink-0 min-h-[48px] ${
                  ativo ? 'text-dourado-base font-medium' : 'text-cafeteria-600'
                }`}
              >
                <NavIcon type={iconKey} />
                <span className="text-[10px] mt-0.5 truncate max-w-full text-center">{short}</span>
              </Link>
            );
          })}
          {podeAdmin && (
            <Link
              href="/admin/dashboard"
              aria-label="Área administrativa"
              className={`flex flex-col items-center justify-center py-3 flex-1 min-w-[52px] shrink-0 min-h-[48px] ${
                pathname?.startsWith('/admin') ? 'text-dourado-base font-medium' : 'text-cafeteria-600'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] mt-0.5 truncate max-w-full text-center">Admin</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleSair}
            aria-label="Sair do portal"
            className="flex flex-col items-center justify-center py-3 flex-1 min-w-[52px] shrink-0 min-h-[48px] text-cafeteria-600"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] mt-0.5 truncate max-w-full text-center">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
