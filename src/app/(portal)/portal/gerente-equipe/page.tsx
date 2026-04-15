'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';

type Linha = {
  id: string;
  nome: string;
  media_mes: number | null;
  dias_com_avaliacao: number;
};

function mesAtualInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function GerenteEquipeMesPage() {
  const router = useRouter();
  const [mes, setMes] = useState(mesAtualInput);
  const [sessionOk, setSessionOk] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mesRef, setMesRef] = useState('');

  useEffect(() => {
    const s = getPortalSession();
    const r = (s?.role || '').toLowerCase();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    if (r !== 'gerente' && r !== 'master') {
      router.replace('/portal');
      return;
    }
    setSessionOk(true);
  }, [router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/gerente-equipe-mes?mes=${encodeURIComponent(mes)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.status === 403) {
        router.replace('/portal');
        return;
      }
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível carregar.');
        setLinhas([]);
        return;
      }
      setLinhas(data.colaboradores ?? []);
      setMesRef(data.mes_referencia ?? mes);
    } catch {
      setErro('Erro de conexão.');
      setLinhas([]);
    } finally {
      setCarregando(false);
    }
  }, [mes, router]);

  useEffect(() => {
    if (!sessionOk) return;
    void carregar();
  }, [sessionOk, carregar]);

  const labelMes = useMemo(() => {
    const [y, m] = mes.split('-').map(Number);
    if (!y || !m) return mes;
    try {
      return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return mes;
    }
  }, [mes]);

  if (!sessionOk) {
    return <p className="text-cafeteria-700 text-center py-12">Carregando…</p>;
  }

  return (
    <main className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Equipe no mês
        </h1>
        <p className="text-cafeteria-600 mt-1 text-sm md:text-base max-w-2xl">
          Médias do mês dos colaboradores com você como líder direto — útil para feedback e acompanhamento.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="mes-equipe" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Mês
          </label>
          <input
            id="mes-equipe"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-cafeteria-900 focus:border-dourado-base focus:outline-none focus:ring-1 focus:ring-dourado-base"
          />
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="rounded-lg border border-cafeteria-300 px-4 py-2 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50"
        >
          Atualizar
        </button>
      </div>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-cafeteria-600">Carregando…</p>
      ) : (
        <section className="rounded-xl border border-cafeteria-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg text-cafeteria-900 mb-1 capitalize">{labelMes}</h2>
          <p className="text-xs text-cafeteria-500 mb-4">Referência: {mesRef}</p>
          {linhas.length === 0 ? (
            <p className="text-sm text-cafeteria-700">
              Nenhum colaborador com você como líder direto, ou ainda não há avaliações neste mês.
            </p>
          ) : (
            <ul className="divide-y divide-cafeteria-100">
              {linhas.map((row) => (
                <li key={row.id} className="py-3 flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-cafeteria-900">{row.nome}</span>
                  <span className="text-sm text-cafeteria-700">
                    {row.media_mes != null ? (
                      <>
                        média <strong>{row.media_mes.toFixed(2)}</strong>
                        <span className="text-cafeteria-500">
                          {' '}
                          ({row.dias_com_avaliacao} dia{row.dias_com_avaliacao === 1 ? '' : 's'} avaliado
                          {row.dias_com_avaliacao === 1 ? '' : 's'})
                        </span>
                      </>
                    ) : (
                      <span className="text-cafeteria-500">sem média no mês</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
