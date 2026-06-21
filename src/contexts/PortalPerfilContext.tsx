'use client';

import { createContext, useContext } from 'react';

export type PortalPerfilContextValue = {
  role: string;
  podeVisitaRh: boolean;
  carregado: boolean;
};

const PortalPerfilContext = createContext<PortalPerfilContextValue>({
  role: 'colaborador',
  podeVisitaRh: false,
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
