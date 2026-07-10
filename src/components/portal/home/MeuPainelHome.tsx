'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PortalHomePainel, PortalHomeRankingEscopo } from '@/lib/portal-home-types';
import { PainelStatCard } from '@/components/portal/home/PainelStatCard';
import { getTermoCurto } from '@/lib/tenant/terminology';

function formatarMedia(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(1).replace('.', ',');
}

function textoRanking(r: PortalHomeRankingEscopo): string {
  if (r.posicao == null || r.total === 0) return '—';
  return `${r.posicao}º`;
}

function subRanking(r: PortalHomeRankingEscopo): string {
  if (r.posicao == null || r.total === 0) return 'Sem ranking este mês';
  if (r.no_top3) return `Destaque · ${r.label_escopo}`;
  return `de ${r.total} · ${r.label_escopo}`;
}

function GavetaRanking({ r, frase }: { r: PortalHomeRankingEscopo; frase: string }) {
  return (
    <div className="space-y-3">
      {r.posicao != null && r.total > 0 ? (
        <p className="text-cafeteria-800">
          Sua posição: <strong>{r.posicao}º</strong> de {r.total} (só você vê este número).
        </p>
      ) : (
        <p className="text-cafeteria-600">Ainda sem posição neste mês — faltam avaliações.</p>
      )}
      {r.top3.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-cafeteria-600 uppercase mb-1.5">Top 3 público</p>
          <ol className="space-y-1 text-sm text-cafeteria-800">
            {r.top3.map((p, i) => (
              <li key={`${p.nome}-${i}`}>
                {i + 1}. {p.nome} — {formatarMedia(p.media)}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <p className="text-sm italic text-cafeteria-700 leading-relaxed border-l-2 border-dourado-base pl-3">
        {frase}
      </p>
      <Link href="/portal/desempenho" className="inline-block text-sm font-medium text-dourado-base hover:underline">
        Ver desempenho completo →
      </Link>
    </div>
  );
}

function GavetaMedia({ painel }: { painel: PortalHomePainel }) {
  const comDado = painel.criterios.filter((c) => c.percentual != null);
  return (
    <div className="space-y-3">
      {comDado.length === 0 ? (
        <p className="text-cafeteria-600">Sem notas detalhadas nas últimas semanas.</p>
      ) : (
        <ul className="space-y-2">
          {comDado.map((c) => (
            <li key={c.id}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-cafeteria-800">{c.label}</span>
                <span className="font-semibold tabular-nums">{c.percentual}%</span>
              </div>
              <div className="h-2 rounded-full bg-cafeteria-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-dourado-base transition-all"
                  style={{ width: `${c.percentual}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href="/portal/desempenho" className="inline-block text-sm font-medium text-dourado-base hover:underline">
        Ver histórico →
      </Link>
    </div>
  );
}

function GavetaGraos({ painel }: { painel: PortalHomePainel }) {
  const graosCurto = getTermoCurto('reconhecimento');
  const g = painel.graos;
  return (
    <div className="space-y-2">
      <p className="text-cafeteria-800">
        Confirmados: <strong>{g.saldo_confirmado}</strong>
        {g.saldo_pendente > 0 ? (
          <span className="text-amber-800"> · +{g.saldo_pendente} pendentes</span>
        ) : null}
      </p>
      <p className="text-xs text-cafeteria-600">
        {g.nivel_emoji} Nível {g.nivel_label}
      </p>
      <Link href="/portal/graos" className="inline-block text-sm font-medium text-portal-action hover:underline">
        Abrir {graosCurto} →
      </Link>
    </div>
  );
}

function GavetaTrofeus({ painel }: { painel: PortalHomePainel }) {
  const { ultimos, total_recebidos } = painel.trofeus;
  if (total_recebidos === 0) {
    return <p className="text-cafeteria-600">Você ainda não recebeu troféus entre pares.</p>;
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5 text-sm text-cafeteria-800">
        {ultimos.slice(0, 5).map((t) => (
          <li key={t.id}>
            {t.emoji} {t.titulo} — de {t.avaliador_nome}
          </li>
        ))}
      </ul>
      {total_recebidos > ultimos.length ? (
        <p className="text-xs text-cafeteria-500">+ {total_recebidos - ultimos.length} anteriores</p>
      ) : null}
      <Link href="/portal/mural" className="inline-block text-sm font-medium text-dourado-base hover:underline">
        Ver no mural →
      </Link>
    </div>
  );
}

type Props = {
  painel: PortalHomePainel;
};

export function MeuPainelHome({ painel }: Props) {
  const graosCurto = getTermoCurto('reconhecimento');
  const [abaRanking, setAbaRanking] = useState<'unidade' | 'geral'>('unidade');
  const [gavetaAberta, setGavetaAberta] = useState<string | null>(null);
  const [graosVisivel, setGraosVisivel] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/graos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; congelado?: boolean }) => {
        if (cancel) return;
        setGraosVisivel(d.ok === true && d.congelado !== true);
      })
      .catch(() => {
        if (!cancel) setGraosVisivel(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const rankingAtivo = abaRanking === 'unidade' ? painel.ranking_unidade : painel.ranking_geral;

  const toggle = (id: string) => setGavetaAberta((prev) => (prev === id ? null : id));

  return (
    <section aria-labelledby="titulo-meu-painel" className="space-y-4">
      <div className="rounded-2xl border border-dourado-200/60 bg-gradient-to-br from-white via-cream-50/90 to-amber-50/40 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h2 id="titulo-meu-painel" className="text-lg font-display font-semibold text-cafeteria-900">
              Meu painel
            </h2>
            <p className="text-sm text-cafeteria-600">Olá, {painel.primeiro_nome} 👋</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PainelStatCard
            emoji="📈"
            label="Média"
            valor={formatarMedia(painel.media_mes)}
            sub={
              painel.semanas_avaliadas > 0
                ? `${painel.semanas_avaliadas} semana${painel.semanas_avaliadas === 1 ? '' : 's'} no mês`
                : 'Mês atual'
            }
            tom="dourado"
            aberto={gavetaAberta === 'media'}
            onToggle={() => toggle('media')}
            gaveta={<GavetaMedia painel={painel} />}
          />

          <div className="space-y-2">
            <div className="flex rounded-lg border border-cafeteria-200 overflow-hidden text-xs">
              <button
                type="button"
                className={`flex-1 py-1.5 min-h-[36px] font-medium ${
                  abaRanking === 'unidade' ? 'bg-dourado-base/25 text-cafeteria-900' : 'bg-white text-cafeteria-600'
                }`}
                onClick={() => setAbaRanking('unidade')}
              >
                Unidade
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 min-h-[36px] font-medium ${
                  abaRanking === 'geral' ? 'bg-dourado-base/25 text-cafeteria-900' : 'bg-white text-cafeteria-600'
                }`}
                onClick={() => setAbaRanking('geral')}
              >
                Geral
              </button>
            </div>
            <PainelStatCard
              emoji="🏆"
              label="Ranking"
              valor={textoRanking(rankingAtivo)}
              sub={subRanking(rankingAtivo)}
              tom="dourado"
              aberto={gavetaAberta === 'ranking'}
              onToggle={() => toggle('ranking')}
              gaveta={<GavetaRanking r={rankingAtivo} frase={painel.frase_motivacional} />}
            />
          </div>

          {graosVisivel ? (
            <PainelStatCard
              emoji="⭐"
              label={graosCurto}
              valor={String(painel.graos.saldo_confirmado)}
              sub={
                painel.graos.saldo_pendente > 0
                  ? `+${painel.graos.saldo_pendente} pendentes`
                  : `${painel.graos.nivel_emoji} ${painel.graos.nivel_label}`
              }
              tom="verde"
              aberto={gavetaAberta === 'graos'}
              onToggle={() => toggle('graos')}
              gaveta={<GavetaGraos painel={painel} />}
            />
          ) : null}

          <PainelStatCard
            emoji="🏅"
            label="Troféus"
            valor={String(painel.trofeus.total_recebidos)}
            sub="Recebidos entre pares"
            tom="dourado"
            aberto={gavetaAberta === 'trofeus'}
            onToggle={() => toggle('trofeus')}
            gaveta={<GavetaTrofeus painel={painel} />}
          />
        </div>
      </div>
    </section>
  );
}
