'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { MuralRankingUnidade } from '@/components/mural/MuralRankingUnidade';

type Destaque = {
  id: string;
  titulo: string;
  descricao: string;
  colaborador_nome: string;
  colaborador_foto: string | null;
  unidade_nome?: string | null;
};

type TrofeuMural = {
  id: string;
  emoji: string;
  titulo: string;
  destinatario_nome: string;
};

type RankingUnidadePayload = {
  grupo_rotulo: string;
  mes_atual: { mes_referencia: string; top: Array<{
    posicao: number;
    colaborador_id: string;
    nome: string;
    foto_url: string | null;
    media: number;
    semanas_avaliadas: number;
  }> };
  mes_anterior: { mes_referencia: string; top: RankingUnidadePayload['mes_atual']['top'] };
};

async function fetchJsonSafe(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function CardDestaque({ d, rotulo }: { d: Destaque; rotulo: string }) {
  return (
    <article className="rounded-xl border border-dourado-200 bg-white/90 p-4">
      <p className="text-xs font-medium text-dourado-600 uppercase tracking-wider mb-2">{rotulo}</p>
      <div className="flex items-center gap-3">
        {d.colaborador_foto ? (
          <img src={d.colaborador_foto} alt="" className="w-14 h-14 rounded-full object-cover border border-dourado-200" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-dourado-100 flex items-center justify-center text-dourado-700 font-display text-xl">
            {d.colaborador_nome?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <h4 className="font-semibold text-coffee-base">{d.colaborador_nome}</h4>
          <p className="text-xs text-dourado-700">{d.titulo}</p>
          {d.descricao && <p className="text-xs text-coffee-100 mt-1">{d.descricao}</p>}
          {d.unidade_nome && <p className="text-xs text-coffee-100/70 mt-0.5">{d.unidade_nome}</p>}
        </div>
      </div>
    </article>
  );
}

type Props = { compacto?: boolean };

export function MuralReconhecimento({ compacto = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [destaqueSemana, setDestaqueSemana] = useState<Destaque | null>(null);
  const [destaquesSemanaUnidade, setDestaquesSemanaUnidade] = useState<Destaque[]>([]);
  const [destaqueMes, setDestaqueMes] = useState<Destaque | null>(null);
  const [destaquesMesUnidade, setDestaquesMesUnidade] = useState<Destaque[]>([]);
  const [trofeus, setTrofeus] = useState<TrofeuMural[]>([]);
  const [rankingUnidade, setRankingUnidade] = useState<RankingUnidadePayload | null>(null);
  const [meta, setMeta] = useState({ totalAvaliacoesSemana: 0, minMensal: 2, minSemanal: 1 });

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    void (async () => {
      const [dest, trof] = await Promise.all([
        fetchJsonSafe('/api/portal/destaque'),
        fetchJsonSafe('/api/portal/trofeus-pares'),
      ]);

      if (dest?.ok === true) {
        setDestaqueSemana((dest.destaque_semana_geral ?? null) as Destaque | null);
        setDestaquesSemanaUnidade(
          Array.isArray(dest.destaques_semana_unidade) ? (dest.destaques_semana_unidade as Destaque[]) : []
        );
        setDestaqueMes((dest.destaque_geral ?? dest.destaque ?? null) as Destaque | null);
        setDestaquesMesUnidade(
          Array.isArray(dest.destaques_unidade) ? (dest.destaques_unidade as Destaque[]) : []
        );
        setMeta({
          totalAvaliacoesSemana: Number(dest.total_avaliacoes_semana ?? 0),
          minMensal: Number(dest.min_semanas_ranking_mensal ?? 2),
          minSemanal: Number(dest.min_semanas_ranking_semanal ?? 1),
        });
        const ru = dest.ranking_unidade as RankingUnidadePayload | undefined;
        if (ru?.grupo_rotulo && ru.mes_atual && ru.mes_anterior) {
          setRankingUnidade(ru);
        }
      }

      if (trof?.ok === true && Array.isArray(trof.mural_unidade)) {
        const lista = (trof.mural_unidade as TrofeuMural[]).filter((t) => t && t.id);
        setTrofeus(lista.slice(0, compacto ? 5 : 20));
      }
    })().finally(() => setLoading(false));
  }, [compacto]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando reconhecimentos…" />
      </div>
    );
  }

  const temRanking =
    rankingUnidade &&
    (rankingUnidade.mes_atual.top.length > 0 || rankingUnidade.mes_anterior.top.length > 0);

  const temDestaque =
    destaqueSemana ||
    destaquesSemanaUnidade.length > 0 ||
    destaqueMes ||
    destaquesMesUnidade.length > 0 ||
    trofeus.length > 0 ||
    temRanking;

  if (!temDestaque) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-5 text-sm text-cafeteria-700 space-y-2">
        <p>
          Ainda não há destaques automáticos no mural. Eles aparecem quando a equipe recebe avaliações semanais
          (destaque da semana com pelo menos {meta.minSemanal} registro) e, no mês, com pelo menos {meta.minMensal}{' '}
          semanas por colaborador.
        </p>
        {meta.totalAvaliacoesSemana > 0 && (
          <p className="text-cafeteria-600">
            Esta semana já há {meta.totalAvaliacoesSemana} avaliação(ões) registrada(s).
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rankingUnidade && (
        <section>
          <h3 className="text-sm font-semibold text-cafeteria-800 mb-3">Melhores da unidade</h3>
          <MuralRankingUnidade
            grupoRotulo={rankingUnidade.grupo_rotulo}
            mesAnterior={rankingUnidade.mes_anterior}
            mesAtual={rankingUnidade.mes_atual}
            compacto={compacto}
          />
        </section>
      )}

      {(destaqueSemana || destaquesSemanaUnidade.length > 0) && (
        <section>
          <h3 className="text-sm font-semibold text-cafeteria-800 mb-3">Destaques da semana</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {destaqueSemana && <CardDestaque d={destaqueSemana} rotulo="Geral" />}
            {destaquesSemanaUnidade.map((d) => (
              <CardDestaque key={`ds-${d.id}`} d={d} rotulo={d.unidade_nome ?? 'Unidade'} />
            ))}
          </div>
        </section>
      )}

      {(destaqueMes || destaquesMesUnidade.length > 0) && (
        <section>
          <h3 className="text-sm font-semibold text-cafeteria-800 mb-3">Destaques do mês</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {destaqueMes && <CardDestaque d={destaqueMes} rotulo="Geral" />}
            {!compacto &&
              destaquesMesUnidade.map((d) => (
                <CardDestaque key={`dm-${d.id}`} d={d} rotulo={d.unidade_nome ?? 'Unidade'} />
              ))}
          </div>
        </section>
      )}

      {trofeus.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-cafeteria-800 mb-3">Troféus entre pares</h3>
          <ul className="space-y-2">
            {trofeus.map((t, i) => (
              <li
                key={t.id || `trof-${i}`}
                className="rounded-lg border border-dourado-200 bg-dourado-50/60 px-3 py-2 text-sm flex gap-2 items-start"
              >
                <span className="text-lg">{t.emoji}</span>
                <span>
                  <strong>{t.destinatario_nome}</strong> recebeu <strong>{t.titulo}</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
