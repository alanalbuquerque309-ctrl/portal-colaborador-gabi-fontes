'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { lembreteAvaliacaoSemanaPassada, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';

type Tarefa = {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
  urgente?: boolean;
};

function normalizarRole(raw: unknown): string {
  if (typeof raw !== 'string') return 'colaborador';
  const t = raw.trim().toLowerCase();
  return t || 'colaborador';
}

export function FacaAgoraHome() {
  const [fase, setFase] = useState<'loading' | 'pronto'>('loading');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);

  useEffect(() => {
    let cancelado = false;
    const lembreteLider = lembreteAvaliacaoSemanaPassada();

    const montar = async () => {
      const lista: Tarefa[] = [];

      try {
        const res = await fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' });
        const data = (await res.json()) as {
          ok?: boolean;
          pode_visita_rh?: boolean;
          pode_avaliacao_equipe?: boolean;
          colaborador?: { role?: string | null };
        };

        if (cancelado) return;

        const nr = data.ok && data.colaborador ? normalizarRole(data.colaborador.role) : 'colaborador';
        const isAdm = nr === 'admin' || nr === 'socio';
        const podeEquipe =
          nr === 'gerente' ||
          nr === 'master' ||
          nr === 'admin' ||
          data.pode_avaliacao_equipe === true;
        const isColaborador = nr === 'colaborador';

        if (isColaborador) {
          const emo = await fetch('/api/portal/emocional', { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => null);
          if (!cancelado && emo?.ok && !emo.emocao) {
            lista.push({
              id: 'termometro',
              titulo: 'Responder termômetro de emoções',
              detalhe: 'Primeiro passo do dia — resposta anônima no resumo.',
              href: '#termometro-emocoes',
              urgente: true,
            });
          }

          const lid = await fetch('/api/portal/avaliacao-lideranca', { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => null);
          if (!cancelado && lid?.ok) {
            const pendentes = Number(lid.pendentes_no_ultimo_dia ?? lid.pendentes ?? 0);
            if (pendentes > 0 || lid.alerta_ultimo_dia === true) {
              lista.push({
                id: 'lideranca',
                titulo: 'Avaliar liderança',
                detalhe:
                  pendentes > 0
                    ? `${pendentes} avaliação${pendentes === 1 ? '' : 'ões'} pendente${pendentes === 1 ? '' : 's'}.`
                    : 'Feedback sobre seus líderes nesta semana.',
                href: '/portal/avaliacao-lideranca',
                urgente: lid.alerta_ultimo_dia === true,
              });
            }
          }
        }

        if (podeEquipe && !isAdm) {
          const d2 = await fetch(`/api/portal/avaliacao-master?data=${semanaAvaliacaoEquipePadraoISO()}`, {
            credentials: 'include',
            cache: 'no-store',
          })
            .then((r) => r.json())
            .catch(() => null);

          if (!cancelado && d2?.ok && Array.isArray(d2.equipe)) {
            const total = d2.equipe.length;
            const pendentes = d2.equipe.filter((m: { avaliacao?: unknown }) => m.avaliacao == null).length;
            if (total > 0 && pendentes > 0) {
              lista.push({
                id: 'equipe',
                titulo: lembreteLider.titulo,
                detalhe: `Faltam ${pendentes} de ${total} colaborador${total === 1 ? '' : 'es'} para concluir.`,
                href: '/portal/avaliacao-master',
                urgente: true,
              });
            }
          }
        }

        if (data.pode_visita_rh === true) {
          lista.push({
            id: 'visita-rh',
            titulo: 'Visita RH',
            detalhe: 'Avaliação complementar na rede (quando aplicável).',
            href: '/portal/avaliacao-rh-visita',
          });
        }

        if (podeVerRelatoriosAvaliacoesCompletos(nr)) {
          const pend = await fetch('/api/portal/avaliacoes-pendentes', { credentials: 'include', cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (!cancelado && pend?.ok && Array.isArray(pend.itens) && pend.itens.length > 0) {
            lista.push({
              id: 'pendentes-rede',
              titulo: `${pend.itens.length} pendência${pend.itens.length === 1 ? '' : 's'} na rede`,
              detalhe: 'Avaliações da semana ainda não concluídas — ver no Admin.',
              href: '/admin/avaliacoes-diarias',
              urgente: pend.resumo?.criticos > 0,
            });
          }
        }

        if (isAdm && lista.filter((t) => t.id === 'pendentes-rede').length === 0) {
          lista.push({
            id: 'admin',
            titulo: 'Painel Admin',
            detalhe: 'Avaliações, avisos, colaboradores e relatórios.',
            href: '/admin/dashboard',
          });
        }

        if (nr === 'gerente' || nr === 'master') {
          lista.push({
            id: 'minha-lideranca',
            titulo: 'Minha avaliação de liderança',
            detalhe: 'Veja sua média e feedback de melhoria.',
            href: '/portal/minha-lideranca',
          });
        }
      } catch {
        if (!cancelado) {
          const s = getPortalSession();
          if (s?.colaboradorId && s.colaboradorId !== 'pending') {
            const nr = normalizarRole(s.role);
            if (nr === 'colaborador') {
              lista.push({
                id: 'desempenho',
                titulo: 'Ver meu desempenho',
                detalhe: 'Sua nota e destaques da unidade no mês.',
                href: '/portal/desempenho',
              });
            }
          }
        }
      }

      if (!cancelado) {
        setTarefas(lista.slice(0, 4));
        setFase('pronto');
      }
    };

    void montar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (fase === 'loading') {
    return (
      <section aria-busy="true" className="rounded-2xl border border-dourado-base/40 bg-cream-50 p-5">
        <h2 className="text-lg font-display font-semibold text-cafeteria-900">Faça agora</h2>
        <p className="text-sm text-cafeteria-600 mt-2">Carregando pendências…</p>
      </section>
    );
  }

  if (tarefas.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="titulo-faca-agora" className="rounded-2xl border border-dourado-base/40 bg-cream-50 p-5 shadow-sm">
      <h2 id="titulo-faca-agora" className="text-lg font-display font-semibold text-cafeteria-900">
        Faça agora
      </h2>
      <p className="text-sm text-cafeteria-600 mt-1">O que precisa da sua atenção neste momento.</p>
      <ul className="mt-4 space-y-3">
        {tarefas.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              className={`block rounded-xl border px-4 py-3 transition-all hover:shadow-md ${
                t.urgente
                  ? 'border-amber-400 bg-amber-50/80 hover:border-amber-500'
                  : 'border-cafeteria-200 bg-white hover:border-dourado-base'
              }`}
            >
              <p className="text-base font-semibold text-cafeteria-900">{t.titulo}</p>
              <p className="text-sm text-cafeteria-600 mt-0.5">{t.detalhe}</p>
              <span className="inline-block mt-2 text-sm font-medium text-dourado-base">Abrir →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
