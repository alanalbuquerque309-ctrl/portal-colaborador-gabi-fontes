'use client';

import { useEffect, useRef, useState } from 'react';
import type { PortalHomeResumo } from '@/lib/portal-home-types';
import { MinhaSituacaoHome } from '@/components/portal/home/MinhaSituacaoHome';
import { MeuPainelHome } from '@/components/portal/home/MeuPainelHome';
import { PainelLiderHome } from '@/components/portal/home/PainelLiderHome';
import { FacaAgoraHome } from '@/components/portal/FacaAgoraHome';
import { PORTAL_HOME_ATUALIZADO } from '@/lib/portal-home-events';
import { LogoCarregando } from '@/components/ui/LogoCarregando';

export function PortalHomeEntrada() {
  const [dados, setDados] = useState<PortalHomeResumo | null>(null);
  const [erro, setErro] = useState(false);
  const facaAgoraRef = useRef<HTMLDivElement>(null);

  const carregarResumo = () => {
    fetch('/api/portal/home-resumo', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: PortalHomeResumo & { ok?: boolean }) => {
        if (d.ok) setDados(d);
        else setErro(true);
      })
      .catch(() => setErro(true));
  };

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
        <LogoCarregando size="sm" revelarCor label="Preparando sua home…" />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <MinhaSituacaoHome situacao={dados.situacao} onVerPendencias={scrollParaFacaAgora} />

      {dados.painel ? <MeuPainelHome painel={dados.painel} /> : null}
      {dados.painel_lider ? <PainelLiderHome painel={dados.painel_lider} /> : null}

      <div ref={facaAgoraRef}>
        <FacaAgoraHome tarefasExternas={dados.tarefas} />
      </div>
    </div>
  );
}
