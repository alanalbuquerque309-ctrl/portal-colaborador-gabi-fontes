'use client';

type RankingItem = {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  total_trofeus: number;
};

function rotuloMes(mesRef: string): string {
  const [y, m] = mesRef.split('-').map(Number);
  if (!y || !m) return mesRef;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function CardRanking({ item, destaqueFixo }: { item: RankingItem; destaqueFixo?: boolean }) {
  const medalhas = ['🥇', '🥈', '🥉'];
  const emoji = medalhas[item.posicao - 1] ?? `${item.posicao}º`;

  return (
    <article
      className={`rounded-xl border p-4 ${
        destaqueFixo ? 'border-dourado-300 bg-dourado-50/80' : 'border-dourado-200 bg-white/90'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none pt-1" aria-hidden>
          {emoji}
        </span>
        {item.foto_url ? (
          <img
            src={item.foto_url}
            alt=""
            className="w-12 h-12 rounded-full object-cover border border-dourado-200 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-dourado-100 flex items-center justify-center text-dourado-700 font-display text-lg shrink-0">
            {item.nome?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-coffee-base text-base leading-snug break-words">{item.nome}</h4>
          <p className="text-base font-medium text-dourado-700 mt-0.5">
            {item.total_trofeus} troféu{item.total_trofeus === 1 ? '' : 's'} recebido
            {item.total_trofeus === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </article>
  );
}

type BlocoRanking = {
  mes_referencia: string;
  top: RankingItem[];
};

type Props = {
  grupoRotulo: string;
  mesAnterior: BlocoRanking;
  mesAtual: BlocoRanking;
  compacto?: boolean;
};

export function MuralRankingTrofeusPares({ grupoRotulo, mesAnterior, mesAtual, compacto }: Props) {
  const temAnterior = mesAnterior.top.length > 0;
  const temAtual = mesAtual.top.length > 0;

  if (!temAnterior && !temAtual) {
    return (
      <p className="text-sm text-cafeteria-600 rounded-xl border border-dourado-200 bg-cream-50 p-4">
        O top 3 de troféus entre pares de {grupoRotulo} aparece aqui quando a equipe enviar reconhecimentos
        no mês (acumulado até o dia 31).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {temAnterior && (
        <section>
          <h4 className="text-sm font-semibold text-cafeteria-800 mb-1">
            Top 3 de {rotuloMes(mesAnterior.mes_referencia)} · {grupoRotulo}
          </h4>
          <p className="text-xs text-cafeteria-600 mb-3">
            Fixado durante {rotuloMes(mesAtual.mes_referencia)} (referência do mês anterior).
          </p>
          <div className={`grid gap-3 ${compacto ? '' : 'sm:grid-cols-1'}`}>
            {mesAnterior.top.map((item) => (
              <CardRanking key={`trof-fix-${item.colaborador_id}`} item={item} destaqueFixo />
            ))}
          </div>
        </section>
      )}

      {temAtual && (
        <section>
          <h4 className="text-sm font-semibold text-cafeteria-800 mb-1">
            Top 3 de {rotuloMes(mesAtual.mes_referencia)} · {grupoRotulo}
          </h4>
          <p className="text-xs text-cafeteria-600 mb-3">
            Ranking do mês em andamento; pode mudar conforme novos troféus forem enviados.
          </p>
          <div className={`grid gap-3 ${compacto ? '' : 'sm:grid-cols-1'}`}>
            {mesAtual.top.map((item) => (
              <CardRanking key={`trof-atual-${item.colaborador_id}`} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
