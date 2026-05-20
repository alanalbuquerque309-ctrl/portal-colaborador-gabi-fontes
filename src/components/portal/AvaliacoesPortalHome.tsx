'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { hojeInicioSemanaISO } from '@/lib/semana-referencia';

function normalizarRole(raw: unknown): string {
  if (typeof raw !== 'string') return 'colaborador';
  const t = raw.trim().toLowerCase();
  return t || 'colaborador';
}

function aplicarFlagsRole(
  role: string,
  setG: (v: boolean) => void,
  setC: (v: boolean) => void,
  setA: (v: boolean) => void
) {
  const isG = role === 'gerente' || role === 'master' || role === 'admin';
  const isA = role === 'admin' || role === 'socio';
  /** Colaborador explícito ou outro valor no banco: mostra atalho; a API restringe o conteúdo. */
  const isC = role === 'colaborador' || (!isG && !isA);
  setG(isG);
  setA(isA);
  setC(isC);
}

/**
 * Bloco na home do portal. Usa GET /api/portal/perfil (cookies no servidor) para não depender
 * de document.cookie com unidade preenchida.
 */
export function AvaliacoesPortalHome() {
  const [fase, setFase] = useState<'loading' | 'pronto'>('loading');
  const [mostrarGerente, setMostrarGerente] = useState(false);
  const [mostrarColaborador, setMostrarColaborador] = useState(false);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  const [mostrarMinhaLideranca, setMostrarMinhaLideranca] = useState(false);
  const [mostrarRelatoriosSocio, setMostrarRelatoriosSocio] = useState(false);
  const [alertaLiderancaSemanal, setAlertaLiderancaSemanal] = useState<string | null>(null);
  const [alertaGerenteSemanal, setAlertaGerenteSemanal] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const finalizar = () => {
      if (!cancelado) setFase('pronto');
    };

    (async () => {
      try {
        const res = await fetch('/api/portal/perfil', { credentials: 'include' });
        const data = (await res.json()) as {
          ok?: boolean;
          colaborador?: { role?: string | null };
        };
        if (cancelado) return;
        if (data.ok && data.colaborador) {
          const nr = normalizarRole(data.colaborador.role);
          aplicarFlagsRole(nr, setMostrarGerente, setMostrarColaborador, setMostrarAdmin);
          setMostrarMinhaLideranca(nr === 'gerente' || nr === 'master' || nr === 'admin');
          setMostrarRelatoriosSocio(podeVerRelatoriosAvaliacoesCompletos(nr));
          if (nr === 'gerente' || nr === 'master' || nr === 'admin') {
            fetch(`/api/portal/avaliacao-master?data=${hojeInicioSemanaISO()}`, { credentials: 'include', cache: 'no-store' })
              .then((r2) => r2.json())
              .then((d2) => {
                if (!d2?.ok || !Array.isArray(d2.equipe)) return;
                const total = d2.equipe.length;
                const pendentes = d2.equipe.filter(
                  (m: { avaliacao?: unknown }) => m.avaliacao == null
                ).length;
                if (total > 0 && pendentes > 0) {
                  setAlertaGerenteSemanal(
                    `Lembrete semanal: faltam ${pendentes} avaliação${
                      pendentes === 1 ? '' : 'ões'
                    } da sua equipe para a semana atual.`
                  );
                }
              })
              .catch(() => undefined);
          }
          if (nr === 'colaborador') {
            fetch('/api/portal/avaliacao-lideranca', { credentials: 'include' })
              .then((r2) => r2.json())
              .then((d2) => {
                if (d2?.ok && d2.alerta_ultimo_dia === true) {
                  const pend = Number(d2.pendentes_no_ultimo_dia ?? 0);
                  setAlertaLiderancaSemanal(
                    `Último dia da semana: você ainda tem ${pend} avaliação${
                      pend === 1 ? '' : 'ões'
                    } de liderança pendente${pend === 1 ? '' : 's'}.`
                  );
                }
              })
              .catch(() => undefined);
          }
          finalizar();
          return;
        }
      } catch {
        /* fallback abaixo */
      }

      if (cancelado) return;
      const s = getPortalSession();
      if (s?.colaboradorId && s.colaboradorId !== 'pending') {
        const nr = normalizarRole(s.role);
        aplicarFlagsRole(nr, setMostrarGerente, setMostrarColaborador, setMostrarAdmin);
        setMostrarMinhaLideranca(nr === 'gerente' || nr === 'master' || nr === 'admin');
        setMostrarRelatoriosSocio(podeVerRelatoriosAvaliacoesCompletos(nr));
      }
      finalizar();
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  if (fase === 'loading') {
    return (
      <section aria-busy="true" aria-label="Avaliações">
        <h2 className="text-2xl font-display font-semibold text-cafeteria-800 mb-4">Avaliações</h2>
        <div className="rounded-2xl border border-cafeteria-200 bg-white/80 px-5 py-6 text-sm text-cafeteria-600">
          Carregando atalhos…
        </div>
      </section>
    );
  }

  if (
    !mostrarGerente &&
    !mostrarColaborador &&
    !mostrarAdmin &&
    !mostrarRelatoriosSocio &&
    !mostrarMinhaLideranca
  ) {
    return null;
  }

  return (
    <section aria-labelledby="titulo-avaliacoes-home">
      <h2 id="titulo-avaliacoes-home" className="text-2xl font-display font-semibold text-cafeteria-800 mb-4">
        Avaliações
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {alertaLiderancaSemanal && (
          <div className="sm:col-span-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {alertaLiderancaSemanal}
          </div>
        )}
        {alertaGerenteSemanal && (
          <div className="sm:col-span-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {alertaGerenteSemanal}
          </div>
        )}
        {mostrarRelatoriosSocio && (
          <Link
            href="/portal/relatorios-avaliacoes"
            className="group rounded-2xl border-2 border-dourado-base/50 bg-gradient-to-br from-cream-50 to-white p-5 shadow-sm hover:border-dourado-base hover:shadow-md transition-all sm:col-span-2"
          >
            <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-2">Sócio</p>
            <h3 className="font-display font-semibold text-cafeteria-900 text-lg group-hover:text-dourado-700">
              Relatórios por filial
            </h3>
            <p className="text-sm text-cafeteria-600 mt-2">
              Avaliações da equipe (semanais) e feedback sobre liderança, unidade a unidade, no mesmo lugar.
            </p>
            <span className="inline-block mt-3 text-sm font-medium text-dourado-base group-hover:underline">
              Abrir visão completa →
            </span>
          </Link>
        )}
        {mostrarGerente && (
          <Link
            href="/portal/avaliacao-master"
            className="group rounded-2xl border-2 border-cafeteria-200 bg-white p-5 shadow-sm hover:border-dourado-base hover:shadow-md transition-all"
          >
            <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-2">Líder / gerente / admin</p>
            <h3 className="font-display font-semibold text-cafeteria-900 text-lg group-hover:text-dourado-700">
              Avaliação da equipe
            </h3>
            <p className="text-sm text-cafeteria-600 mt-2">
              Registrar a semana da sua equipe (após envio, só leitura).
            </p>
            <span className="inline-block mt-3 text-sm font-medium text-dourado-base group-hover:underline">
              Abrir →
            </span>
          </Link>
        )}
        {mostrarMinhaLideranca && (
          <Link
            href="/portal/minha-lideranca"
            className="group rounded-2xl border-2 border-cafeteria-200 bg-white p-5 shadow-sm hover:border-dourado-base hover:shadow-md transition-all"
          >
            <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-2">
              Líder / administrativo
            </p>
            <h3 className="font-display font-semibold text-cafeteria-900 text-lg group-hover:text-dourado-700">
              Minha avaliação de liderança
            </h3>
            <p className="text-sm text-cafeteria-600 mt-2">
              Veja apenas a sua média por pilar e feedback de melhoria.
            </p>
            <span className="inline-block mt-3 text-sm font-medium text-dourado-base group-hover:underline">
              Abrir →
            </span>
          </Link>
        )}
        {mostrarColaborador && (
          <Link
            href="/portal/desempenho"
            className="group rounded-2xl border-2 border-cafeteria-200 bg-white p-5 shadow-sm hover:border-dourado-base hover:shadow-md transition-all"
          >
            <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-2">Colaborador</p>
            <h3 className="font-display font-semibold text-cafeteria-900 text-lg group-hover:text-dourado-700">
              Desempenho
            </h3>
            <p className="text-sm text-cafeteria-600 mt-2">
              Destaques da unidade no mês e o seu resultado.
            </p>
            <span className="inline-block mt-3 text-sm font-medium text-dourado-base group-hover:underline">
              Abrir →
            </span>
          </Link>
        )}
        {mostrarAdmin && (
          <Link
            href="/admin/avaliacoes-diarias"
            className="group rounded-2xl border-2 border-coffee-base/20 bg-cream-50 p-5 shadow-sm hover:border-dourado-base hover:shadow-md transition-all sm:col-span-2"
          >
            <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-2">Administrativo</p>
            <h3 className="font-display font-semibold text-cafeteria-900 text-lg group-hover:text-dourado-700">
              Relatório de avaliações semanais da equipe
            </h3>
            <p className="text-sm text-cafeteria-600 mt-2">
              Visão consolidada no painel admin (período e unidade).
            </p>
            <span className="inline-block mt-3 text-sm font-medium text-dourado-base group-hover:underline">
              Abrir no admin →
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
