'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const HERO_XICARA = '/portal/xicara-hero.png';

export function PortalBoasVindas() {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; colaborador?: { nome?: string } }) => {
        if (cancel || !d.ok || !d.colaborador?.nome) return;
        const primeiro = String(d.colaborador.nome).trim().split(/\s+/)[0];
        if (primeiro) setNome(primeiro);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  if (!nome) return null;

  return (
    <section className="rounded-2xl border border-cafeteria-200/60 bg-gradient-to-br from-white via-cream-50/90 to-white shadow-sm overflow-hidden relative min-h-[5.5rem] sm:min-h-[6.5rem]">
      {/* Foto integrada à direita: máscara + degradê na mesma cor do card */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[min(52%,11.5rem)] sm:w-[min(48%,13rem)]"
        aria-hidden
      >
        <Image
          src={HERO_XICARA}
          alt=""
          fill
          sizes="(max-width: 640px) 184px, 208px"
          className="hero-xicara-mask object-cover object-[58%_42%] brightness-[1.04] contrast-[0.94] saturate-[0.88]"
          priority
        />
        <div className="hero-xicara-fade absolute inset-0" />
      </div>

      <div className="relative z-[1] p-5 sm:p-6 pr-[38%] sm:pr-[42%]">
        <h1 className="font-display text-xl sm:text-2xl text-cafeteria-900">
          Bom te ver aqui, {nome}!
        </h1>
        <p className="text-sm text-cafeteria-600 mt-1 leading-relaxed max-w-md">
          Seu portal de reconhecimento, comunicação e rotina da semana.
        </p>
      </div>
    </section>
  );
}
