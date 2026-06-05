'use client';

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
  return <p className="text-xs text-coffee-100 mt-0.5">{partes.join(' · ')}</p>;
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
    <article className="rounded-xl border border-dourado-200 bg-white/90 p-4 flex items-center gap-3">
      <span className="text-2xl shrink-0" aria-hidden>
        {emoji}
      </span>
      <Avatar nome={item.nome} foto={item.foto_url} />
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-coffee-base truncate">{item.nome}</h4>
        <p className="text-sm font-medium text-dourado-700">
          {modo === 'semanal' ? `Nota ${item.media.toFixed(2)}` : `Média ${item.media.toFixed(2)}`}
        </p>
        <MetaUnidadeSetor unidade={item.unidade_nome} setor={item.setor} />
        {modo === 'mensal' && (
          <p className="text-xs text-coffee-100/80 mt-0.5">
            {item.semanas_avaliadas} semana{item.semanas_avaliadas === 1 ? '' : 's'} no mês
          </p>
        )}
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
          <h4 className="font-semibold text-coffee-base">{item.nome}</h4>
          <MetaUnidadeSetor unidade={item.unidade_nome} setor={item.setor} />
          <p className="text-sm font-medium text-dourado-700 mt-1">
            {item.total_trofeus} troféu{item.total_trofeus === 1 ? '' : 's'}{' '}
            {periodo === 'semanal' ? 'nesta semana' : 'no mês'}
          </p>
          {item.trofeus.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {item.trofeus.map((t) => (
                <li
                  key={`${item.colaborador_id}-${t.tipo}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-dourado-50 border border-dourado-200 px-2 py-1 text-xs text-coffee-base"
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
      <h3 className="text-sm font-semibold text-cafeteria-800 mb-1">{titulo}</h3>
      <p className="text-xs text-cafeteria-600 mb-3">{subtitulo}</p>
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
        <h3 className="text-sm font-semibold text-cafeteria-800 mb-1">{titulo}</h3>
        <p className="text-xs text-cafeteria-600">{subtitulo}</p>
      </div>
      {blocos.map((bloco) => (
        <div key={bloco.unidade_slug}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-dourado-700 mb-2">
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
}: {
  titulo: string;
  subtitulo: string;
  itens: RankingTrofeuItem[];
  periodo: 'semanal' | 'mensal';
}) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h3 className="text-sm font-semibold text-cafeteria-800 mb-1">{titulo}</h3>
      <p className="text-xs text-cafeteria-600 mb-3">{subtitulo}</p>
      <div className="space-y-3">
        {itens.map((item) => (
          <LinhaRankingTrofeu key={`trof-${item.colaborador_id}`} item={item} periodo={periodo} />
        ))}
      </div>
    </section>
  );
}
