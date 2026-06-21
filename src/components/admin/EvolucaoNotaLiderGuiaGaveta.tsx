'use client';

import { ILI_MIN_FEEDBACK, ILI_MIN_PCT_AVALIADO, ILI_PESOS } from '@/lib/nota-lider-constants';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Gaveta recolhível: o que é a nota do líder (linguagem simples).
 */
export function EvolucaoNotaLiderGuiaGaveta() {
  return (
    <details className="group rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-cream-50/40 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-emerald-50/40 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-semibold text-coffee-base">
            O que é a nota do líder?
          </p>
          <p className="text-xs sm:text-sm text-cafeteria-600 mt-0.5">
            Toque aqui para entender o número ao lado do nome (não é soma de estrelas).
          </p>
        </div>
        <svg
          className="w-5 h-5 shrink-0 text-emerald-800 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </summary>

      <div className="border-t border-emerald-100 px-4 py-4 sm:px-5 sm:py-5 space-y-4 text-sm text-coffee-base leading-relaxed">
        <p>
          É uma <strong className="font-semibold">nota de 0 a 100</strong> da semana. Junta várias coisas
          num número só, para comparar quem está cuidando bem da equipe.{' '}
          <strong className="font-semibold">Não é a soma das estrelas</strong> que o gerente dá na avaliação.
        </p>

        <div>
          <p className="font-semibold text-coffee-base mb-2">O que entra nessa nota</p>
          <ul className="space-y-2 m-0 p-0 list-none">
            <li className="rounded-xl border border-cafeteria-100 bg-white/90 px-3 py-2.5">
              <span className="font-medium">{pct(ILI_PESOS.feedback)} — O que a equipe fala de você</span>
              <span className="block text-xs text-cafeteria-600 mt-0.5">
                Notas que os colaboradores deram ao líder na semana (comunicação, apoio, clima…).
              </span>
            </li>
            <li className="rounded-xl border border-cafeteria-100 bg-white/90 px-3 py-2.5">
              <span className="font-medium">{pct(ILI_PESOS.equipe)} — Média da sua equipe</span>
              <span className="block text-xs text-cafeteria-600 mt-0.5">
                Como a equipe foi na avaliação semanal (vestimenta, pontualidade, desempenho…).
              </span>
            </li>
            <li className="rounded-xl border border-cafeteria-100 bg-white/90 px-3 py-2.5">
              <span className="font-medium">{pct(ILI_PESOS.disciplina)} — Avaliou todo mundo?</span>
              <span className="block text-xs text-cafeteria-600 mt-0.5">
                Quanto da equipe você avaliou na semana. Quem deixa gente para trás perde ponto aqui.
              </span>
            </li>
            <li className="rounded-xl border border-cafeteria-100 bg-white/90 px-3 py-2.5">
              <span className="font-medium">{pct(ILI_PESOS.treinamentos)} — Equipe no portal</span>
              <span className="block text-xs text-cafeteria-600 mt-0.5">
                Parte da equipe que já fez onboarding e manuais no portal.
              </span>
            </li>
            <li className="rounded-xl border border-cafeteria-100 bg-white/90 px-3 py-2.5">
              <span className="font-medium">{pct(ILI_PESOS.engajamento)} — Troféus entre colegas</span>
              <span className="block text-xs text-cafeteria-600 mt-0.5">
                Reconhecimentos que a equipe recebeu de colegas na semana.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-cream-50 border border-cafeteria-100 px-3 py-3 space-y-2 text-xs sm:text-sm text-cafeteria-800">
          <p className="font-semibold text-coffee-base m-0">Como ler a lista</p>
          <ul className="m-0 pl-4 space-y-1 list-disc">
            <li>
              <strong>Nota</strong> ao lado do nome: resultado da semana (ex.: 96 e 91 = quem tem 96 foi
              melhor no conjunto, não só “estrelas mais altas”).
            </li>
            <li>
              <strong>Mudança</strong>: se a nota subiu, caiu ou ficou parecida nas últimas semanas.
            </li>
            <li>
              <strong>Semana incompleta</strong>: ainda faltam dados (equipe pequena, pouca gente avaliada
              ou poucas respostas sobre o líder). A nota aparece, mas não entra no ranking oficial.
            </li>
            <li>
              Toque no <strong>nome do líder</strong> para ver média da equipe, o que a equipe falou dele
              (ou dela) e detalhes.
            </li>
          </ul>
        </div>

        <p className="text-xs text-cafeteria-600 m-0">
          Para valer no ranking: equipe com 3 ou mais pessoas, pelo menos{' '}
          {Math.round(ILI_MIN_PCT_AVALIADO * 100)}% avaliados na semana e {ILI_MIN_FEEDBACK} ou mais
          respostas sobre a liderança.
        </p>
      </div>
    </details>
  );
}
