import { partesDataIso } from '@/lib/data-civil-br';

export type AniversarianteItem = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  aniversario_label?: string;
  foto_url?: string | null;
  unidade_nome: string;
  possivel_conflito_admissao?: boolean;
};

type Props = {
  item: AniversarianteItem;
  destaque?: boolean;
};

function diaDoMes(dataNascimento: string | null): string {
  const p = partesDataIso(dataNascimento);
  return p ? String(p.dia) : '—';
}

export function AniversarianteCard({ item, destaque = false }: Props) {
  const inicial = item.nome?.charAt(0)?.toUpperCase() ?? '?';

  if (destaque) {
    return (
      <article className="rounded-2xl border-2 border-dourado-base/60 bg-gradient-to-br from-dourado-50/80 via-cream-50 to-white p-5 md:p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-dourado-base mb-3">Aniversariante de hoje 🎂</p>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {item.foto_url ? (
            <img
              src={item.foto_url}
              alt=""
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-dourado-100 flex items-center justify-center border-4 border-white shadow-md shrink-0">
              <span className="text-dourado-700 font-display text-3xl">{inicial}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-4xl font-display font-bold text-dourado-base tabular-nums leading-none">{diaDoMes(item.data_nascimento)}</p>
            <h3 className="font-display font-semibold text-xl text-coffee-base mt-2">{item.nome}</h3>
            <p className="text-sm text-cafeteria-600 mt-1">
              {item.aniversario_label || item.data_nascimento}
              {item.unidade_nome ? ` · ${item.unidade_nome}` : ''}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-cafeteria-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-2">
      {item.foto_url ? (
        <img
          src={item.foto_url}
          alt=""
          className="w-16 h-16 rounded-full object-cover border-2 border-dourado-200/80"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-dourado-100 flex items-center justify-center border-2 border-dourado-200/80">
          <span className="text-dourado-600 font-display text-lg">{inicial}</span>
        </div>
      )}
      <p className="text-2xl font-display font-bold text-dourado-base tabular-nums leading-none">{diaDoMes(item.data_nascimento)}</p>
      <h3 className="font-semibold text-coffee-base text-sm leading-snug line-clamp-2">{item.nome}</h3>
      <p className="text-xs text-cafeteria-600 leading-snug">
        {item.aniversario_label}
        {item.unidade_nome ? ` · ${item.unidade_nome}` : ''}
      </p>
      {item.possivel_conflito_admissao ? (
        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
          Revisar cadastro
        </span>
      ) : null}
    </article>
  );
}
