'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { finalizarOnboarding } from '@/app/(auth)/onboarding/actions';
import { Button } from '@/components/ui/Button';
import { VideoBoasVindas } from './VideoBoasVindas';
import { ManualHtmlLeitura } from './ManualHtmlLeitura';
import { QuizOnboardingBloco } from './QuizOnboardingBloco';
import { EscolhaManualOnboarding } from './EscolhaManualOnboarding';
import { setPortalSession } from '@/lib/utils/session';
import { MANUAL_GERAL_COLABORADOR } from '@/lib/manual-por-setor';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PERGUNTAS_QUIZ_VIDEO, PERGUNTAS_QUIZ_MANUAL_GERAL } from '@/content/onboarding-quizzes';
import { inferOnboardingEtapaIndex } from '@/lib/onboarding-step';

const MSG_SEGUNDO_ERRO_VIDEO =
  'É necessário assistir ao vídeo novamente do início. Você será redirecionado para a primeira etapa.';
const MSG_SEGUNDO_ERRO_MANUAL =
  'É necessário ler o manual geral novamente. Você será redirecionado para a leitura do manual.';

type EtapaId =
  | 'video'
  | 'quiz_video'
  | 'manual_geral'
  | 'quiz_manual_geral'
  | 'escolha_manual'
  | 'termo';

const ETAPAS: { id: EtapaId; titulo: string }[] = [
  { id: 'video', titulo: 'Vídeo institucional' },
  { id: 'quiz_video', titulo: 'Questionário sobre o vídeo' },
  { id: 'manual_geral', titulo: MANUAL_GERAL_COLABORADOR.titulo },
  { id: 'quiz_manual_geral', titulo: 'Questionário sobre o manual geral' },
  { id: 'escolha_manual', titulo: 'O seu manual de setor' },
  { id: 'termo', titulo: 'Termo de compromisso' },
];

type Flags = {
  onboarding_completo?: boolean;
  onboarding_video_visto?: boolean;
  onboarding_quiz_video_ok?: boolean;
  onboarding_manual_geral_lido_ok?: boolean;
  onboarding_quiz_manual_geral_ok?: boolean;
  onboarding_manual_escolhido_concluido?: boolean;
};

async function postProgresso(body: Record<string, unknown>) {
  const res = await fetch('/api/portal/onboarding/progresso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.erro || 'Erro ao gravar');
}

interface OnboardingFlowProps {
  colaboradorId: string;
  unidadeId?: string;
  videoSrc?: string;
}

export function OnboardingFlow({ colaboradorId, unidadeId = '', videoSrc }: OnboardingFlowProps) {
  const router = useRouter();
  const [flags, setFlags] = useState<Flags | null>(null);
  const [carregandoFlags, setCarregandoFlags] = useState(true);

  const [etapa, setEtapa] = useState(0);
  const [videoKey, setVideoKey] = useState(0);
  const [videoCompleto, setVideoCompleto] = useState(false);
  const [quizVideoValido, setQuizVideoValido] = useState(false);
  const [quizVideoResetKey, setQuizVideoResetKey] = useState(0);
  const [manualGeralResetKey, setManualGeralResetKey] = useState(0);
  const [manualGeralOk, setManualGeralOk] = useState(false);
  const [quizManualValido, setQuizManualValido] = useState(false);
  const [quizManualResetKey, setQuizManualResetKey] = useState(0);
  const [escolhaResetKey, setEscolhaResetKey] = useState(0);
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          colaborador?: Flags & { role?: string };
        }) => {
          if (cancel) return;
          if (!data.ok || !data.colaborador) {
            setFlags({});
            setCarregandoFlags(false);
            return;
          }
          const c = data.colaborador;
          if (c.onboarding_completo) {
            router.replace('/portal');
            return;
          }
          setFlags({
            onboarding_completo: c.onboarding_completo,
            onboarding_video_visto: c.onboarding_video_visto,
            onboarding_quiz_video_ok: c.onboarding_quiz_video_ok,
            onboarding_manual_geral_lido_ok: c.onboarding_manual_geral_lido_ok,
            onboarding_quiz_manual_geral_ok: c.onboarding_quiz_manual_geral_ok,
            onboarding_manual_escolhido_concluido: c.onboarding_manual_escolhido_concluido,
          });
          const idx = inferOnboardingEtapaIndex({
            onboarding_video_visto: c.onboarding_video_visto,
            onboarding_quiz_video_ok: c.onboarding_quiz_video_ok,
            onboarding_manual_geral_lido_ok: c.onboarding_manual_geral_lido_ok,
            onboarding_quiz_manual_geral_ok: c.onboarding_quiz_manual_geral_ok,
            onboarding_manual_escolhido_concluido: c.onboarding_manual_escolhido_concluido,
          });
          setEtapa(idx);
          if (c.onboarding_video_visto) setVideoCompleto(true);
          if (c.onboarding_manual_geral_lido_ok) setManualGeralOk(true);
          setCarregandoFlags(false);
        }
      )
      .catch(() => {
        if (!cancel) {
          setFlags({});
          setCarregandoFlags(false);
        }
      });
    return () => {
      cancel = true;
    };
  }, [router]);

  const atual = ETAPAS[etapa];

  const onVideoCompleto = useCallback(async () => {
    setVideoCompleto(true);
    try {
      await postProgresso({ onboarding_video_visto: true });
      setFlags((f) => (f ? { ...f, onboarding_video_visto: true } : f));
    } catch {
      /* gravação opcional; Próximo tenta de novo */
    }
  }, []);

  useEffect(() => {
    if (etapa === 2 && manualGeralOk) {
      void (async () => {
        try {
          await postProgresso({ onboarding_manual_geral_lido_ok: true });
          setFlags((f) => (f ? { ...f, onboarding_manual_geral_lido_ok: true } : f));
        } catch {
          /* ignore */
        }
      })();
    }
  }, [etapa, manualGeralOk]);

  const podeAvancar = useMemo(() => {
    if (!atual) return false;
    switch (atual.id) {
      case 'video':
        return videoCompleto;
      case 'quiz_video':
        return quizVideoValido;
      case 'manual_geral':
        return manualGeralOk;
      case 'quiz_manual_geral':
        return quizManualValido;
      case 'escolha_manual':
        return false;
      case 'termo':
        return aceite;
      default:
        return false;
    }
  }, [atual, videoCompleto, quizVideoValido, manualGeralOk, quizManualValido, aceite]);

  const handleSegundoErroVideo = useCallback(async () => {
    try {
      await postProgresso({ reset_video_e_quiz: true });
    } catch {
      setErro('Não foi possível reiniciar a etapa. Atualize a página.');
      return;
    }
    setVideoCompleto(false);
    setQuizVideoValido(false);
    setVideoKey((k) => k + 1);
    setQuizVideoResetKey((k) => k + 1);
    setEtapa(0);
    setErro(null);
  }, []);

  const handleSegundoErroManualGeral = useCallback(async () => {
    try {
      await postProgresso({ reset_manual_geral_e_quiz: true });
    } catch {
      setErro('Não foi possível reiniciar a etapa. Atualize a página.');
      return;
    }
    setManualGeralOk(false);
    setQuizManualValido(false);
    setManualGeralResetKey((k) => k + 1);
    setQuizManualResetKey((k) => k + 1);
    setEtapa(2);
    setErro(null);
  }, []);

  const handleProximo = async () => {
    setErro(null);
    try {
      if (atual.id === 'quiz_video') {
        await postProgresso({ onboarding_quiz_video_ok: true });
        setFlags((f) => (f ? { ...f, onboarding_quiz_video_ok: true } : f));
      }
      if (atual.id === 'manual_geral') {
        await postProgresso({ onboarding_manual_geral_lido_ok: true });
        setFlags((f) => (f ? { ...f, onboarding_manual_geral_lido_ok: true } : f));
      }
      if (atual.id === 'quiz_manual_geral') {
        await postProgresso({ onboarding_quiz_manual_geral_ok: true });
        setFlags((f) => (f ? { ...f, onboarding_quiz_manual_geral_ok: true } : f));
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gravar etapa.');
      return;
    }

    if (etapa < ETAPAS.length - 1) {
      setEtapa((e) => e + 1);
    } else {
      setLoading(true);
      try {
        const { ok, unidade_id: uid, role } = await finalizarOnboarding(colaboradorId);
        if (!ok) throw new Error('Falha ao finalizar');
        setPortalSession(colaboradorId, uid ?? unidadeId ?? '', role);
        router.push('/portal');
      } catch {
        setErro('Não foi possível finalizar. Tente novamente.');
        setLoading(false);
      }
    }
  };

  const handleEscolhaConcluido = (_file: string) => {
    setFlags((f) =>
      f ? { ...f, onboarding_manual_escolhido_concluido: true } : f
    );
    setEtapa(5);
  };

  const handleVoltar = () => {
    if (etapa > 0) {
      setEtapa((e) => e - 1);
      setErro(null);
      return;
    }
    if (typeof window !== 'undefined' && window.confirm('Deseja sair e voltar ao login?')) {
      router.push('/login');
    }
  };

  const onManualGeralReady = useCallback((ok: boolean) => {
    setManualGeralOk(ok);
  }, []);

  if (carregandoFlags || !flags) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 gap-4 px-4">
        <XicaraCarregando size="lg" label="Carregando etapas…" />
      </div>
    );
  }

  if (!atual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <p className="text-coffee-base text-sm">Preparando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 md:pb-12 bg-cream-100">
      <div className="sticky top-0 z-20 bg-cream-100 border-b border-dourado-200 px-4 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-1">
            {ETAPAS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= etapa ? 'bg-dourado-base' : 'bg-cream-300'
                }`}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-coffee-100 text-xs mt-2 text-center">
            {etapa + 1} de {ETAPAS.length}
          </p>
        </div>
      </div>

      <section className="max-w-xl mx-auto px-4 pt-6 md:pt-8">
        <div className="rounded-2xl bg-white shadow-xl border border-dourado-200 overflow-hidden">
          <div className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-display font-semibold text-coffee-base mb-4">
              {atual.titulo}
            </h2>

            {atual.id === 'video' && (
              <div className="rounded-xl border-2 border-dourado-200 p-2 bg-cream-50 shadow-inner overflow-hidden">
                <VideoBoasVindas
                  key={videoKey}
                  src={videoSrc}
                  className="w-full"
                  assistidoCompleto={videoCompleto}
                  onFirstWatchComplete={onVideoCompleto}
                />
              </div>
            )}

            {atual.id === 'quiz_video' && (
              <QuizOnboardingBloco
                key={`qv-${quizVideoResetKey}`}
                perguntas={PERGUNTAS_QUIZ_VIDEO}
                mensagemSegundoErro={MSG_SEGUNDO_ERRO_VIDEO}
                resetKey={quizVideoResetKey}
                onValidityChange={setQuizVideoValido}
                onSegundoErro={handleSegundoErroVideo}
              />
            )}

            {atual.id === 'manual_geral' && (
              <ManualHtmlLeitura
                key={`mg-${manualGeralResetKey}`}
                titulo={MANUAL_GERAL_COLABORADOR.titulo}
                arquivo={MANUAL_GERAL_COLABORADOR.file}
                onReadyChange={onManualGeralReady}
              />
            )}

            {atual.id === 'quiz_manual_geral' && (
              <QuizOnboardingBloco
                key={`qm-${quizManualResetKey}`}
                perguntas={PERGUNTAS_QUIZ_MANUAL_GERAL}
                mensagemSegundoErro={MSG_SEGUNDO_ERRO_MANUAL}
                resetKey={quizManualResetKey}
                onValidityChange={setQuizManualValido}
                onSegundoErro={handleSegundoErroManualGeral}
              />
            )}

            {atual.id === 'escolha_manual' && (
              <EscolhaManualOnboarding
                resetKey={escolhaResetKey}
                onConcluido={(file) => {
                  setEscolhaResetKey((k) => k + 1);
                  handleEscolhaConcluido(file);
                }}
              />
            )}

            {atual.id === 'termo' && (
              <>
                <div className="rounded-xl border border-cream-300 bg-cream-50 p-4 text-coffee-base text-sm leading-relaxed mb-6">
                  <p className="font-semibold mb-2">Termo de Compromisso do Colaborador</p>
                  <p>
                    Ao concluir, eu me comprometo a seguir as diretrizes do Manual do Colaborador Gabi Fontes,
                    zelar pela Qualidade, Aconchego e Atendimento em todas as minhas ações, e representar a
                    Cafeteria Gabi Fontes com responsabilidade e orgulho.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={aceite}
                    onChange={(e) => setAceite(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-coffee-50 text-dourado-base focus:ring-dourado-base shrink-0"
                  />
                  <span className="text-sm text-coffee-base">
                    Li e compreendo que represento a Cafeteria Gabi Fontes com responsabilidade e orgulho.
                  </span>
                </label>
              </>
            )}

            {erro && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {erro}
              </p>
            )}

            {atual.id !== 'escolha_manual' && (
              <div className="flex justify-between gap-4 mt-6 pt-4 border-t border-cream-300">
                <Button
                  variant="outline"
                  onClick={handleVoltar}
                  disabled={loading}
                  className="min-w-[100px] border-coffee-200 text-coffee-base hover:bg-cream-100"
                >
                  {etapa === 0 ? 'Sair' : 'Voltar'}
                </Button>
                <Button
                  onClick={() => void handleProximo()}
                  disabled={!podeAvancar || loading}
                  className="min-w-[140px] md:min-w-[180px] bg-dourado-base hover:bg-dourado-400 text-coffee-300 text-base font-semibold"
                >
                  {loading
                    ? 'Finalizando…'
                    : etapa < ETAPAS.length - 1
                      ? 'Próximo'
                      : 'Finalizar e Entrar'}
                </Button>
              </div>
            )}

            {atual.id === 'escolha_manual' && (
              <div className="flex justify-start gap-4 mt-6 pt-4 border-t border-cream-300">
                <Button
                  variant="outline"
                  onClick={handleVoltar}
                  disabled={loading}
                  className="min-w-[100px] border-coffee-200 text-coffee-base hover:bg-cream-100"
                >
                  Voltar
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
