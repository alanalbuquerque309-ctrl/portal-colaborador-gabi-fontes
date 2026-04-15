'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Endereço antigo: unificado em Relatórios por filial. */
export default function LiderancaRelatorioRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/relatorios-avaliacoes');
  }, [router]);
  return (
    <p className="text-cafeteria-600 text-center py-12 text-sm">
      Redirecionando para relatórios de avaliações…
    </p>
  );
}
