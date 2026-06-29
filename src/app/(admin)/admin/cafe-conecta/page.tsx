import { Suspense } from 'react';
import { CafeConectaAdminPanel } from '@/components/admin/CafeConectaAdminPanel';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { getTermo } from '@/lib/tenant/terminology';

export default function AdminCafeConectaPage() {
  const termoCafeConecta = getTermo('cafe_conecta');
  return (
    <Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <XicaraCarregando size="lg" label={`Carregando ${termoCafeConecta}…`} />
        </div>
      }
    >
      <CafeConectaAdminPanel />
    </Suspense>
  );
}
