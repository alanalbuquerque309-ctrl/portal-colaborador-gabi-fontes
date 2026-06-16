'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { normalizePortalRole } from '@/lib/roles';

type Atalho = { href: string; titulo: string; descricao: string };

export function PortalAtalhosPerfil() {
  const [atalhos, setAtalhos] = useState<Atalho[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; pode_visita_rh?: boolean; colaborador?: { role?: string | null } }) => {
        if (cancelado) return;
        const nr = data.ok && data.colaborador ? normalizePortalRole(data.colaborador.role) : 'colaborador';
        const lista: Atalho[] = [];

        if (nr === 'colaborador' || nr === 'socio' || nr === 'admin') {
          lista.push({
            href: '/portal/graos',
            titulo: 'Grãos de café',
            descricao:
              nr === 'colaborador'
                ? 'Missões da semana, saldo e resgate na cafeteria.'
                : 'Visualizar missões, catálogo e regras da gamificação.',
          });
        }
        if (nr === 'colaborador') {
          lista.push({
            href: '/portal/desempenho',
            titulo: 'Meu desempenho',
            descricao: 'Sua nota no mês e destaques da unidade.',
          });
        }
        if (nr === 'gerente' || nr === 'master' || nr === 'admin') {
          if (nr === 'admin') {
            lista.push({
              href: '/portal/avaliacao-master',
              titulo: 'Avaliação da equipe',
              descricao: 'Notas semanais (assiduidade, vestimenta, desempenho).',
            });
          }
          lista.push({
            href: '/portal/gerente-equipe',
            titulo: 'Equipe no mês',
            descricao: 'Visão da sua equipe no período.',
          });
          lista.push({
            href: '/portal/minha-lideranca',
            titulo: 'Minha liderança',
            descricao: 'Média por pilar e feedback de melhoria.',
          });
        }
        if (nr === 'colaborador' || nr === 'admin' || nr === 'rh') {
          lista.push({
            href: '/portal/avaliacao-lideranca',
            titulo: 'Avaliar liderança',
            descricao: 'Feedback sobre seus líderes.',
          });
        }
        if (data.pode_visita_rh === true) {
          lista.push({
            href: '/portal/avaliacao-rh-visita',
            titulo: 'Visita RH',
            descricao: 'Avaliação complementar na rede.',
          });
        }

        setAtalhos(lista);
      })
      .catch(() => {
        if (!cancelado) setAtalhos([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (atalhos.length === 0) return null;

  return (
    <section className="rounded-2xl border border-cafeteria-200 bg-white/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-cream-50 transition-colors"
      >
        <span className="text-base font-display font-semibold text-cafeteria-800">Mais atalhos</span>
        <svg
          className={`w-5 h-5 shrink-0 text-dourado-base transition-transform ${aberto ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {aberto && (
        <div className="px-5 pb-5 pt-0 border-t border-cream-200">
          <ul className="grid gap-3 sm:grid-cols-2 mt-4">
            {atalhos.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="block rounded-xl border border-cafeteria-200 bg-cream-50/50 p-4 hover:border-dourado-base transition-colors h-full"
                >
                  <p className="font-semibold text-cafeteria-900">{a.titulo}</p>
                  <p className="text-sm text-cafeteria-600 mt-1">{a.descricao}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
