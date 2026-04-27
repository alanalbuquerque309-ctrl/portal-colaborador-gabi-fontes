'use client';

import { useEffect, useMemo, useState } from 'react';

type EventoManual = {
  id: string;
  colaborador_nome: string;
  colaborador_telefone: string | null;
  tipo: string;
  tipo_label: string;
  manual_path: string | null;
  ip: string | null;
  created_at: string;
};

function formatarData(valor: string): string {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { hour12: false });
}

export default function AdminManualEventosPage() {
  const [eventos, setEventos] = useState<EventoManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/admin/manual-eventos?limit=150', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; erro?: string; eventos?: EventoManual[] }) => {
        if (cancel) return;
        if (!data.ok) {
          setErro(data.erro || 'Não foi possível carregar os eventos.');
        } else {
          setEventos(Array.isArray(data.eventos) ? data.eventos : []);
        }
      })
      .catch(() => {
        if (!cancel) setErro('Erro ao carregar eventos.');
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const totalPorTipo = useMemo(() => {
    return eventos.reduce<Record<string, number>>((acc, item) => {
      acc[item.tipo_label] = (acc[item.tipo_label] || 0) + 1;
      return acc;
    }, {});
  }, [eventos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-coffee-base">Eventos de manuais</h1>
        <p className="text-sm text-coffee-100 mt-2">
          Registos de tentativas de PrintScreen e impressão nas páginas de manuais.
        </p>
      </div>

      {erro && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</p>
      )}

      {!loading && !erro && (
        <div className="rounded-xl border border-dourado-200 bg-white p-4">
          <p className="text-sm text-coffee-100 mb-2">Resumo</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(totalPorTipo).map(([tipo, total]) => (
              <span
                key={tipo}
                className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-coffee-base"
              >
                {tipo}: {total}
              </span>
            ))}
            {eventos.length === 0 && <span className="text-xs text-coffee-100">Sem eventos no período.</span>}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dourado-200 bg-white p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-coffee-100 border-b border-cream-300">
              <th className="py-2 pr-4">Quando</th>
              <th className="py-2 pr-4">Colaborador</th>
              <th className="py-2 pr-4">Evento</th>
              <th className="py-2 pr-4">Manual</th>
              <th className="py-2 pr-4">IP</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              eventos.map((e) => (
                <tr key={e.id} className="border-b border-cream-200 text-coffee-base align-top">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatarData(e.created_at)}</td>
                  <td className="py-2 pr-4">
                    <div>{e.colaborador_nome}</div>
                    {e.colaborador_telefone && (
                      <div className="text-xs text-coffee-100">{e.colaborador_telefone}</div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{e.tipo_label}</td>
                  <td className="py-2 pr-4">{e.manual_path || '-'}</td>
                  <td className="py-2 pr-4">{e.ip || '-'}</td>
                </tr>
              ))}
            {!loading && eventos.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-coffee-100">
                  Nenhum evento registado até agora.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-coffee-100">
                  Carregando…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
