'use client';

import type { ReactNode } from 'react';
import { usePortalPerfil } from '@/contexts/PortalPerfilContext';
import { normalizePortalRole } from '@/lib/roles';

const ROLES_TERMOMETRO = new Set(['admin', 'rh', 'socio']);

/**
 * Termômetro de emoções é uso interno (RH / Daniel / Keila / sócios).
 * Não renderiza nada para colaboradores, líderes ou gerentes.
 */
export function TermometroHomeGate({ children }: { children: ReactNode }) {
  const { role, carregado } = usePortalPerfil();
  if (!carregado) return null;
  if (!ROLES_TERMOMETRO.has(normalizePortalRole(role))) return null;
  return <>{children}</>;
}
