'use client';

import type { LiderOrganograma, NoOrganogramaLideranca } from '@/lib/organograma-lideranca';

function ListaLideres({ lideres }: { lideres: LiderOrganograma[] }) {
  if (lideres.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-0.5">
      {lideres.map((l) => (
        <li key={l.id} className="text-sm text-coffee-base">
          <span className="font-medium">{l.nome}</span>
          {l.paridadeMes && (
            <span className="ml-1.5 text-xs text-coffee-100">({l.paridadeMes})</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function CartaoNo({ no, nivel }: { no: NoOrganogramaLideranca; nivel: number }) {
  const ehRaiz = nivel === 0;
  const ehUnidade = nivel === 1;
  const ehGerencia = no.id.endsWith('-gerencia');

  const borda =
    ehRaiz
      ? 'border-dourado-500 bg-dourado-50/50'
      : ehUnidade
        ? 'border-dourado-400 bg-white'
        : ehGerencia
          ? 'border-dourado-300 bg-dourado-50/30'
          : no.compacto
            ? 'border-cream-300 bg-cream-50/80'
            : 'border-cream-300 bg-white';

  return (
    <div className="flex flex-col items-center min-w-[140px] max-w-[220px]">
      <div className={`rounded-xl border px-3 py-2.5 shadow-sm w-full text-center ${borda}`}>
        <p
          className={`font-display leading-tight ${
            ehRaiz ? 'text-base font-semibold text-coffee-base' : 'text-sm font-semibold text-coffee-base'
          }`}
        >
          {no.titulo}
        </p>
        {no.descricao && !no.compacto && (
          <p className="text-[11px] text-coffee-100 mt-0.5 leading-snug">{no.descricao}</p>
        )}
        <ListaLideres lideres={no.lideres} />
        {no.compacto && (
          <p className="text-[11px] text-coffee-100 mt-1 italic">Mesma gerência</p>
        )}
      </div>

      {no.filhos.length > 0 && (
        <>
          <div className="w-px h-4 bg-dourado-300 shrink-0" aria-hidden />
          <div
            className={`flex gap-3 justify-center ${
              ehUnidade || ehGerencia ? 'flex-wrap' : 'flex-col items-center'
            }`}
          >
            {no.filhos.map((filho) => (
              <div key={filho.id} className="flex flex-col items-center">
                <div className="w-px h-3 bg-dourado-300 shrink-0" aria-hidden />
                <CartaoNo no={filho} nivel={nivel + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Props = {
  raiz: NoOrganogramaLideranca;
  vazio?: boolean;
};

export function OrganogramaLideranca({ raiz, vazio }: Props) {
  if (vazio || raiz.filhos.length === 0) {
    return (
      <p className="text-sm text-coffee-100">
        Sem dados para o organograma. Aplique o mapa operacional em «Liderança por setor».
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-coffee-100 max-w-2xl">
        Visão em árvore da liderança operacional: quem responde por cada filial e setor. Não
        representa hierarquia de cargos nem linha de reporte individual de cada colaborador.
      </p>
      <div className="overflow-x-auto pb-4 -mx-1 px-1">
        <div className="min-w-max flex flex-col items-center py-2">
          <CartaoNo no={raiz} nivel={0} />
        </div>
      </div>
      <div className="rounded-lg border border-cream-200 bg-cream-50/50 px-3 py-2 text-xs text-coffee-100 max-w-2xl">
        <strong className="text-coffee-base">Legenda:</strong> caixas douradas = gerência da loja
        (plantão 12x36 quando aplicável); setores cinza com «mesma gerência» = mesmos líderes da
        gerência; Daniel aparece nos blocos de CD, RH, Motorista e Administração.
      </div>
    </div>
  );
}
