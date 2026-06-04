'use client';

import { formatarExibicaoAvaliacaoAdmin } from '@/lib/avaliacao-diaria';
import {
  agruparLinhasAdminPorColaboradorSemana,
  filtrarLinhasAdminBusca,
  formatarSemanaAdmin,
  type LinhaAdminAvaliacaoEquipe,
} from '@/lib/admin-avaliacoes-equipe-agrupar';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';
import { AdminAvaliacaoAdminAcao } from '@/components/admin/AdminAvaliacaoAdminAcao';

type Props = {
  linhas: LinhaAdminAvaliacaoEquipe[];
  busca: string;
  podeVerDetalhe: boolean;
  podeIgnorar: boolean;
  gavetaId: string | null;
  onAbrirGaveta: (id: string) => void;
  onRecarregar: () => void;
};

function ChipNotaAvaliacao({
  linha,
  podeVerDetalhe,
  gavetaAberta,
  onAbrir,
}: {
  linha: LinhaAdminAvaliacaoEquipe;
  podeVerDetalhe: boolean;
  gavetaAberta: boolean;
  onAbrir: () => void;
}) {
  const exib = formatarExibicaoAvaliacaoAdmin(linha);
  const rotulo = linha.avaliador_rotulo ?? linha.avaliador_nome ?? 'Avaliador';
  const rh = linha.origem_visita_rh === true;
  const ignorada = avaliacaoEstaIgnorada(linha);

  const base =
    'rounded-lg border px-3 py-2 min-w-[8.5rem] max-w-full w-full sm:w-auto sm:max-w-[14rem] text-left transition-colors ' +
    (ignorada
      ? 'border-cream-300 bg-cream-100/80 opacity-75'
      : rh
        ? 'border-sky-200 bg-sky-50/80'
        : 'border-dourado-200 bg-dourado-50/60');

  const conteudo = (
    <>
      <p className={`text-sm font-medium break-words ${rh ? 'text-sky-900' : 'text-dourado-800'}`}>
        {rotulo}
      </p>
      <p
        className={`text-lg font-semibold tabular-nums mt-0.5 ${
          exib.faltaInjustificada
            ? 'text-red-700'
            : exib.foraPlantao
              ? 'text-violet-800'
              : exib.legado
                ? 'text-coffee-100'
                : 'text-coffee-base'
        }`}
      >
        {exib.mediaLabel}
      </p>
      {ignorada && (
        <p className="text-xs font-medium text-coffee-100 mt-1 break-words">
          Ignorada (fora da média)
        </p>
      )}
      {exib.justificativaLabel !== '—' && (
        <p className="text-xs sm:text-sm text-coffee-100 mt-1 break-words whitespace-normal leading-snug">
          {exib.justificativaLabel}
        </p>
      )}
    </>
  );

  if (podeVerDetalhe && !exib.foraPlantao && !exib.legado && !ignorada) {
    return (
      <button
        type="button"
        onClick={onAbrir}
        className={`${base} hover:ring-2 hover:ring-dourado-base/30 ${gavetaAberta ? 'ring-2 ring-dourado-base/40' : ''}`}
        title="Ver critérios"
      >
        {conteudo}
      </button>
    );
  }

  return <div className={base}>{conteudo}</div>;
}

function BlocoAvaliacaoComAcao({
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
  const ignorada = avaliacaoEstaIgnorada(linha);
  const rotulo = linha.avaliador_rotulo ?? linha.avaliador_nome ?? 'Avaliador';

  return (
    <div className="flex flex-col gap-1.5 shrink-0 min-w-[10rem] max-w-[20rem]">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5 max-w-[26rem]">
        <ChipNotaAvaliacao
          linha={linha}
          podeVerDetalhe={podeVerDetalhe}
          gavetaAberta={gavetaAberta}
          onAbrir={onAbrir}
        />
        {podeIgnorar && (
          <div className="pt-2 shrink-0">
            <AdminAvaliacaoAdminAcao
              avaliacaoId={linha.id}
              colaboradorNome={linha.colaborador_nome}
              avaliadorRotulo={rotulo}
              jaIgnorada={ignorada}
              onAlterada={onRecarregar}
              variant="aside"
            />
          </div>
        )}
      </div>
    </div>
  );
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
                <p className="text-sm text-dourado-700 mt-1">
                  Semana {formatarSemanaAdmin(g.data_referencia)}
                  {g.tem_multiplos_avaliadores && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-medium">
                      {g.qtd_avaliadores} avaliações
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs uppercase tracking-wide text-coffee-100">Média da semana</p>
                <p
                  className={`text-2xl font-display font-semibold tabular-nums ${
                    falta ? 'text-red-700' : 'text-coffee-base'
                  }`}
                >
                  {mediaLabel}
                </p>
                {g.tem_multiplos_avaliadores && (
                  <p className="text-xs text-coffee-100 mt-0.5">média das notas ao lado</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pb-1">
              {g.avaliacoes.map((a) => (
                <BlocoAvaliacaoComAcao
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
