import { Suspense } from 'react';
import { ChecklistFormClient } from '@/components/checklists/ChecklistFormClient';
import { PortalPaginaCarregando } from '@/components/ui/PortalPaginaCarregando';

type Props = { params: { tipo: string } };

export default function ChecklistTipoPage({ params }: Props) {
  return (
    <Suspense fallback={<PortalPaginaCarregando label="Carregando…" />}>
      <ChecklistFormClient tipo={params.tipo} />
    </Suspense>
  );
}
