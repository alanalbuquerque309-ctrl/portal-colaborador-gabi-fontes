'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { finalizarOnboarding } from '@/app/(auth)/onboarding/actions';
import { Button } from '@/components/ui/Button';
import { VideoBoasVindas } from './VideoBoasVindas';
import { ManualHtmlLeitura } from './ManualHtmlLeitura';
import { QuizManual } from './QuizCultura';
import { setPortalSession } from '@/lib/utils/session';
import { MANUAL_GERAL_COLABORADOR, manualPorSetor, type ManualRef } from '@/lib/manual-por-setor';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type EtapaId = 'video' | 'manual_geral' | 'manual_setor' | 'quiz' | 'termo';

type EtapaDef = {
  id: EtapaId;
  titulo: string;
  manual?: ManualRef;
};

interface OnboardingFlowProps {
  colaboradorId: string;
  unidadeId?: string;
  videoSrc?: string;
}

export function OnboardingFlow({ colaboradorId, unidadeId = '', videoSrc }: OnboardingFlowProps) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<{ setor: string | null; role: string | null } | null>(null);
  const [perfilErro, setPerfilErro] = useState(false);

  const etapas = useMemo(() => {
    if (!perfil) return [] as EtapaDef[];
    const list: EtapaDef[] = [
      { id: 'video', titulo: 'Vídeo institucional' },
      {
        id: 'manual_geral',
        titulo: MANUAL_GERAL_COLABORADOR.titulo,
        manual: MANUAL_GERAL_COLABORADOR,
      },
    ];
    const especifico = manualPorSetor(perfil.setor, perfil.role);
    if (especifico && especifico.file !== MANUAL_GERAL_COLABORADOR.file) {
      list.push({
        id: 'manual_setor',
        titulo: especifico.titulo,
        manual: especifico,
      });
    }
    list.push(
      { id: 'quiz', titulo: 'Questionário do manual' },
      { id: 'termo', titulo: 'Termo de compromisso' }
    );
    return list;
  }, [perfil]);

  const [etapa, setEtapa] = useState(0);
  const [videoCompleto, setVideoCompleto] = useState(false);
  const [manualGeralOk, setManualGeralOk] = useState(false);
  const [manualSetorOk, setManualSetorOk] = useState(false);
  const [quizValido, setQuizValido] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { setor?: string | null; role?: string | null } }) => {
        if (cancel) return;
        if (data.ok && data.colaborador) {
          setPerfil({
            setor: data.colaborador.setor ?? null,
            role: data.colaborador.role ?? null,
          });
        } else {
          setPerfilErro(true);
          setPerfil({ setor: null, role: null });
        }
      })
      .catch(() => {
        if (cancel) return;
        setPerfilErro(true);
        setPerfil({ setor: null, role: null });
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (perfil) setEtapa(0);
  }, [perfil?.setor, perfil?.role]);

  const atual = etapas[etapa];

  const podeAvancar = useMemo(() => {
    if (!atual) return false;
    switch (atual.id) {
      case 'video':
        return videoCompleto;
      case 'manual_geral':
        return manualGeralOk;
      case 'manual_setor':
        return manualSetorOk;
      case 'quiz':
        return quizValido;
      case 'termo':
        return aceite;
      default:
        return false;
    }
  }, [atual, videoCompleto, manualGeralOk, manualSetorOk, quizValido, aceite]);

  const handleProximo = async () => {
    if (etapa < etapas.length - 1) {
      setEtapa((e) => e + 1);
    } else {
      setLoading(true);
      setErro(null);
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

  const handleVoltar = () => {
    if (etapa > 0) {
      setEtapa((e) => e - 1);
      return;
    }
    if (typeof window !== 'undefined' && window.confirm('Deseja sair e voltar ao login?')) {
      router.push('/login');
    }
  };

  const onManualGeralReady = useCallback((ok: boolean) => {
    setManualGeralOk(ok);
  }, []);
  const onManualSetorReady = useCallback((ok: boolean) => {
    setManualSetorOk(ok);
  }, []);

  if (!perfil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 gap-4 px-4">
        <XicaraCarregando size="lg" label="Carregando seu perfil…" />
      </div>
    );
  }

  if (!atual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <p className="text-coffee-base text-sm">Preparando etapas…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 md:pb-12 bg-cream-100">
      {perfilErro && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Não foi possível carregar o setor automaticamente. O manual específico do seu setor pode não
            aparecer — atualize a página ou peça ao RH para conferir seu cadastro.
          </p>
        </div>
      )}
      <div className="sticky top-0 z-20 bg-cream-100 border-b border-dourado-200 px-4 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-1">
            {etapas.map((_, i) => (
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
            {etapa + 1} de {etapas.length}
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
                  src={videoSrc}
                  className="w-full"
                  assistidoCompleto={videoCompleto}
                  onFirstWatchComplete={() => setVideoCompleto(true)}
                />
              </div>
            )}

            {atual.id === 'manual_geral' && atual.manual && (
              <ManualHtmlLeitura
                titulo={atual.manual.titulo}
                arquivo={atual.manual.file}
                onReadyChange={onManualGeralReady}
              />
            )}

            {atual.id === 'manual_setor' && atual.manual && (
              <ManualHtmlLeitura
                titulo={atual.manual.titulo}
                arquivo={atual.manual.file}
                onReadyChange={onManualSetorReady}
              />
            )}

            {atual.id === 'quiz' && <QuizManual onValidityChange={setQuizValido} />}

            {atual.id === 'termo' && (
              <>
                <div className="rounded-xl border border-cream-300 bg-cream-50 p-4 text-coffee-base text-sm leading-relaxed mb-6">
                  <p className="font-semibold mb-2">Termo de Compromisso do Colaborador</p>
                  <p>
                    Ao concluir, eu me comprometo a seguir as diretrizes do Manual do Colaborador Gabi
                    Fontes, zelar pela Qualidade, Aconchego e Atendimento em todas as minhas ações, e
                    representar a Cafeteria Gabi Fontes com responsabilidade e orgulho.
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
                onClick={handleProximo}
                disabled={!podeAvancar || loading}
                className="min-w-[140px] md:min-w-[180px] bg-dourado-base hover:bg-dourado-400 text-coffee-300"
              >
                {loading
                  ? 'Finalizando…'
                  : etapa < etapas.length - 1
                    ? 'Próximo'
                    : 'Finalizar e Entrar'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
