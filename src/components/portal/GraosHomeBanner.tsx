'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IlustracaoGraos } from '@/components/portal/vivo/PortalIlustracao';

type Missao = {
  id: string;
  label: string;
  graos_max: number;
  status: string;
  href: string | null;
  detalhe: string | null;
};

type GraosResumo = {
  saldo_confirmado: number;
  saldo_pendente: number;
  graos_semana_ganhos: number;
  graos_semana_possivel: number;
  nivel?: { emoji: string; label: string };
  elegibilidade?: { elegivel: boolean; motivo: string | null };
  missoes: Missao[];
};

function iconeMissao(status: string): string {
  if (status === 'feito_confirmado') return '✅';
  if (status === 'feito_pendente') return '⏳';
  if (status === 'bloqueado') return '⚠';
  if (status === 'indisponivel') return '—';
  return '○';
}

/** Saldo + missões da semana (colaborador operação), logo abaixo do Faça agora. */
export function GraosHomeBanner() {
  const [visivel, setVisivel] = useState(false);
  const [resumo, setResumo] = useState<GraosResumo | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/graos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then(
        (d: {
          ok?: boolean;
          saldo_confirmado?: number;
          saldo_pendente?: number;
          graos_semana_ganhos?: number;
          graos_semana_possivel?: number;
          nivel?: { emoji: string; label: string };
          modo_gestao?: boolean;
          apenas_visualizacao?: boolean;
          missoes?: Missao[];
          elegibilidade?: { elegivel: boolean; motivo: string | null };
        }) => {
          if (cancel || d.ok !== true) return;
          if (d.modo_gestao || d.apenas_visualizacao) return;
          setResumo({
            saldo_confirmado: Number(d.saldo_confirmado ?? 0),
            saldo_pendente: Number(d.saldo_pendente ?? 0),
            graos_semana_ganhos: Number(d.graos_semana_ganhos ?? 0),
            graos_semana_possivel: Number(d.graos_semana_possivel ?? 40),
            nivel: d.nivel,
            elegibilidade: d.elegibilidade,
            missoes: Array.isArray(d.missoes) ? d.missoes : [],
          });
          setVisivel(true);
        }
      )
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  if (!visivel || !resumo) return null;

  const pct = resumo.graos_semana_possivel
    ? Math.min(100, Math.round((resumo.graos_semana_ganhos / resumo.graos_semana_possivel) * 100))
    : 0;

  const missoesAbertas = resumo.missoes.filter(
    (m) => m.status !== 'feito_confirmado' && m.status !== 'indisponivel'
  );

  return (
    <section className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-amber-50/80 to-dourado-50/40 p-5 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-orange-800">☕ Grãos de café — nossa moeda</p>
          <p className="text-3xl font-display font-bold text-cafeteria-900 mt-0.5 tabular-nums">
            {resumo.saldo_confirmado}
            <span className="text-lg font-normal text-cafeteria-700 ml-1">Grãos</span>
          </p>
          {resumo.nivel ? (
            <p className="text-sm text-cafeteria-600 mt-0.5">
              {resumo.nivel.emoji} {resumo.nivel.label}
              {resumo.saldo_pendente > 0 ? ` · +${resumo.saldo_pendente} aguardando avaliação` : ''}
            </p>
          ) : null}
        </div>
        <IlustracaoGraos className="w-24 h-16 shrink-0 opacity-90" />
      </div>

      <div className="rounded-xl bg-white/80 border border-orange-100 px-4 py-3 mb-3">
        <div className="flex justify-between text-sm font-medium text-cafeteria-800 mb-2">
          <span>Esta semana</span>
          <span className="tabular-nums">
            {resumo.graos_semana_ganhos}/{resumo.graos_semana_possivel} ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-cafeteria-100 overflow-hidden">
          <div className="h-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {resumo.elegibilidade && !resumo.elegibilidade.elegivel && resumo.elegibilidade.motivo ? (
          <p className="text-xs text-amber-900 mt-2 leading-snug">{resumo.elegibilidade.motivo}</p>
        ) : null}
      </div>

      {missoesAbertas.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-cafeteria-900 mb-2">Como ganhar mais Grãos</p>
          <ul className="space-y-1.5">
            {missoesAbertas.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-center" aria-hidden>
                  {iconeMissao(m.status)}
                </span>
                <span className="flex-1 min-w-0 text-cafeteria-800 leading-snug">{m.label}</span>
                <span className="text-dourado-base font-semibold shrink-0">+{m.graos_max}</span>
                {m.href && m.status !== 'feito_confirmado' ? (
                  <Link
                    href={m.href}
                    className="text-xs font-medium text-orange-700 hover:underline shrink-0"
                  >
                    Ir →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/portal/graos"
        className="inline-flex w-full sm:w-auto justify-center min-h-[44px] items-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 shadow-md"
      >
        Ver todas as missões e resgatar
      </Link>
    </section>
  );
}
