'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const colaboradorId = searchParams.get('colaborador_id');
  const unidadeId = searchParams.get('unidade_id') || '';
  const [cpfOk, setCpfOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!colaboradorId) return;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.colaborador && d.colaborador.cpf_cadastrado === false) {
          router.replace('/completar-cpf');
          return;
        }
        if (d.ok && d.colaborador && d.colaborador.perfil_completo === false) {
          router.replace('/portal/perfil?completar=1');
          return;
        }
        setCpfOk(true);
      })
      .catch(() => setCpfOk(true));
  }, [colaboradorId, router]);

  if (!colaboradorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <p className="text-coffee-base">Acesso inválido. Faça login novamente.</p>
      </div>
    );
  }

  if (cpfOk === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <XicaraCarregando size="lg" label="Carregando…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <OnboardingFlow colaboradorId={colaboradorId} unidadeId={unidadeId} />
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
