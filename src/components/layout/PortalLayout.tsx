'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from './Header';
import { BotaoAjuda } from '@/components/ajuda/BotaoAjuda';
import { clearPortalSession, isPendingRegistration } from '@/lib/utils/session';
import { CompleteRegistrationForm } from '@/components/portal/CompleteRegistrationForm';
import { normalizePortalRole } from '@/lib/roles';
import { ManualEventosToast } from '@/components/notificacoes/ManualEventosToast';

const EMOCOES: { id: string; label: string; emoji: string; desc: string }[] = [
  { id: 'feliz', label: 'Feliz', emoji: '😊', desc: 'Ótimo dia!' },
  { id: 'tranquilo', label: 'Tranquilo', emoji: '😌', desc: 'Tudo bem' },
  { id: 'neutro', label: 'Neutro', emoji: '😐', desc: 'Sem novidades' },
  { id: 'cansado', label: 'Cansado', emoji: '😓', desc: 'Preciso de um respiro' },
  { id: 'frustrado', label: 'Frustrado', emoji: '😔', desc: 'Não está fácil' },
];

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
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
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
        const role = normalizePortalRole(d?.colaborador?.role ?? 'colaborador');
        setPerfilRole(role);
        if (d.ok && role === 'colaborador') {
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
      <main className="max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
        {children}
      </main>
      <BotaoAjuda />
      <ManualEventosToast />
      {perfilRole === 'colaborador' && abrirEmocionalObrigatorio && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-dourado-200 bg-white p-5 shadow-2xl">
            <h2 className="font-display text-xl text-coffee-base font-semibold">Termômetro de emoções</h2>
            <p className="text-sm text-coffee-100 mt-1">
              Primeiro acesso do dia: selecione como você está se sentindo para continuar no portal.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EMOCOES.map((e) => (
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
