'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  Crown,
  GlassWater,
  Package,
  Sparkles,
  UserCircle,
} from 'lucide-react';

const MANUAL_BASE = '/manuais';

function manualHref(filename: string) {
  return `${MANUAL_BASE}/${encodeURIComponent(filename)}`;
}

const manuals = [
  {
    title: 'Cultura e conduta',
    description: 'Identidade, postura e ética que unem todas as unidades Gabi Fontes.',
    file: 'Manual do colaborador (Geral).html',
    icon: BookOpen,
  },
  {
    title: 'Atendentes',
    description: 'A arte de receber: salão, cardápio e experiência memorável.',
    file: 'Manual do Atendimento.html',
    icon: UserCircle,
  },
  {
    title: 'Cozinha',
    description: 'Excelência na produção, segurança alimentar e padrão em cada prato.',
    file: 'Manual do Auxiliar de Cozinha.html',
    icon: ChefHat,
  },
  {
    title: 'Estoque',
    description: 'Controle de insumos e rotinas de armazenamento — documento em elaboração.',
    file: null as string | null,
    icon: Package,
    soon: true,
  },
  {
    title: 'ADM / RH',
    description: 'Sustentação administrativa, pessoas, processos e financeiro.',
    file: 'Manual do ADM e RH.html',
    icon: BriefcaseBusiness,
  },
  {
    title: 'ASG',
    description: 'Ambiente seguro e acolhedor: limpeza, higiene e primeira impressão.',
    file: 'Manual do ASG.html',
    icon: Sparkles,
  },
  {
    title: 'Copa',
    description: 'Organização da copa, apoio ao salão e padrão de atendimento.',
    file: 'Manual da Copa.html',
    icon: GlassWater,
  },
  {
    title: 'Liderança e gestão',
    description: 'Visão de loja, equipe e resultados para quem conduz a operação.',
    file: 'Manual do Gerente.html',
    icon: Crown,
  },
] as const;

export function ManuaisInlineSection() {
  const [aberto, setAberto] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const abrir = useCallback((key: string) => {
    setAberto((prev) => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const t = window.setTimeout(() => {
      viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [aberto]);

  return (
    <>
      <section aria-labelledby="manuais-heading">
        <h2 id="manuais-heading" className="font-display text-2xl text-portal-ink sm:text-3xl">
          Manuais por função
        </h2>
        <p className="mt-2 text-sm text-portal-inkMuted sm:text-base">
          Toque ou clique no card para abrir o manual abaixo na mesma página.
        </p>

        <ul className="mt-8 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {manuals.map((item) => {
            const Icon = item.icon;
            const key = item.title;
            const inner = (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 text-portal-ink shadow-sm ring-1 ring-portal-rose/50 transition-colors duration-300 group-hover:bg-portal-roseHover/80 group-hover:ring-portal-rose">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="mt-4 block font-display text-lg leading-snug text-portal-ink">
                  {item.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-portal-inkMuted">
                  {item.description}
                </span>
                {'soon' in item && item.soon ? (
                  <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-portal-inkMuted ring-1 ring-portal-rose/60">
                    Em breve
                  </span>
                ) : null}
              </>
            );

            if (item.file) {
              const ativo = aberto === key;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => abrir(key)}
                    aria-expanded={ativo}
                    className="group flex min-h-[160px] w-full flex-col rounded-2xl border border-black/[0.06] bg-white/70 p-5 text-left shadow-sm outline-none transition-all duration-300 hover:scale-[1.02] hover:border-portal-rose/50 hover:bg-portal-roseHover/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-portal-ink/20 active:scale-[0.99] sm:min-h-[180px] sm:p-6"
                  >
                    {inner}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.title}>
                <div
                  className="flex min-h-[160px] flex-col rounded-2xl border border-dashed border-portal-rose/60 bg-white/40 p-5 opacity-90 sm:min-h-[180px] sm:p-6"
                  aria-disabled
                >
                  {inner}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div ref={viewerRef} className="scroll-mt-24">
        {aberto &&
          (() => {
            const item = manuals.find((m) => m.title === aberto);
            const file = item && 'file' in item && item.file ? item.file : null;
            if (!file) return null;
            return (
              <section
                className="mt-10 rounded-2xl border border-black/[0.08] bg-white/80 shadow-[0_12px_40px_rgba(75,54,33,0.08)] overflow-hidden"
                aria-label={`Manual: ${aberto}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-portal-bg/90 px-4 py-3">
                  <p className="font-display text-lg text-portal-ink">{aberto}</p>
                  <button
                    type="button"
                    onClick={() => setAberto(null)}
                    className="text-sm font-medium text-portal-inkMuted hover:text-portal-ink"
                  >
                    Fechar
                  </button>
                </div>
                <iframe
                  title={aberto}
                  src={manualHref(file)}
                  className="h-[min(85vh,900px)] w-full bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </section>
            );
          })()}
      </div>
    </>
  );
}
