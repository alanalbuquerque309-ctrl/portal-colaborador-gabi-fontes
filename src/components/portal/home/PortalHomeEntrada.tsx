'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PainelLider, PortalHomePainel, PortalHomeResumo, PortalHomeTarefa } from '@/lib/portal-home-types';
import { MinhaSituacaoHome } from '@/components/portal/home/MinhaSituacaoHome';
import { MeuPainelHome } from '@/components/portal/home/MeuPainelHome';
import { PainelLiderHome } from '@/components/portal/home/PainelLiderHome';
import { FacaAgoraHome } from '@/components/portal/FacaAgoraHome';
import { PORTAL_HOME_ATUALIZADO } from '@/lib/portal-home-events';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

function PendenciasDrawer({
  tarefas,
  aberto,
  onFechar,
}: {
  tarefas: PortalHomeTarefa[];
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!aberto) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-coffee-base/40 backdrop-blur-[1px]" onClick={onFechar} aria-hidden />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white border-t border-cafeteria-200 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-label="Pendências"
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1.5 w-10 rounded-full bg-cafeteria-200" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-base font-display font-semibold text-cafeteria-900">
            O que fazer agora{tarefas.length > 0 ? ` (${tarefas.length})` : ''}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-cafeteria-600 hover:bg-cream-100 min-h-[40px]"
          >
            Fechar
          </button>
        </div>
        {tarefas.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-cafeteria-600">Tudo em dia. Nada pendente agora. 🎉</p>
        ) : (
          <ul className="px-4 pb-4 space-y-2.5 list-none m-0">
            {tarefas.map((t) => (
              <li key={t.id}>
                <Link
                  href={t.href}
                  onClick={onFechar}
                  className={`block rounded-xl border px-4 py-3.5 min-h-[56px] transition-colors ${
                    t.urgente
                      ? 'border-terracota-300 bg-terracota-50/70 hover:bg-terracota-50'
                      : 'border-cafeteria-200 bg-white hover:border-dourado-base'
                  }`}
                >
                  <p className="text-base font-semibold text-cafeteria-900 leading-snug">{t.titulo}</p>
                  <p className="text-sm text-cafeteria-600 mt-0.5">{t.detalhe}</p>
                  <span className="inline-block mt-2 text-sm font-semibold text-portal-action">
                    {t.acaoLabel ?? 'Resolver agora →'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function PortalHomeEntrada() {
  const [dados, setDados] = useState<PortalHomeResumo | null>(null);
  const [erro, setErro] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [carregandoPainel, setCarregandoPainel] = useState(false);
  const facaAgoraRef = useRef<HTMLDivElement>(null);

  const carregarPainel = () => {
    setCarregandoPainel(true);
    fetch('/api/portal/home-painel', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then(
        (p: {
          ok?: boolean;
          is_lider?: boolean;
          painel?: PortalHomePainel | null;
          painel_lider?: PainelLider | null;
        }) => {
          if (!p.ok) return;
          setDados((prev) =>
            prev
              ? {
                  ...prev,
                  is_lider: p.is_lider === true,
                  painel: p.painel ?? null,
                  painel_lider: p.painel_lider ?? null,
                  painel_pendente: false,
                }
              : prev
          );
        }
      )
      .catch(() => {})
      .finally(() => setCarregandoPainel(false));
  };

  const carregarResumo = () => {
    fetch('/api/portal/home-resumo', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: PortalHomeResumo & { ok?: boolean }) => {
        if (d.ok) {
          setDados(d);
          if (d.painel_pendente) carregarPainel();
        } else setErro(true);
      })
      .catch(() => setErro(true));
  };

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/home-resumo', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: PortalHomeResumo & { ok?: boolean }) => {
        if (cancel) return;
        if (d.ok) {
          setDados(d);
          if (d.painel_pendente) carregarPainel();
        } else setErro(true);
      })
      .catch(() => {
        if (!cancel) setErro(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const atualizar = () => carregarResumo();
    window.addEventListener(PORTAL_HOME_ATUALIZADO, atualizar);
    return () => window.removeEventListener(PORTAL_HOME_ATUALIZADO, atualizar);
  }, []);

  const scrollParaFacaAgora = () => {
    const temComunicado = dados?.tarefas.some((t) => t.id === 'comunicados-confirmacao');
    if (temComunicado) {
      document.getElementById('comunicados-home')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    facaAgoraRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (erro) {
    return (
      <>
        <FacaAgoraHome />
      </>
    );
  }

  if (!dados) {
    return (
      <section className="rounded-2xl border border-cafeteria-200 bg-white/80 p-8 flex justify-center">
        <XicaraCarregando size="md" label="Preparando sua home…" />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <MinhaSituacaoHome
        situacao={dados.situacao}
        onVerPendencias={dados.tarefas.length > 0 ? () => setDrawerAberto(true) : scrollParaFacaAgora}
      />

      {dados.painel ? <MeuPainelHome painel={dados.painel} /> : null}
      {dados.painel_lider ? <PainelLiderHome painel={dados.painel_lider} /> : null}
      {carregandoPainel && !dados.painel && !dados.painel_lider ? (
        <div className="flex justify-center py-4">
          <XicaraCarregando size="sm" label="Carregando seu painel…" />
        </div>
      ) : null}

      <div ref={facaAgoraRef}>
        <FacaAgoraHome tarefasExternas={dados.tarefas} />
      </div>

      <PendenciasDrawer
        tarefas={dados.tarefas}
        aberto={drawerAberto}
        onFechar={() => setDrawerAberto(false)}
      />
    </div>
  );
}
