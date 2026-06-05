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
  acaoLabel?: string;
};

function normalizarRole(raw: unknown): string {
  if (typeof raw !== 'string') return 'colaborador';
  const t = raw.trim().toLowerCase();
  return t || 'colaborador';
}

function formatarNomes(nomes: string[], max = 3): string {
  if (nomes.length === 0) return '';
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  if (nomes.length <= max) {
    return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
  }
  return `${nomes.slice(0, max).join(', ')} e mais ${nomes.length - max}`;
}

export function FacaAgoraHome() {
  const [fase, setFase] = useState<'loading' | 'pronto'>('loading');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);

  useEffect(() => {
    let cancelado = false;
    const lembreteLider = lembreteAvaliacaoSemanaPassada();
    const semanaRef = semanaAvaliacaoEquipePadraoISO();

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
              acaoLabel: 'Responder agora →',
            });
          }

          const lid = await fetch('/api/portal/avaliacao-lideranca', { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => null);
          if (!cancelado && lid?.ok) {
            const avaliados = Array.isArray(lid.avaliados) ? lid.avaliados : [];
            const lideresPendentes = avaliados.filter(
              (a: { ja_avaliado_esta_semana?: boolean }) => a.ja_avaliado_esta_semana !== true
            );
            if (lideresPendentes.length > 0) {
              const nomes = lideresPendentes.map((a: { nome?: string }) => a.nome ?? 'Líder').filter(Boolean);
              lista.push({
                id: 'lideranca',
                titulo: 'Avaliar liderança',
                detalhe: `Falta${lideresPendentes.length === 1 ? '' : 'm'} avaliar: ${formatarNomes(nomes)}.`,
                href: '/portal/avaliacao-lideranca?aba=lideranca&pendentes=1',
                urgente: lid.alerta_ultimo_dia === true,
                acaoLabel: 'Clique para ver →',
              });
            }
          }

          const trof = await fetch('/api/portal/trofeus-pares', { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => null);
          if (!cancelado && trof?.ok) {
            const creditos = Number(trof.creditos_restantes ?? 0);
            if (creditos > 0) {
              lista.push({
                id: 'trofeus',
                titulo: 'Enviar troféus entre pares',
                detalhe: `Você ainda pode dar ${creditos} troféu${creditos === 1 ? '' : 's'} esta semana (Postura, Braço Direito, Eficiência).`,
                href: '/portal/avaliacao-lideranca?aba=pares',
                acaoLabel: 'Clique para ver →',
              });
            }
          }
        }

        if (podeEquipe && !isAdm) {
          const d2 = await fetch(`/api/portal/avaliacao-master?data=${semanaRef}`, {
            credentials: 'include',
            cache: 'no-store',
          })
            .then((r) => r.json())
            .catch(() => null);

          if (!cancelado && d2?.ok && Array.isArray(d2.equipe)) {
            const total = d2.equipe.length;
            const pendentesMembros = d2.equipe.filter((m: { avaliacao?: unknown }) => m.avaliacao == null);
            const pendentes = pendentesMembros.length;
            if (total > 0 && pendentes > 0) {
              const nomesPreview = pendentesMembros
                .map((m: { nome?: string }) => m.nome ?? '')
                .filter(Boolean)
                .slice(0, 3);
              const preview =
                nomesPreview.length > 0
                  ? ` Pendente${pendentes === 1 ? '' : 's'}: ${formatarNomes(nomesPreview, 3)}${pendentes > nomesPreview.length ? ` (+${pendentes - nomesPreview.length})` : ''}.`
                  : '';
              lista.push({
                id: 'equipe',
                titulo: lembreteLider.titulo,
                detalhe: `${pendentes} de ${total} avaliação${total === 1 ? '' : 'ões'} da equipe ainda não feita${pendentes === 1 ? '' : 's'}.${preview}`,
                href: '/portal/avaliacao-master?pendentes=1',
                urgente: true,
                acaoLabel: 'Clique para ver →',
              });
            }
          }
        }

        if (data.pode_visita_rh === true) {
          const rh = await fetch(`/api/portal/avaliacao-rh-visita?data=${semanaRef}`, {
            credentials: 'include',
            cache: 'no-store',
          })
            .then((r) => r.json())
            .catch(() => null);

          if (!cancelado && rh?.ok && Array.isArray(rh.equipe)) {
            const pendentesMembros = rh.equipe.filter((m: { avaliacao?: unknown }) => m.avaliacao == null);
            const pendentes = pendentesMembros.length;
            if (pendentes > 0) {
              const nomesPreview = pendentesMembros
                .map((m: { nome?: string }) => m.nome ?? '')
                .filter(Boolean)
                .slice(0, 3);
              const preview =
                nomesPreview.length > 0
                  ? ` Ex.: ${formatarNomes(nomesPreview, 3)}${pendentes > nomesPreview.length ? ` e mais ${pendentes - nomesPreview.length}` : ''}.`
                  : '';
              lista.push({
                id: 'visita-rh',
                titulo: 'Visita RH',
                detalhe: `${pendentes} visita${pendentes === 1 ? '' : 's'} RH pendente${pendentes === 1 ? '' : 's'} na rede.${preview}`,
                href: '/portal/avaliacao-rh-visita?pendentes=1',
                acaoLabel: 'Clique para ver →',
              });
            }
          }
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
              acaoLabel: 'Clique para ver →',
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
        setTarefas(lista.slice(0, 6));
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
              <span className="inline-block mt-2 text-sm font-medium text-dourado-base">
                {t.acaoLabel ?? 'Abrir →'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
