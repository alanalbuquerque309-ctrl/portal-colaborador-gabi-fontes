'use client';

import Link from 'next/link';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';
import { TreinamentoRichText } from '@/components/portal/TreinamentoRichText';
import type { TreinamentoPortalItem } from '@/lib/treinamento-portal-ux';

type Props = {
  item: TreinamentoPortalItem;
  aberto: boolean;
  links: Record<string, string | null>;
  termoQuinta: string;
  termoReconhecimento: string;
  graosCurto: string;
  confirmando: string | null;
  onAbrir: (id: string) => void;
  onRecolher: () => void;
  onConfirmar: (id: string) => void;
  onRegistrarAutomatico?: (treinoId: string) => void;
  botaoPrimario?: boolean;
};

export function TreinamentoItemConteudo({
  item: t,
  aberto,
  links,
  termoQuinta,
  termoReconhecimento,
  graosCurto,
  confirmando,
  onAbrir,
  onRecolher,
  onConfirmar,
  onRegistrarAutomatico,
  botaoPrimario = true,
}: Props) {
  const ehTexto = t.tipo_conteudo === 'texto';
  const linkInstitucional = t.id === 'video-institutional' ? links.video_boas_vindas : null;
  const linkQuinta = t.id.startsWith('quinta-') && links.graos_quinta ? links.graos_quinta : null;
  const btnCls = botaoPrimario
    ? 'rounded-lg bg-dourado-base px-4 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400 transition-colors min-h-[44px] items-center inline-flex'
    : 'rounded-lg bg-cafeteria-100 px-4 py-2 text-sm font-medium text-coffee-base hover:bg-cafeteria-200 transition-colors min-h-[40px] items-center inline-flex';

  if (linkInstitucional) {
    return (
      <Link href={linkInstitucional} className={btnCls}>
        {botaoPrimario ? 'Abrir vídeo institucional' : 'Rever vídeo institucional'}
      </Link>
    );
  }

  if (t.id.startsWith('quinta-') && t.embed_url) {
    return (
      <div>
        <QuintaTreinoEmbed
          embedUrl={t.embed_url}
          titulo={t.titulo}
          resumo={t.descricao ?? ''}
          onExibir={
            t.id === 'quinta-colaborador' && onRegistrarAutomatico
              ? () => onRegistrarAutomatico('quinta-colaborador')
              : undefined
          }
        />
        {t.id === 'quinta-lider' && t.exige_confirmacao && !t.confirmado ? (
          <button
            type="button"
            disabled={confirmando === t.id}
            onClick={() => void onConfirmar(t.id)}
            className="mt-3 rounded-lg border border-dourado-base bg-dourado-50 px-4 py-2.5 text-sm font-semibold text-coffee-base disabled:opacity-50 min-h-[44px]"
          >
            {confirmando === t.id ? 'Salvando…' : 'Assisti e entendi'}
          </button>
        ) : null}
        {linkQuinta ? (
          <Link href={linkQuinta} className="inline-block mt-2 text-xs text-dourado-base underline">
            Abrir também em {termoReconhecimento}
          </Link>
        ) : null}
      </div>
    );
  }

  if (linkQuinta) {
    return (
      <Link href={linkQuinta} className={btnCls}>
        Ir para {termoQuinta} ({graosCurto})
      </Link>
    );
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => onAbrir(t.id)} className={btnCls}>
        {ehTexto ? 'Ler material' : 'Assistir vídeo'}
      </button>
    );
  }

  return (
    <div>
      {ehTexto && t.conteudo_texto ? (
        <TreinamentoRichText conteudo={t.conteudo_texto} />
      ) : t.embed_url ? (
        <QuintaTreinoEmbed embedUrl={t.embed_url} titulo={t.titulo} resumo={t.descricao ?? ''} />
      ) : null}
      {t.exige_confirmacao && !t.confirmado ? (
        <button
          type="button"
          disabled={confirmando === t.id}
          onClick={() => void onConfirmar(t.id)}
          className="mt-3 rounded-lg border border-dourado-base bg-dourado-50 px-4 py-2.5 text-sm font-semibold text-coffee-base disabled:opacity-50 min-h-[44px]"
        >
          {confirmando === t.id ? 'Salvando…' : 'Assisti e entendi'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRecolher}
          className="mt-3 text-sm text-cafeteria-600 hover:text-coffee-base underline"
        >
          Recolher
        </button>
      )}
    </div>
  );
}
