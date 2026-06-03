'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type HistoricoSemana = {
  semana_inicio: string;
  semana_label: string;
  respostas: number;
  medias: {
    exemplo: number;
    comunicacao: number;
    suporte: number;
    justica: number;
    clima: number;
    mediaGeral: number;
  };
};

type ApiData = {
  ok: boolean;
  erro?: string;
  mes_referencia?: string;
  nome?: string;
  total_avaliacoes?: number;
  medias?: {
    exemplo: number;
    comunicacao: number;
    suporte: number;
    justica: number;
    clima: number;
  } | null;
  feedback?: {
    mediaGeral: number;
    pilarMaisFraco: string;
    notaMaisBaixa: number;
    feedbackCirurgico: string | null;
    feedbackFaixa: string;
    visual: { nivel: string; cor: string; efeito: 'normal' | 'neon' };
  } | null;
  historico_semanas?: HistoricoSemana[];
  nota_privacidade?: string;
};

function mesAtualInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MinhaLiderancaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [mes, setMes] = useState(mesAtualInput);
  const [dados, setDados] = useState<ApiData | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(
        `/api/portal/avaliacao-lideranca/minha?mes=${encodeURIComponent(mes)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const d = (await res.json()) as ApiData;
      setDados(d);
    } catch {
      setDados({ ok: false, erro: 'Erro de conexão.' });
    } finally {
      setCarregando(false);
    }
  }, [mes]);

  useEffect(() => {
    const s = getPortalSession();
    const role = String(s?.role || '').toLowerCase();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    if (!['gerente', 'master', 'admin'].includes(role)) {
      router.replace('/portal');
      return;
    }
    void carregar();
  }, [router, carregar]);

  const labelMes = useMemo(() => {
    const [y, m] = mes.split('-').map(Number);
    if (!y || !m) return mes;
    try {
      return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return mes;
    }
  }, [mes]);

  if (carregando && !dados) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando..." />
      </div>
    );
  }

  if (!dados?.ok) {
    return (
      <main className="max-w-3xl space-y-4 pb-24 md:pb-8">
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <p className="text-red-700 text-sm">{dados?.erro || 'Não foi possível carregar.'}</p>
      </main>
    );
  }

  const feedback = dados.feedback;
  const historico = dados.historico_semanas ?? [];

  return (
    <main className="max-w-3xl space-y-6 pb-24 md:pb-8">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Minha avaliação de liderança
        </h1>
        <p className="text-sm md:text-base text-cafeteria-600 mt-1">
          Como a equipe te avaliou (anônimo). Use o menu <strong>Avaliar liderança</strong> para{' '}
          <em>enviar</em> avaliações; aqui você <em>recebe</em> o retorno.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="mes-lideranca" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Mês
          </label>
          <input
            id="mes-lideranca"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2.5 text-base text-cafeteria-900 focus:border-dourado-base focus:outline-none focus:ring-1 focus:ring-dourado-base"
          />
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="rounded-lg border border-cafeteria-300 px-4 py-2.5 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50"
        >
          Atualizar
        </button>
      </div>

      <p className="text-sm text-cafeteria-600 capitalize">
        Referência: <strong>{labelMes}</strong>
        {dados.total_avaliacoes != null ? (
          <>
            {' '}
            · <strong>{dados.total_avaliacoes}</strong> resposta
            {dados.total_avaliacoes === 1 ? '' : 's'} no mês
          </>
        ) : null}
      </p>

      {dados.nota_privacidade && (
        <p className="text-sm rounded-lg bg-cafeteria-100 px-3 py-2.5 text-cafeteria-700">
          {dados.nota_privacidade}
        </p>
      )}

      {!dados.medias || !feedback ? (
        <section className="rounded-xl border border-cafeteria-200 bg-white p-5">
          <p className="text-sm md:text-base text-cafeteria-700">
            Ainda não há avaliações neste mês. Colaboradores elegíveis podem te avaliar em{' '}
            <strong>Avaliar liderança</strong> (anônimo, uma vez por semana).
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-cafeteria-200 bg-white p-5">
            <h2 className="font-display text-lg text-cafeteria-900 mb-3">Média do mês</h2>
            <div className="grid gap-2 sm:grid-cols-2 text-sm md:text-base">
              <p>
                Exemplo e postura: <strong>{dados.medias.exemplo.toFixed(2)}</strong>
              </p>
              <p>
                Clareza na comunicação: <strong>{dados.medias.comunicacao.toFixed(2)}</strong>
              </p>
              <p>
                Apoio e suporte técnico: <strong>{dados.medias.suporte.toFixed(2)}</strong>
              </p>
              <p>
                Justiça e feedback: <strong>{dados.medias.justica.toFixed(2)}</strong>
              </p>
              <p>
                Clima e inteligência emocional: <strong>{dados.medias.clima.toFixed(2)}</strong>
              </p>
              <p>
                Média geral: <strong>{feedback.mediaGeral.toFixed(2)}</strong>
              </p>
            </div>
          </section>

          <section
            className={`rounded-xl border p-5 ${
              feedback.visual.efeito === 'neon'
                ? 'bg-cafeteria-900 text-[#FFD166] shadow-[0_0_18px_rgba(255,209,102,0.35)]'
                : 'bg-white text-cafeteria-900'
            }`}
            style={{ borderColor: feedback.visual.cor }}
          >
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: feedback.visual.cor }}>
              {feedback.visual.nivel}
            </p>
            <h2 className="font-display text-lg mb-2">Feedback</h2>
            {feedback.feedbackCirurgico && (
              <p className="text-sm md:text-base leading-relaxed mb-3">{feedback.feedbackCirurgico}</p>
            )}
            <p className="text-sm md:text-base leading-relaxed">{feedback.feedbackFaixa}</p>
          </section>
        </>
      )}

      <section className="rounded-xl border border-cafeteria-200 bg-white p-5">
        <h2 className="font-display text-lg text-cafeteria-900 mb-2">Histórico por semana</h2>
        <p className="text-sm text-cafeteria-600 mb-4">
          Cada linha agrupa as respostas anônimas daquela semana (segunda a domingo).
        </p>
        {historico.length === 0 ? (
          <p className="text-sm text-cafeteria-700">Nenhuma semana com respostas neste mês.</p>
        ) : (
          <ul className="space-y-3">
            {historico.map((h) => (
              <li
                key={h.semana_inicio}
                className="rounded-lg border border-cafeteria-100 bg-cafeteria-50/80 px-3 py-3 text-sm md:text-base"
              >
                <p className="font-medium text-cafeteria-900">{h.semana_label}</p>
                <p className="text-cafeteria-600 mt-0.5">
                  {h.respostas} resposta{h.respostas === 1 ? '' : 's'} · média geral{' '}
                  <strong>{h.medias.mediaGeral.toFixed(2)}</strong>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
