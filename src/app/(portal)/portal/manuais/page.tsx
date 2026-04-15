'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MANUAL_GERAL_COLABORADOR, hrefManual, manualPorSetor } from '@/lib/manual-por-setor';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type ManualCard = { titulo: string; file: string; destaque?: string };

export default function PortalManuaisPage() {
  const [perfil, setPerfil] = useState<{ setor: string | null; role: string | null } | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { setor?: string | null; role?: string | null } }) => {
        if (cancel) return;
        if (data.ok && data.colaborador) {
          setPerfil({
            setor: data.colaborador.setor ?? null,
            role: data.colaborador.role ?? null,
          });
        } else {
          setPerfil({ setor: null, role: null });
        }
      })
      .catch(() => {
        if (!cancel) setPerfil({ setor: null, role: null });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const cards = useMemo((): ManualCard[] => {
    const list: ManualCard[] = [
      {
        titulo: MANUAL_GERAL_COLABORADOR.titulo,
        file: MANUAL_GERAL_COLABORADOR.file,
        destaque: 'Obrigatório no primeiro acesso (onboarding).',
      },
    ];
    if (!perfil) return list;
    const esp = manualPorSetor(perfil.setor, perfil.role);
    if (esp && esp.file !== MANUAL_GERAL_COLABORADOR.file) {
      list.push({
        titulo: esp.titulo,
        file: esp.file,
        destaque: 'Manual do seu perfil (setor/função).',
      });
    }
    return list;
  }, [perfil]);

  if (perfil === null) {
    return (
      <div className="flex justify-center py-16">
        <XicaraCarregando size="lg" label="Carregando manuais…" />
      </div>
    );
  }

  return (
    <main className="max-w-3xl space-y-6 pb-24">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">Manuais</h1>
        <p className="text-cafeteria-600 mt-2 text-sm">
          Abra o manual no navegador (recomendado no telemóvel). O conteúdo é o mesmo usado no onboarding.
        </p>
      </div>

      <ul className="space-y-4">
        {cards.map((c) => {
          const href = hrefManual(c.file);
          return (
            <li
              key={c.file}
              className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-display font-semibold text-cafeteria-900 text-lg">{c.titulo}</h2>
              {c.destaque && <p className="text-sm text-cafeteria-600 mt-1">{c.destaque}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400"
                >
                  Abrir manual
                </a>
                <Link
                  href={href}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-cafeteria-200 px-5 py-2.5 text-sm font-medium text-cafeteria-800 hover:bg-cream-50"
                >
                  Ver na mesma aba
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
