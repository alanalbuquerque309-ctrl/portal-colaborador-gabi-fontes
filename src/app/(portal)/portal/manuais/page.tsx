'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MANUAL_GERAL_COLABORADOR, hrefManual, manualPorSetor } from '@/lib/manual-por-setor';
import { MANUAIS_SETORIAIS_BIBLIOTECA } from '@/lib/manuais-biblioteca-portal';
import { VIDEO_BOAS_VINDAS_TITULO } from '@/lib/video-boas-vindas';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type ManualCard = { titulo: string; file: string; destaque?: string };
const MANUAIS_GARANTIDOS: ManualCard[] = [
  { titulo: 'Manual de estoque', file: 'Manual do Estoquista.html' },
];

function mergeManuaisSemDuplicar(base: ManualCard[], extras: ManualCard[]): ManualCard[] {
  const seen = new Set(base.map((item) => item.file));
  const out = [...base];
  for (const item of extras) {
    if (seen.has(item.file)) continue;
    out.push(item);
    seen.add(item.file);
  }
  return out;
}

export default function PortalManuaisPage() {
  const [perfil, setPerfil] = useState<{
    setor: string | null;
    role: string | null;
    cargo: string | null;
  } | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          colaborador?: { setor?: string | null; role?: string | null; cargo?: string | null };
        }) => {
          if (cancel) return;
          if (data.ok && data.colaborador) {
            setPerfil({
              setor: data.colaborador.setor ?? null,
              role: data.colaborador.role ?? null,
              cargo: data.colaborador.cargo ?? null,
            });
          } else {
            setPerfil({ setor: null, role: null, cargo: null });
          }
        }
      )
      .catch(() => {
        if (!cancel) setPerfil({ setor: null, role: null, cargo: null });
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

    const esp = manualPorSetor(perfil.setor, perfil.role, perfil.cargo);

    const biblioteca = MANUAIS_SETORIAIS_BIBLIOTECA.map((m) => ({
      ...m,
      destaque:
        esp && m.file === esp.file
          ? 'Sugerido para o seu setor ou função (perfil).'
          : 'Documento oficial — abra o que corresponde à sua função.',
    }));

    const bibliotecaComGarantia = mergeManuaisSemDuplicar(biblioteca, MANUAIS_GARANTIDOS);

    return [
      ...list,
      ...bibliotecaComGarantia,
    ];
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
          Vídeo de boas-vindas e manuais oficiais. O conteúdo é o mesmo do primeiro acesso (onboarding).
        </p>
      </div>

      <section className="rounded-2xl border border-dourado-200 bg-dourado-50/40 p-5 shadow-sm">
        <h2 className="font-display font-semibold text-cafeteria-900 text-lg">{VIDEO_BOAS_VINDAS_TITULO}</h2>
        <p className="text-sm text-cafeteria-600 mt-1">
          Obrigatório na 1ª vez (vídeo até o fim + 3 perguntas). Depois fica disponível para reassistir.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/portal/video-boas-vindas"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400"
          >
            Assistir ao vídeo
          </Link>
        </div>
      </section>

      <ul className="space-y-4">
        {cards.map((c, idx) => {
          const href = hrefManual(c.file);
          return (
            <li
              key={`${idx}-${c.file}`}
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
