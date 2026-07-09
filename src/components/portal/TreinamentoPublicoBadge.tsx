'use client';

import { etiquetaPublicoTreinamento, type TreinamentoPortalItem } from '@/lib/treinamento-portal-ux';

export function TreinamentoPublicoBadge({
  item,
  compacto,
}: {
  item: TreinamentoPortalItem;
  compacto?: boolean;
}) {
  const et = etiquetaPublicoTreinamento(item.publico_alvo, item.id);
  if (compacto) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${et.classe}`}
      >
        {item.publico_alvo === 'lideranca' || item.id === 'quinta-lider' ? 'Liderança' : 'Equipe'}
      </span>
    );
  }
  return (
    <div className={`rounded-xl px-3 py-2 ${et.classe}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{et.titulo}</p>
      {et.subtitulo ? <p className="text-[11px] mt-0.5 opacity-90 leading-snug">{et.subtitulo}</p> : null}
    </div>
  );
}
