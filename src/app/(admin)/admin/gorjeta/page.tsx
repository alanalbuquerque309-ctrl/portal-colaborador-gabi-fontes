'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Gorjeta/fechamento de índice saiu do portal — ADM e financeiro cuidam fora daqui. */
export default function AdminGorjetaPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);
  return (
    <p className="text-sm text-cafeteria-600 py-8 text-center">
      Redirecionando… O fechamento de gorjeta não fica mais neste portal.
    </p>
  );
}
