'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ILIComponente, PainelLider } from '@/lib/portal-home-types';
import { PainelStatCard } from '@/components/portal/home/PainelStatCard';

function formatarIli(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

function formatarPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function GavetaComponentes({ componentes }: { componentes: ILIComponente[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-cafeteria-600 mb-2">
        O que entra na sua nota (de 0 a 100):
      </p>
      <ul className="space-y-2">
        {componentes.map((c) => (
          <li key={c.label}>
            <div className="flex justify-between text-xs mb-0.5 gap-2">
              <span className="text-cafeteria-800">{c.label}</span>
              <span className="font-semibold tabular-nums shrink-0">
                {Math.round(c.pontos)} × {Math.round(c.peso * 100)}% = {c.contribuicao.toFixed(1).replace('.', ',')}
              </span>
            </div>
            <div className="h-2 rounded-full bg-cafeteria-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-dourado-base transition-all"
                style={{ width: `${Math.min(100, c.pontos)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GavetaEquipe({ painel }: { painel: PainelLider }) {
  return (
    <div className="space-y-2 text-sm text-cafeteria-800">
      <p>
        <strong>{painel.n_avaliados_semana}</strong> de <strong>{painel.n_equipe}</strong> colaboradores
        avaliados na semana.
      </p>
      <p>
        <strong>{painel.n_feedback_semana}</strong> feedback{painel.n_feedback_semana === 1 ? '' : 's'} de
        liderança recebido{painel.n_feedback_semana === 1 ? '' : 's'}.
      </p>
      {!painel.elegivel && painel.motivos_elegibilidade.length > 0 ? (
        <ul className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
          {painel.motivos_elegibilidade.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      ) : null}
      <Link href="/portal/minha-lideranca" className="inline-block text-sm font-medium text-dourado-base hover:underline">
        Ver feedback de liderança →
      </Link>
    </div>
  );
}

type Props = {
  painel: PainelLider;
};

export function PainelLiderHome({ painel }: Props) {
  const [gavetaAberta, setGavetaAberta] = useState<string | null>(null);
  const toggle = (id: string) => setGavetaAberta((prev) => (prev === id ? null : id));

  const subRanking =
    painel.elegivel && painel.posicao_entre_lideres != null
      ? `${painel.posicao_entre_lideres}º de ${painel.total_lideres_elegiveis} líderes elegíveis`
      : painel.elegivel
        ? 'Elegível ao destaque'
        : 'Ainda não elegível';

  return (
    <section aria-labelledby="titulo-painel-lider" className="space-y-4">
      <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-cream-50 p-4 sm:p-5 shadow-sm">
        <div className="mb-4">
          <h2 id="titulo-painel-lider" className="text-lg font-display font-semibold text-cafeteria-900">
            Meu impacto como líder
          </h2>
          <p className="text-sm text-cafeteria-600 mt-0.5">
            Olá, {painel.primeiro_nome} · semana {painel.semana_rotulo}
          </p>
          <p className="text-xs text-cafeteria-500 mt-1 leading-relaxed">
            Desenvolver pessoas melhores que você é o que faz a rede crescer. Só você vê sua posição entre os
            líderes.
          </p>
        </div>

        {painel.eh_vencedor_semana ? (
          <div className="mb-4 rounded-xl border border-dourado-base/50 bg-dourado-50/80 px-3 py-2 text-sm text-cafeteria-900">
            ⭐ Você é o <strong>melhor líder da semana</strong> na rede!
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <PainelStatCard
            emoji="⭐"
            label="Minha nota"
            valor={formatarIli(painel.ili)}
            sub="Só você vê este número"
            tom="dourado"
            aberto={gavetaAberta === 'ili'}
            onToggle={() => toggle('ili')}
            gaveta={<GavetaComponentes componentes={painel.componentes} />}
          />

          <PainelStatCard
            emoji="🏆"
            label="Entre líderes"
            valor={
              painel.posicao_entre_lideres != null ? `${painel.posicao_entre_lideres}º` : '—'
            }
            sub={subRanking}
            tom="dourado"
            aberto={gavetaAberta === 'ranking'}
            onToggle={() => toggle('ranking')}
            gaveta={
              <p className="text-sm text-cafeteria-700">
                {painel.elegivel
                  ? 'Quem tiver a maior nota da semana aparece nos Reconhecimentos. Só você vê sua posição aqui.'
                  : 'Complete o mínimo da semana para entrar no ranking.'}
              </p>
            }
          />

          <PainelStatCard
            emoji="👥"
            label="Equipe"
            valor={formatarPct(painel.n_equipe > 0 ? painel.n_avaliados_semana / painel.n_equipe : 0)}
            sub={`${painel.n_avaliados_semana}/${painel.n_equipe} avaliados`}
            tom="verde"
            aberto={gavetaAberta === 'equipe'}
            onToggle={() => toggle('equipe')}
            gaveta={<GavetaEquipe painel={painel} />}
          />

          <PainelStatCard
            emoji="💬"
            label="Feedback"
            valor={String(painel.n_feedback_semana)}
            sub="Respostas esta semana"
            tom="neutro"
            href="/portal/minha-lideranca"
          />
        </div>
      </div>
    </section>
  );
}
