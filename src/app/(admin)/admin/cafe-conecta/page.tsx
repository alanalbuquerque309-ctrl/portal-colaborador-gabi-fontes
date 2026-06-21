import { Suspense } from 'react';
import { CafeConectaAdminPanel } from '@/components/admin/CafeConectaAdminPanel';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

export default function AdminCafeConectaPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <XicaraCarregando size="lg" label="Carregando Café Conecta…" />
        </div>
      }
    >
      <CafeConectaAdminPanel />
    </Suspense>
  );
}
