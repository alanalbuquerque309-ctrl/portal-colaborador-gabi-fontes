import { Suspense } from 'react';
import { EvolucaoAdminPanel } from '@/components/admin/EvolucaoAdminPanel';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

export default function AdminEvolucaoPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <XicaraCarregando size="lg" label="Carregando saúde da equipe…" />
        </div>
      }
    >
      <EvolucaoAdminPanel />
    </Suspense>
  );
}
