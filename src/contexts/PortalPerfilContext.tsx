'use client';

import { createContext, useContext } from 'react';

export type PortalPerfilContextValue = {
  role: string;
  colaboradorId: string | null;
  unidadeId: string | null;
  podeVisitaRh: boolean;
  podeAvaliacaoEquipe: boolean;
  graosCongelado: boolean;
  onboardingCompleto: boolean;
  onboardingManualEscolhidoFile: string | null;
  setor: string | null;
  cargo: string | null;
  carregado: boolean;
};

const PortalPerfilContext = createContext<PortalPerfilContextValue>({
  role: 'colaborador',
  colaboradorId: null,
  unidadeId: null,
  podeVisitaRh: false,
  podeAvaliacaoEquipe: false,
  graosCongelado: true,
  onboardingCompleto: false,
  onboardingManualEscolhidoFile: null,
  setor: null,
  cargo: null,
  carregado: false,
});

export function PortalPerfilProvider({
  value,
  children,
}: {
  value: PortalPerfilContextValue;
  children: React.ReactNode;
}) {
  return <PortalPerfilContext.Provider value={value}>{children}</PortalPerfilContext.Provider>;
}

export function usePortalPerfil(): PortalPerfilContextValue {
  return useContext(PortalPerfilContext);
}
