'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';

type TopItem = { id: string; nome: string; media: number };

type ApiOk = {
  ok: true;
  mes_referencia: string;
  min_dias_ranking: number;
  top_unidade: TopItem[];
  meu_desempenho: { nome: string; media_mes: number | null; dias_com_avaliacao: number } | null;
  nota_privacidade?: string;
};

function mesAtualInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DesempenhoPortalPage() {
  const router = useRouter();
  const [mes, setMes] = useState(mesAtualInput);
  const [sessionOk, setSessionOk] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<ApiOk | null>(null);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    if ((s.role || '').toLowerCase() !== 'colaborador') {
      router.replace('/portal');
      return;
    }
    setSessionOk(true);
  }, [router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/avaliacao-desempenho?mes=${encodeURIComponent(mes)}`, {
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
        setDados(null);
        return;
      }
      setDados(data as ApiOk);
    } catch {
      setErro('Erro de conexão.');
      setDados(null);
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
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">Desempenho</h1>
        <p className="text-cafeteria-600 mt-1 text-sm md:text-base max-w-2xl">
          Reconhecimento interno na sua unidade: destaque do mês e o seu resultado (sem posição no ranking).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="mes-desempenho" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Mês
          </label>
          <input
            id="mes-desempenho"
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
      ) : dados ? (
        <div className="space-y-8">
          <section className="rounded-xl border border-cafeteria-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg text-cafeteria-900 mb-1">Destaques da unidade</h2>
            <p className="text-sm text-cafeteria-600 mb-4 capitalize">{labelMes}</p>
            <p className="text-xs text-cafeteria-500 mb-3">
              Entram no ranking quem tiver pelo menos <strong>{dados.min_dias_ranking}</strong> dias com média no
              mês. Em empate no 3.º lugar, mostramos até 4 pessoas.
            </p>
            {dados.top_unidade.length === 0 ? (
              <p className="text-sm text-cafeteria-700">Ainda não há destaques para este mês.</p>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-cafeteria-800">
                {dados.top_unidade.map((p, i) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-cafeteria-600"> — média {p.media.toFixed(2)}</span>
                    {i === 3 && dados.top_unidade.length === 4 && (
                      <span className="text-cafeteria-500 text-sm"> (empate no 3.º lugar)</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {dados.meu_desempenho && (
            <section className="rounded-xl border border-dourado-base/40 bg-dourado-50/40 p-6">
              <h2 className="font-display text-lg text-cafeteria-900 mb-2">O seu mês</h2>
              <p className="text-cafeteria-800">
                <strong>{dados.meu_desempenho.nome}</strong>
              </p>
              <p className="text-sm text-cafeteria-700 mt-2">
                {dados.meu_desempenho.media_mes != null ? (
                  <>
                    Média no mês: <strong>{dados.meu_desempenho.media_mes.toFixed(2)}</strong>
                    <span className="text-cafeteria-600">
                      {' '}
                      ({dados.meu_desempenho.dias_com_avaliacao} dia
                      {dados.meu_desempenho.dias_com_avaliacao === 1 ? '' : 's'} com avaliação)
                    </span>
                  </>
                ) : (
                  <>Ainda não há média neste mês (sem dias avaliados com nota).</>
                )}
              </p>
              <p className="text-xs text-cafeteria-600 mt-3">
                Não exibimos a sua posição no ranking nem comparamos diretamente com colegas.
              </p>
            </section>
          )}

          {dados.nota_privacidade && (
            <p className="text-xs text-cafeteria-500 max-w-2xl">{dados.nota_privacidade}</p>
          )}
        </div>
      ) : null}
    </main>
  );
}
