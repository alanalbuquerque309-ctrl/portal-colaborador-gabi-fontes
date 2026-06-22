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

  const hojeIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  return (
    <main>
      <div className="flex items-center gap-3 mb-5">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-oceano-100 text-oceano-600 text-2xl"
        >
          📅
        </span>
        <div>
          <h1 className="text-2xl font-display font-semibold text-cafeteria-900 leading-tight">Minha escala</h1>
          {periodoFmt && <p className="text-sm text-cafeteria-600">A partir de {periodoFmt}</p>}
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-terracota-300 bg-terracota-50 p-4 mb-4 text-sm text-terracota-700">
          {erro}
        </div>
      )}

      {aviso && !erro && (
        <div className="rounded-xl border border-mel-300 bg-mel-50 p-4 mb-4 text-sm text-mel-700">{aviso}</div>
      )}

      {escalas.length === 0 && !erro ? (
        <div className="rounded-2xl border border-oceano-200/70 bg-gradient-to-br from-oceano-50/60 via-white to-cream-50 p-6">
          <p className="text-cafeteria-800">
            Nenhum dia de escala neste período. Se você já deveria ver folgas ou turnos, fale com o RH.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {escalas.map((e) => {
            const folga =
              (e.observacao ?? '').toLowerCase().includes('folga') ||
              (e.hora_entrada === '00:00' && e.hora_saida === '00:00');
            const ehHoje = e.data === hojeIso;
            const d = new Date(e.data + 'T12:00:00');
            const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
            const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const obsLimpa = (e.observacao ?? '').toLowerCase().includes('folga') ? null : e.observacao;
            return (
              <li
                key={e.id}
                className={`rounded-2xl border p-4 shadow-sm transition-shadow ${
                  ehHoje
                    ? 'border-dourado-base ring-2 ring-dourado-base/30 bg-gradient-to-br from-mel-50/70 via-white to-cream-50'
                    : folga
                      ? 'border-cafeteria-200 bg-cafeteria-50/60'
                      : 'border-oceano-200/70 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-cafeteria-900 capitalize leading-tight">
                      {semana}
                      {ehHoje && (
                        <span className="ml-2 align-middle text-[11px] font-bold uppercase tracking-wide text-dourado-500">
                          Hoje
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-cafeteria-600 capitalize">{diaMes}</p>
                  </div>
                  {folga ? (
                    <span className="shrink-0 rounded-full bg-cafeteria-200/80 px-3 py-1.5 text-sm font-semibold text-cafeteria-700">
                      Folga
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-oceano-100 px-3 py-1.5 text-sm font-bold tabular-nums text-oceano-700">
                      {e.hora_entrada}
                      <span className="text-oceano-400" aria-hidden>
                        →
                      </span>
                      {e.hora_saida}
                    </span>
                  )}
                </div>
                {obsLimpa && <p className="mt-2 text-sm text-cafeteria-600">{obsLimpa}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
