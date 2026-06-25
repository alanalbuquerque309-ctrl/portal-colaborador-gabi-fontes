'use client';

import {
  ESTILO_AREA,
  type AreaOrganogramaId,
} from '@/lib/config-organograma-empresa';
import type { NoOrganogramaEmpresa } from '@/lib/organograma-empresa';

function CaixaNo({ no }: { no: NoOrganogramaEmpresa }) {
  const estilo = ESTILO_AREA[no.area as AreaOrganogramaId]?.box ?? 'bg-white border-cream-300';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-lg border-2 px-3 py-2 min-w-[130px] max-w-[200px] text-center shadow-sm ${estilo}`}
      >
        <p className="text-xs font-semibold leading-snug">{no.titulo}</p>
        {no.ocupantes.length > 0 && (
          <p className="text-[11px] mt-1 font-medium opacity-90 leading-tight">
            {no.ocupantes.slice(0, 4).join(' · ')}
            {no.ocupantes.length > 4 ? ` +${no.ocupantes.length - 4}` : ''}
          </p>
        )}
      </div>
      {no.filhos && no.filhos.length > 0 && (
        <>
          <div className="w-0.5 h-3 bg-blue-400 shrink-0" aria-hidden />
          <div
            className={`flex gap-2 justify-center items-start ${
              (no.filhos?.length ?? 0) > 1 ? 'flex-wrap max-w-[min(100%,720px)]' : 'flex-col items-center'
            }`}
          >
            {no.filhos.map((filho) => (
              <div key={filho.id} className="flex flex-col items-center">
                <div className="w-0.5 h-2 bg-blue-400 shrink-0" aria-hidden />
                <CaixaNo no={filho} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Pilar = {
  id: string;
  tituloPilar?: string;
  raiz: NoOrganogramaEmpresa;
};

type Props = {
  pilares: Pilar[];
  carregando?: boolean;
};

export function OrganogramaEmpresa({ pilares, carregando }: Props) {
  const areasUsadas = Object.entries(ESTILO_AREA).filter(([id]) =>
    pilares.some((p) => contemArea(p.raiz, id as AreaOrganogramaId))
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-coffee-base max-w-3xl">
        Estrutura de <strong>cargos e funções</strong> da empresa (modelo do organograma Gabi Fontes).
        Nomes aparecem quando o cadastro do colaborador bate com cargo/setor. Isto é independente do{' '}
        <strong>mapa operacional</strong> (quem lidera cada filial na avaliação semanal).
      </p>

      <div className="rounded-xl border border-cream-200 bg-cream-50/60 p-3">
        <p className="text-xs font-semibold text-coffee-base mb-2">Legenda</p>
        <div className="flex flex-wrap gap-2">
          {areasUsadas.map(([id, est]) => (
            <span
              key={id}
              className={`inline-flex items-center gap-1.5 rounded-md border-2 px-2 py-1 text-[11px] ${est.box}`}
            >
              {est.label}
            </span>
          ))}
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-coffee-100">Carregando nomes do cadastro…</p>
      ) : (
        <div className="overflow-x-auto pb-6 -mx-1 px-1">
          <div className="flex gap-8 items-start min-w-max py-2">
            {pilares.map((pilar) => (
              <section
                key={pilar.id}
                className="flex flex-col items-center min-w-[160px] max-w-[280px]"
              >
                {pilar.tituloPilar && (
                  <p className="text-xs font-display font-semibold text-coffee-100 uppercase tracking-wide mb-3 text-center">
                    {pilar.tituloPilar}
                  </p>
                )}
                <CaixaNo no={pilar.raiz} />
              </section>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-coffee-100 max-w-3xl">
        Caixas sem nome = função prevista no organograma, ainda sem colaborador com cargo/setor
        correspondente no portal. Para ajustar a árvore, edite{' '}
        <code className="text-[10px] bg-cream-100 px-1 rounded">config-organograma-empresa.ts</code>.
      </p>
    </div>
  );
}

function contemArea(no: NoOrganogramaEmpresa, area: AreaOrganogramaId): boolean {
  if (no.area === area) return true;
  return (no.filhos ?? []).some((f) => contemArea(f, area));
}
