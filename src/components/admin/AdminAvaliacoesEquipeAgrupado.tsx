'use client';

import { formatarExibicaoAvaliacaoAdmin } from '@/lib/avaliacao-diaria';
import {
  agruparLinhasAdminPorColaboradorSemana,
  filtrarLinhasAdminBusca,
  formatarSemanaAdmin,
  type LinhaAdminAvaliacaoEquipe,
} from '@/lib/admin-avaliacoes-equipe-agrupar';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';
import { AdminAvaliacaoIgnorarAcao } from '@/components/admin/AdminAvaliacaoIgnorarAcao';

type Props = {
  linhas: LinhaAdminAvaliacaoEquipe[];
  busca: string;
  podeVerDetalhe: boolean;
  podeIgnorar: boolean;
  gavetaId: string | null;
  onAbrirGaveta: (id: string) => void;
  onRecarregar: () => void;
};

function ChipAvaliacao({
  linha,
  podeVerDetalhe,
  podeIgnorar,
  gavetaAberta,
  onAbrir,
  onRecarregar,
}: {
  linha: LinhaAdminAvaliacaoEquipe;
  podeVerDetalhe: boolean;
  podeIgnorar: boolean;
  gavetaAberta: boolean;
  onAbrir: () => void;
  onRecarregar: () => void;
}) {
  const exib = formatarExibicaoAvaliacaoAdmin(linha);
  const rotulo = linha.avaliador_rotulo ?? linha.avaliador_nome ?? 'Avaliador';
  const rh = linha.origem_visita_rh === true;
  const ignorada = avaliacaoEstaIgnorada(linha);

  const base =
    'rounded-lg border px-3 py-2 min-w-[8.5rem] shrink-0 text-left transition-colors ' +
    (ignorada
      ? 'border-cream-300 bg-cream-100/80 opacity-75'
      : rh
        ? 'border-sky-200 bg-sky-50/80'
        : 'border-dourado-200 bg-dourado-50/60');

  const conteudo = (
    <>
      <p className={`text-xs font-medium truncate max-w-[12rem] ${rh ? 'text-sky-900' : 'text-dourado-800'}`}>
        {rotulo}
      </p>
      <p
        className={`text-lg font-semibold tabular-nums mt-0.5 ${
          exib.faltaInjustificada ? 'text-red-700' : exib.isenta ? 'text-coffee-100' : 'text-coffee-base'
        }`}
      >
        {exib.mediaLabel}
      </p>
      {ignorada && (
        <p className="text-[10px] font-medium text-coffee-100 mt-1" title={linha.ignorada_motivo ?? ''}>
          Ignorada (fora da média)
        </p>
      )}
      {exib.justificativaLabel !== '—' && (
        <p className="text-[10px] text-coffee-100 mt-1 line-clamp-2" title={exib.justificativaLabel}>
          {exib.justificativaLabel}
        </p>
      )}
    </>
  );

  const inner = (
    <>
      {conteudo}
      {podeIgnorar && !ignorada && (
        <AdminAvaliacaoIgnorarAcao
          avaliacaoId={linha.id}
          colaboradorNome={linha.colaborador_nome}
          avaliadorRotulo={rotulo}
          onIgnorada={onRecarregar}
        />
      )}
    </>
  );

  if (podeVerDetalhe && !exib.isenta && !ignorada) {
    return (
      <button
        type="button"
        onClick={onAbrir}
        className={`${base} hover:ring-2 hover:ring-dourado-base/30 ${gavetaAberta ? 'ring-2 ring-dourado-base/40' : ''}`}
        title="Ver critérios"
      >
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
}

export function AdminAvaliacoesEquipeAgrupado({
  linhas,
  busca,
  podeVerDetalhe,
  podeIgnorar,
  gavetaId,
  onAbrirGaveta,
  onRecarregar,
}: Props) {
  const filtradas = filtrarLinhasAdminBusca(linhas, busca);
  const grupos = agruparLinhasAdminPorColaboradorSemana(filtradas);

  if (grupos.length === 0) {
    return (
      <p className="text-sm text-coffee-100 px-4 py-10 text-center">
        Nenhum registro com estes filtros.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cream-200 list-none m-0 p-0">
      {grupos.map((g) => {
        const mediaLabel =
          g.media_semana != null
            ? g.media_semana.toFixed(2).replace('.', ',')
            : g.avaliacoes.every((a) => formatarExibicaoAvaliacaoAdmin(a).isenta)
              ? 'Isenta'
              : '—';
        const falta = g.avaliacoes.some((a) => formatarExibicaoAvaliacaoAdmin(a).faltaInjustificada);

        return (
          <li
            key={g.chave}
            className={`px-4 py-4 ${falta ? 'bg-red-50/30' : 'hover:bg-cream-50/50'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-coffee-base text-base">{g.colaborador_nome}</p>
                <p className="text-sm text-coffee-100 mt-0.5">
                  <span className="font-medium text-coffee-base/90">{g.setor}</span>
                  {' · '}
                  <span>{g.cargo}</span>
                  {g.unidade_nome !== '—' && (
                    <>
                      {' · '}
                      <span>{g.unidade_nome}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-dourado-700 mt-1">
                  Semana {formatarSemanaAdmin(g.data_referencia)}
                  {g.tem_multiplos_avaliadores && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-medium">
                      {g.qtd_avaliadores} avaliações
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wide text-coffee-100">Média da semana</p>
                <p
                  className={`text-2xl font-display font-semibold tabular-nums ${
                    falta ? 'text-red-700' : 'text-coffee-base'
                  }`}
                >
                  {mediaLabel}
                </p>
                {g.tem_multiplos_avaliadores && (
                  <p className="text-[10px] text-coffee-100 mt-0.5">média das notas ao lado</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {g.avaliacoes.map((a) => (
                <ChipAvaliacao
                  key={a.id}
                  linha={a}
                  podeVerDetalhe={podeVerDetalhe}
                  podeIgnorar={podeIgnorar}
                  gavetaAberta={gavetaId === a.id}
                  onAbrir={() => onAbrirGaveta(a.id)}
                  onRecarregar={onRecarregar}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
