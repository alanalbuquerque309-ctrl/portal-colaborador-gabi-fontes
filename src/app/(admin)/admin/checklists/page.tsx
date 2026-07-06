import { AdminChecklistsClient } from '@/components/checklists/AdminChecklistsClient';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';

export const metadata = {
  title: 'Checklists operacionais — Admin',
};

export default function AdminChecklistsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Checklists operacionais"
        description="Acompanhe aberturas e fechamentos da rede. Consulta manual, sem polling automático."
      />
      <AdminChecklistsClient />
    </div>
  );
}
