'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const colaboradorId = searchParams.get('colaborador_id');
  const unidadeId = searchParams.get('unidade_id') || '';

  if (!colaboradorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <p className="text-coffee-base">Acesso inválido. Faça login novamente.</p>
      </div>
    );
  }

  const videoSrc = process.env.NEXT_PUBLIC_VIDEO_BOAS_VINDAS || undefined;

  return (
    <div className="min-h-screen bg-cream-100">
      <OnboardingFlow
        colaboradorId={colaboradorId}
        unidadeId={unidadeId}
        videoSrc={videoSrc}
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream-100">
          <XicaraCarregando size="lg" label="Carregando…" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
