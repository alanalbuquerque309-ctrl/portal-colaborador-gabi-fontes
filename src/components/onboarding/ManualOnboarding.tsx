'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ManualOnboardingProps {
  /** true quando rolou até o fim do texto E marcou ciência */
  onReadyChange: (ready: boolean) => void;
}

/**
 * Leitura obrigatória: rolar até o fim do resumo + ciência explícita.
 * O PDF oficial continua disponível para abrir/baixar.
 */
export function ManualOnboarding({ onReadyChange }: ManualOnboardingProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [chegouAoFim, setChegouAoFim] = useState(false);
  const [ciencia, setCiencia] = useState(false);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setChegouAoFim(true);
      },
      { root, rootMargin: '0px 0px -40px 0px', threshold: 0.01 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  const notify = useCallback(() => {
    onReadyChange(chegouAoFim && ciencia);
  }, [chegouAoFim, ciencia, onReadyChange]);

  useEffect(() => {
    notify();
  }, [notify]);

  return (
    <div className="space-y-4">
      <p className="text-coffee-base text-sm leading-relaxed font-medium">
        Leia o resumo do Manual do Colaborador até o final. Em seguida, confira o PDF completo se
        desejar e declare que deu ciência do conteúdo.
      </p>

      <div
        ref={scrollRef}
        className="max-h-[min(420px,55vh)] overflow-y-auto rounded-xl border-2 border-dourado-200 bg-cream-50 p-4 text-coffee-base text-sm leading-relaxed space-y-4 scroll-smooth"
        tabIndex={0}
        role="region"
        aria-label="Resumo do manual do colaborador — role até o fim"
      >
        <p>
          O <strong>Manual do Colaborador</strong> reúne as diretrizes da Cafeteria Gabi Fontes para
          que todos atuem com o mesmo padrão de <strong>qualidade</strong>,{' '}
          <strong>acolhimento</strong> e <strong>segurança</strong>, respeitando clientes e equipe.
        </p>
        <p>
          Nossos <strong>três pilares</strong> são: <strong>Qualidade</strong>,{' '}
          <strong>Aconchego</strong> e <strong>Atendimento</strong>. Eles devem orientar decisões no
          balcão, na cozinha e em qualquer contato com o cliente.
        </p>
        <p>
          A <strong>história da marca</strong> começou com poucos lugares e muito cuidado com o que
          servimos — o cuidado com receitas e ingredientes faz parte da nossa identidade.
        </p>
        <p>
          Em caso de <strong>erro da casa</strong> que prejudique a experiência do cliente, seguimos
          a regra de ouro acordada no manual: o cliente <strong>não deve arcar com o erro</strong>{' '}
          quando a falha for nossa. Consulte o PDF para detalhes de procedimento na sua unidade.
        </p>
        <p>
          <strong>Higiene e segurança alimentar</strong> são obrigatórias: uso correto de uniforme
          quando aplicável, lavagem de mãos, armazenamento de alimentos e atenção a validades — tudo
          descrito no manual completo.
        </p>
        <p>
          <strong>Comunicação respeitosa</strong> com colegas e liderança evita conflitos e mantém o
          ambiente saudável. Dúvidas sobre escala, férias ou benefícios devem seguir o canal indicado
          pelo RH ou pela gestão da loja.
        </p>
        <p>
          O <strong>manual em PDF</strong> traz capítulos adicionais (uniformes, abertura e fechamento,
          atendimento em situações específicas, etc.). Este resumo não substitui o documento oficial;
          serve para garantir que você percorreu as informações essenciais antes do questionário.
        </p>
        <p className="text-coffee-100 text-xs border-t border-dourado-100 pt-3">
          Ao chegar aqui no fim do texto, o botão &quot;Próximo&quot; só será liberado após você marcar
          a ciência abaixo.
        </p>
        <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      </div>

      <a
        href="/manual-colaborador.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-dourado-base px-4 py-3 text-cream-100 font-medium hover:bg-dourado-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Abrir manual completo (PDF)
      </a>

      <label
        className={`flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-colors ${
          chegouAoFim ? 'border-dourado-300 bg-white' : 'border-cream-300 bg-cream-100 opacity-80'
        }`}
      >
        <input
          type="checkbox"
          checked={ciencia}
          disabled={!chegouAoFim}
          onChange={(e) => setCiencia(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-coffee-50 text-dourado-base focus:ring-dourado-base shrink-0 disabled:opacity-50"
        />
        <span className="text-sm text-coffee-base">
          {chegouAoFim
            ? 'Declaro que li o resumo acima até o final, tive acesso ao manual em PDF e dou ciência do conteúdo apresentado.'
            : 'Role o resumo até o final para habilitar esta confirmação.'}
        </span>
      </label>
    </div>
  );
}
