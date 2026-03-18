'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Escala {
  id: string;
  data: string;
  hora_entrada: string;
  hora_saida: string;
  observacao: string | null;
}

export default function MinhaEscalaPage() {
  const router = useRouter();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loading, setLoading] = useState(true);
  const [semSessao, setSemSessao] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      router.push('/login');
      return;
    }

    fetch('/api/portal/escala?dias=30', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.escalas) {
          setEscalas(data.escalas);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6 flex justify-center">
        <XicaraCarregando size="md" label="Carregando sua escala…" />
      </div>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-6">
        Minha escala
      </h1>

      {escalas.length === 0 ? (
        <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
          <p className="text-coffee-base">
            Nenhuma escala cadastrada para os próximos dias. Entre em contato com seu supervisor.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dourado-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-200">
              <tr>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Data</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Entrada</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Saída</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Observação</th>
              </tr>
            </thead>
            <tbody>
              {escalas.map((e) => (
                <tr key={e.id} className="border-t border-cream-200 hover:bg-cream-50">
                  <td className="px-4 py-3 text-coffee-base font-medium">
                    {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-coffee-100">{e.hora_entrada}</td>
                  <td className="px-4 py-3 text-coffee-100">{e.hora_saida}</td>
                  <td className="px-4 py-3 text-coffee-100">{e.observacao ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
