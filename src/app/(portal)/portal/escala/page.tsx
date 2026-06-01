'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<{ de: string; ate: string } | null>(null);

  useEffect(() => {
    fetch('/api/portal/escala?dias=45', { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401) {
          router.push('/login');
          return null;
        }
        return data;
      })
      .then((data) => {
        if (!data) return;
        if (!data.ok) {
          setErro(data.erro ?? 'Não foi possível carregar a escala.');
          return;
        }
        setEscalas(Array.isArray(data.escalas) ? data.escalas : []);
        if (data.periodo) setPeriodo(data.periodo);
        const meta = data.meta as { aviso_12x36?: string | null; aviso_vazio?: string | null } | undefined;
        setAviso(meta?.aviso_12x36 ?? meta?.aviso_vazio ?? null);
      })
      .catch(() => setErro('Falha de rede ao carregar a escala.'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6 flex justify-center">
        <XicaraCarregando size="md" label="Carregando sua escala…" />
      </div>
    );
  }

  const periodoFmt =
    periodo?.de && periodo?.ate
      ? `${new Date(`${periodo.de}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
      : null;

  return (
    <main>
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-2">Minha escala</h1>
      {periodoFmt && (
        <p className="text-sm text-coffee-100 mb-6">Calendário a partir de {periodoFmt}</p>
      )}

      {erro && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 mb-4 text-sm text-red-900">{erro}</div>
      )}

      {aviso && !erro && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4 text-sm text-amber-950">
          {aviso}
        </div>
      )}

      {escalas.length === 0 && !erro ? (
        <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
          <p className="text-coffee-base">
            Nenhum dia de escala neste período. Se você já deveria ver folgas ou turnos, fale com o RH para
            cadastrar ou rodar a atualização de junho.
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
              {escalas.map((e) => {
                const folga =
                  (e.observacao ?? '').toLowerCase().includes('folga') ||
                  (e.hora_entrada === '00:00' && e.hora_saida === '00:00');
                return (
                  <tr
                    key={e.id}
                    className={`border-t border-cream-200 ${folga ? 'bg-cafeteria-50/80' : 'hover:bg-cream-50'}`}
                  >
                    <td className="px-4 py-3 text-coffee-base font-medium">
                      {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 text-coffee-100">{folga ? '—' : e.hora_entrada}</td>
                    <td className="px-4 py-3 text-coffee-100">{folga ? '—' : e.hora_saida}</td>
                    <td className="px-4 py-3 text-coffee-100">
                      {folga ? (
                        <span className="font-medium text-cafeteria-700">Folga</span>
                      ) : (
                        e.observacao ?? '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
