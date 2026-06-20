'use client';

import { useEffect, useRef, useState } from 'react';
import type { PortalHomeResumo } from '@/lib/portal-home-types';
import { MinhaSituacaoHome } from '@/components/portal/home/MinhaSituacaoHome';
import { MeuPainelHome } from '@/components/portal/home/MeuPainelHome';
import { FacaAgoraHome } from '@/components/portal/FacaAgoraHome';

export function PortalHomeEntrada() {
  const [dados, setDados] = useState<PortalHomeResumo | null>(null);
  const [erro, setErro] = useState(false);
  const facaAgoraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/home-resumo', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: PortalHomeResumo & { ok?: boolean }) => {
        if (cancel) return;
        if (d.ok) setDados(d);
        else setErro(true);
      })
      .catch(() => {
        if (!cancel) setErro(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const scrollParaFacaAgora = () => {
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
      <section className="rounded-2xl border border-cafeteria-200 bg-white/80 p-5 animate-pulse">
        <div className="h-10 bg-cream-200 rounded-lg mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-cream-200 rounded-xl" />
          <div className="h-24 bg-cream-200 rounded-xl" />
          <div className="h-24 bg-cream-200 rounded-xl" />
          <div className="h-24 bg-cream-200 rounded-xl" />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <MinhaSituacaoHome situacao={dados.situacao} onVerPendencias={scrollParaFacaAgora} />

      {dados.painel ? <MeuPainelHome painel={dados.painel} /> : null}

      <div ref={facaAgoraRef}>
        <FacaAgoraHome tarefasExternas={dados.tarefas} />
      </div>
    </div>
  );
}
