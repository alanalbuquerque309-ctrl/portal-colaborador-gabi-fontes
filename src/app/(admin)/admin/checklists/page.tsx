import Link from 'next/link';
import { AdminChecklistsClient } from '@/components/checklists/AdminChecklistsClient';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';

export const metadata = {
  title: 'Checklists operacionais — Admin',
};

export default function AdminChecklistsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Checklists — consulta da rede"
        description="Aqui você só vê o que já foi preenchido. Para abrir e preencher os formulários de abertura/fechamento, use o portal."
        actions={
          <Link
            href="/portal/checklists"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-dourado-base px-5 py-2.5 text-sm font-bold text-coffee-base hover:bg-dourado-400 shadow-sm"
          >
            Preencher formulários →
          </Link>
        }
      />
      <AdminChecklistsClient />
    </div>
  );
}