'use client';

import { useEffect, useState } from 'react';

/** Rankings de avaliação e troféus: semanal (top 3 notas) e mensal (acumulado no mês). */
export const ROTULO_PERIODO_RANKING_SEMANAL = 'Ranking semanal';
export const ROTULO_PERIODO_RANKING_MENSAL = 'Ranking mensal';

export const SUBTITULO_RANKING_AVALIACAO_SEMANAL =
  'Top 3 da rede na semana em avaliação (segunda a domingo). Atualiza quando a liderança registra notas.';

export const SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE =
  'Top 3 da rede pela média das notas semanais acumuladas no mês (em andamento até o dia 31).';

export const SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE =
  'Top 3 de cada unidade pela média mensal das avaliações semanais.';

export const SUBTITULO_RANKING_TROFEUS_MENSAL =
  'Soma de todos os troféus entre pares recebidos no mês civil.';

export const SUBTITULO_RANKING_TROFEUS_SEMANAL =
  'Quem mais recebeu troféus entre pares nesta semana (Postura, Braço Direito, Eficiência).';

/** Quantos colocados mostrar no ranking de troféus antes de "Ver mais". */
export const TROFEUS_RANKING_VISIVEL_INICIAL = 4;
export const TROFEUS_RANKING_VISIVEL_HOME = 3;
const TROFEUS_RANKING_VER_MAIS_1 = 6;
const TROFEUS_RANKING_VER_MAIS_DEPOIS = 10;

export function proximoLoteRankingTrofeus(visiveis: number): number {
  return visiveis <= TROFEUS_RANKING_VISIVEL_INICIAL ? TROFEUS_RANKING_VER_MAIS_1 : TROFEUS_RANKING_VER_MAIS_DEPOIS;
}

export type RankingAvaliacaoItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  media: number;
  semanas_avaliadas: number;
  unidade_nome: string;
  unidade_slug: string;
  setor: string | null;
};

export type RankingPorUnidade = {
  unidade_slug: string;
  unidade_nome: string;
  top: RankingAvaliacaoItem[];
};

export type TrofeuRecebido = {
  tipo: string;
  titulo: string;
  emoji: string;
  quantidade: number;
};

export type RankingTrofeuItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  unidade_nome: string;
  unidade_slug: string;
  setor: string | null;
  total_trofeus: number;
  trofeus: TrofeuRecebido[];
};

export function rotuloMes(mesRef: string): string {
  const [y, m] = mesRef.split('-').map(Number);
  if (!y || !m) return mesRef;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Quantas semanas distintas entraram na média mensal do colaborador. */
export function rotuloSemanasAvaliadas(n: number): string {
  if (n <= 0) return 'Nenhuma semana avaliada';
  if (n === 1) return '1 semana avaliada';
  return `${n} semanas avaliadas`;
}

function Avatar({ nome, foto }: { nome: string; foto: string | null }) {
  if (foto) {
    return (
      <img src={foto} alt="" className="w-12 h-12 rounded-full object-cover border border-dourado-200 shrink-0" />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-dourado-100 flex items-center justify-center text-dourado-700 font-display text-lg shrink-0">
      {nome?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  );
}

function MetaUnidadeSetor({ unidade, setor }: { unidade: string; setor: string | null }) {
  const partes = [unidade, setor].filter(Boolean);
  if (partes.length === 0) return null;
  return <p className="text-sm text-cafeteria-600 mt-0.5 leading-snug break-words">{partes.join(' · ')}</p>;
}

export function CardRankingAvaliacao({
  item,
  modo,
}: {
  item: RankingAvaliacaoItem;
  modo: 'semanal' | 'mensal';
}) {
  const medalhas = ['🥇', '🥈', '🥉'];
  const emoji = medalhas[item.posicao - 1] ?? `${item.posicao}º`;

  return (
    <article className="rounded-xl border border-dourado-200 bg-white/90 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none pt-1" aria-hidden>
          {emoji}
        </span>
        <Avatar nome={item.nome} foto={item.foto_url} />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-coffee-base text-base leading-snug break-words">{item.nome}</h4>
          <p className="text-base font-medium text-dourado-700 mt-0.5">
            {modo === 'semanal' ? `Nota ${item.media.toFixed(2)}` : `Média ${item.media.toFixed(2)}`}
          </p>
          <MetaUnidadeSetor unidade={item.unidade_nome} setor={item.setor} />
          {modo === 'mensal' && (
            <p className="text-sm text-cafeteria-600 mt-0.5">{rotuloSemanasAvaliadas(item.semanas_avaliadas)}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function LinhaRankingTrofeu({
  item,
  periodo,
}: {
  item: RankingTrofeuItem;
  periodo: 'semanal' | 'mensal';
}) {
  return (
    <article className="rounded-xl border border-dourado-200 bg-white/90 p-4">
      <div className="flex items-start gap-3">
        <span className="text-sm font-bold text-dourado-700 w-8 shrink-0 pt-1">{item.posicao}º</span>
        <Avatar nome={item.nome} foto={item.foto_url} />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-coffee-base text-base leading-snug break-words">{item.nome}</h4>
          <MetaUnidadeSetor unidade={item.unidade_nome} setor={item.setor} />
          <p className="text-base font-medium text-dourado-700 mt-1">
            {item.total_trofeus} troféu{item.total_trofeus === 1 ? '' : 's'}{' '}
            {periodo === 'semanal' ? 'nesta semana' : 'no mês'}
          </p>
          {item.trofeus.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {item.trofeus.map((t) => (
                <li
                  key={`${item.colaborador_id}-${t.tipo}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-dourado-50 border border-dourado-200 px-2.5 py-1 text-sm text-coffee-base"
                >
                  <span aria-hidden>{t.emoji}</span>
                  <span>
                    {t.titulo}
                    {t.quantidade > 1 ? ` ×${t.quantidade}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function EtiquetaRankingSemanal() {
  return (
    <span className="inline-block rounded-full bg-sky-100 text-sky-900 text-xs font-semibold px-2.5 py-0.5 mb-2">
      {ROTULO_PERIODO_RANKING_SEMANAL}
    </span>
  );
}

function EtiquetaRankingMensal() {
  return (
    <span className="inline-block rounded-full bg-dourado-100 text-dourado-900 text-xs font-semibold px-2.5 py-0.5 mb-2">
      {ROTULO_PERIODO_RANKING_MENSAL}
    </span>
  );
}

export function BlocoTop3Geral({
  titulo,
  subtitulo,
  itens,
  modo,
}: {
  titulo: string;
  subtitulo: string;
  itens: RankingAvaliacaoItem[];
  modo: 'semanal' | 'mensal';
}) {
  if (itens.length === 0) return null;
  return (
    <section>
      {modo === 'mensal' ? <EtiquetaRankingMensal /> : <EtiquetaRankingSemanal />}
      <h3 className="text-base font-semibold text-cafeteria-800 mb-1">{titulo}</h3>
      <p className="text-sm text-cafeteria-600 mb-3 leading-relaxed">{subtitulo}</p>
      <div className="grid gap-3">
        {itens.map((item) => (
          <CardRankingAvaliacao key={`geral-${item.colaborador_id}`} item={item} modo={modo} />
        ))}
      </div>
    </section>
  );
}

export function BlocoTop3PorUnidade({
  titulo,
  subtitulo,
  blocos,
  modo,
}: {
  titulo: string;
  subtitulo: string;
  blocos: RankingPorUnidade[];
  modo: 'semanal' | 'mensal';
}) {
  if (blocos.length === 0) return null;
  return (
    <section className="space-y-5">
      <div>
        {modo === 'mensal' ? <EtiquetaRankingMensal /> : null}
        <h3 className="text-base font-semibold text-cafeteria-800 mb-1">{titulo}</h3>
        <p className="text-sm text-cafeteria-600 leading-relaxed">{subtitulo}</p>
      </div>
      {blocos.map((bloco) => (
        <div key={bloco.unidade_slug}>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-dourado-700 mb-2">
            {bloco.unidade_nome}
          </h4>
          <div className="grid gap-3">
            {bloco.top.map((item) => (
              <CardRankingAvaliacao
                key={`${bloco.unidade_slug}-${item.colaborador_id}`}
                item={item}
                modo={modo}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function BlocoRankingTrofeus({
  titulo,
  subtitulo,
  itens,
  periodo,
  visivelInicial = TROFEUS_RANKING_VISIVEL_INICIAL,
}: {
  titulo: string;
  subtitulo: string;
  itens: RankingTrofeuItem[];
  periodo: 'semanal' | 'mensal';
  visivelInicial?: number;
}) {
  const [visiveis, setVisiveis] = useState(visivelInicial);

  useEffect(() => {
    setVisiveis(visivelInicial);
  }, [titulo, itens.length, visivelInicial]);

  if (itens.length === 0) return null;

  const lista = itens.slice(0, visiveis);
  const restantes = itens.length - visiveis;
  const lote = proximoLoteRankingTrofeus(visiveis);
  const proximos = Math.min(lote, restantes);

  return (
    <section>
      {periodo === 'mensal' ? <EtiquetaRankingMensal /> : null}
      <h3 className="text-base font-semibold text-cafeteria-800 mb-1">{titulo}</h3>
      <p className="text-sm text-cafeteria-600 mb-3 leading-relaxed">{subtitulo}</p>
      <div className="space-y-3">
        {lista.map((item) => (
          <LinhaRankingTrofeu key={`trof-${item.colaborador_id}`} item={item} periodo={periodo} />
        ))}
      </div>
      {restantes > 0 && (
        <button
          type="button"
          onClick={() => setVisiveis((n) => Math.min(itens.length, n + lote))}
          className="mt-3 w-full rounded-lg border border-dourado-300 bg-cream-50 px-4 py-2.5 text-sm font-medium text-coffee-base hover:bg-dourado-50 min-h-[44px]"
        >
          Ver mais ({proximos} {proximos === 1 ? 'colocado' : 'colocados'})
        </button>
      )}
    </section>
  );
}
