'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

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
  nota_privacidade?: string;
};

export default function MinhaLiderancaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<ApiData | null>(null);

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

    fetch('/api/portal/avaliacao-lideranca/minha', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: ApiData) => setDados(d))
      .catch(() => setDados({ ok: false, erro: 'Erro de conexão.' }))
      .finally(() => setCarregando(false));
  }, [router]);

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando..." />
      </div>
    );
  }

  if (!dados?.ok) {
    return (
      <main className="max-w-3xl space-y-4">
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <p className="text-red-700 text-sm">{dados?.erro || 'Não foi possível carregar.'}</p>
      </main>
    );
  }

  const feedback = dados.feedback;

  return (
    <main className="max-w-3xl space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Minha avaliação de liderança
        </h1>
        <p className="text-sm text-cafeteria-600 mt-1">
          Referência: {dados.mes_referencia} · respostas recebidas: {dados.total_avaliacoes}
        </p>
      </div>

      {dados.nota_privacidade && (
        <p className="text-xs rounded-lg bg-cafeteria-100 px-3 py-2 text-cafeteria-700">
          {dados.nota_privacidade}
        </p>
      )}

      {!dados.medias || !feedback ? (
        <section className="rounded-xl border border-cafeteria-200 bg-white p-5">
          <p className="text-sm text-cafeteria-700">
            Ainda não há avaliações nesta referência para calcular a média.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-cafeteria-200 bg-white p-5">
            <h2 className="font-display text-lg text-cafeteria-900 mb-3">Radar da liderança</h2>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <p>Exemplo e postura: <strong>{dados.medias.exemplo.toFixed(2)}</strong></p>
              <p>Clareza na comunicação: <strong>{dados.medias.comunicacao.toFixed(2)}</strong></p>
              <p>Apoio e suporte técnico: <strong>{dados.medias.suporte.toFixed(2)}</strong></p>
              <p>Justiça e feedback: <strong>{dados.medias.justica.toFixed(2)}</strong></p>
              <p>Clima e inteligência emocional: <strong>{dados.medias.clima.toFixed(2)}</strong></p>
              <p>Média geral: <strong>{feedback.mediaGeral.toFixed(2)}</strong></p>
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
            <h2 className="font-display text-lg mb-2">Feedback cirúrgico</h2>
            {feedback.feedbackCirurgico && (
              <p className="text-sm leading-relaxed mb-3">{feedback.feedbackCirurgico}</p>
            )}
            <p className="text-sm leading-relaxed">{feedback.feedbackFaixa}</p>
          </section>
        </>
      )}
    </main>
  );
}
