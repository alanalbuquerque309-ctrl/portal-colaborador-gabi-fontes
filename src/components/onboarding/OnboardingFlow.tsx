'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { finalizarOnboarding } from '@/app/(auth)/onboarding/actions';
import { Button } from '@/components/ui/Button';
import { VideoBoasVindas } from './VideoBoasVindas';
import { CulturaCards } from './CulturaCards';
import { QuizCultura } from './QuizCultura';
import { setPortalSession } from '@/lib/utils/session';

interface OnboardingFlowProps {
  colaboradorId: string;
  unidadeId?: string;
  videoSrc?: string;
}

const ETAPAS = [
  { id: 'video', titulo: 'Vídeo de boas-vindas' },
  { id: 'cultura', titulo: 'Nossa cultura' },
  { id: 'quiz', titulo: 'Quiz' },
  { id: 'termo', titulo: 'Termo de compromisso' },
];

export function OnboardingFlow({ colaboradorId, unidadeId = '', videoSrc }: OnboardingFlowProps) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [quizValido, setQuizValido] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atual = ETAPAS[etapa];
  const isTermo = atual.id === 'termo';

  const podeAvancar =
    etapa === 0
      ? true
      : etapa === 1
      ? true
      : etapa === 2
      ? quizValido
      : aceite;

  const handleProximo = async () => {
    if (etapa < ETAPAS.length - 1) {
      setEtapa((e) => e + 1);
    } else {
      setLoading(true);
      setErro(null);
      try {
        const { ok, unidade_id: uid, role } = await finalizarOnboarding(colaboradorId);
        if (!ok) throw new Error('Falha ao finalizar');
        setPortalSession(colaboradorId, uid ?? unidadeId ?? '', role);
        router.push('/portal');
      } catch {
        setErro('Não foi possível finalizar. Tente novamente.');
        setLoading(false);
      }
    }
  };

  const handleVoltar = () => {
    if (etapa > 0) setEtapa((e) => e - 1);
  };

  return (
    <div className="min-h-screen pb-8 md:pb-12 bg-cream-100">
      {/* Barra de progresso */}
      <div className="sticky top-0 z-20 bg-cream-100 border-b border-dourado-200 px-4 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-1">
            {ETAPAS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= etapa ? 'bg-dourado-base' : 'bg-cream-300'
                }`}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-coffee-100 text-xs mt-2 text-center">
            {etapa + 1} de {ETAPAS.length}
          </p>
        </div>
      </div>

      {/* Conteúdo da etapa */}
      <section className="max-w-xl mx-auto px-4 pt-6 md:pt-8">
        <div className="rounded-2xl bg-white shadow-xl border border-dourado-200 overflow-hidden">
          <div className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-display font-semibold text-coffee-base mb-4">
              {atual.titulo}
            </h2>

            {atual.id === 'video' && (
              <div className="rounded-xl border-2 border-dourado-200 p-2 bg-cream-50 shadow-inner overflow-hidden">
                <VideoBoasVindas src={videoSrc} className="w-full" />
              </div>
            )}

            {atual.id === 'cultura' && <CulturaCards />}

            {atual.id === 'quiz' && (
              <QuizCultura onValidityChange={setQuizValido} />
            )}

            {atual.id === 'termo' && (
              <>
                <div className="rounded-xl border border-cream-300 bg-cream-50 p-4 text-coffee-base text-sm leading-relaxed mb-6">
                  <p className="font-semibold mb-2">Termo de Compromisso do Colaborador</p>
                  <p>
                    Ao concluir, eu me comprometo a seguir as diretrizes do Manual do Colaborador
                    Gabi Fontes, zelar pela Qualidade, Aconchego e Atendimento em todas as minhas
                    ações, e representar a Cafeteria Gabi Fontes com responsabilidade e orgulho.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={aceite}
                    onChange={(e) => setAceite(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-coffee-50 text-dourado-base focus:ring-dourado-base shrink-0"
                  />
                  <span className="text-sm text-coffee-base">
                    Li e compreendo que represento a Cafeteria Gabi Fontes com responsabilidade e orgulho.
                  </span>
                </label>
              </>
            )}

            {erro && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {erro}
              </p>
            )}

            <div className="flex justify-between gap-4 mt-6 pt-4 border-t border-cream-300">
              <Button
                variant="outline"
                onClick={handleVoltar}
                disabled={etapa === 0 || loading}
                className="min-w-[100px] border-coffee-200 text-coffee-base hover:bg-cream-100"
              >
                Voltar
              </Button>
              <Button
                onClick={handleProximo}
                disabled={!podeAvancar || loading}
                className="min-w-[140px] md:min-w-[180px] bg-dourado-base hover:bg-dourado-400 text-coffee-300"
              >
                {loading
                  ? 'Finalizando…'
                  : etapa < ETAPAS.length - 1
                  ? 'Próximo'
                  : 'Finalizar e Entrar'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
