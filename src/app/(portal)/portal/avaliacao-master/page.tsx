'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { ColaboradorAvaliacaoCard, type AvaliacaoServidor } from '@/components/portal/avaliacao-master/ColaboradorAvaliacaoCard';
import { normalizePortalRole } from '@/lib/roles';
import { colaboradorPermiteMarcarForaPlantao } from '@/lib/escala-portal';
import {
  ehSemanaAvaliacaoEquipePadrao,
  formatarIntervaloSemanaPtBR,
  inicioSemanaSegundaFeiraLocal,
  semanaAvaliacaoEquipePadraoISO,
} from '@/lib/semana-referencia';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { AvaliacaoSemanalChecklist } from '@/components/portal/AvaliacaoSemanalChecklist';
import { QuintaTreinoLiderBanner } from '@/components/portal/QuintaTreinoLiderBanner';
import { PortalPageHeader } from '@/components/portal/shell/PortalPageHeader';
import { PortalPaginaCarregando } from '@/components/ui/PortalPaginaCarregando';

function isRoleGerenteAvaliadorPortal(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'admin';
}

type MembroEquipe = {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  unidade_nome?: string | null;
  unidade_slug?: string | null;
  tipo_escala?: string | null;
  onboarding_completo?: boolean;
  operacao_apto?: boolean;
  avaliacao: AvaliacaoServidor;
};

export default function AvaliacaoMasterPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [dataRef, setDataRef] = useState(semanaAvaliacaoEquipePadraoISO);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroPendentes, setFiltroPendentes] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const autorizado =
    !!session?.colaboradorId &&
    session.colaboradorId !== 'pending' &&
    isRoleGerenteAvaliadorPortal(session.role);
  const avaliadosNaSemana = equipe.filter((m) => m.avaliacao != null).length;
  const pendentesNaSemana = Math.max(0, equipe.length - avaliadosNaSemana);
  const naoAtivaramPortal = equipe.filter((m) => m.onboarding_completo === false);
  const intervaloSemana = formatarIntervaloSemanaPtBR(dataRef);
  const semanaPadrao = semanaAvaliacaoEquipePadraoISO();
  const dataRefEhSemanaCorrente = dataRef === segundaSemanaSaoPaulo() && dataRef !== semanaPadrao;
  const permiteCorrecaoPlantaoExtra = ehSemanaAvaliacaoEquipePadrao(dataRef);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    if (!isRoleGerenteAvaliadorPortal(s.role)) {
      router.replace('/portal');
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pendentes') === '1') setFiltroPendentes(true);
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/avaliacao-master?data=${encodeURIComponent(dataRef)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.status === 403 || res.status === 401) {
        router.replace('/portal');
        return;
      }
      if (!data.ok) {
        setErro(data.erro || 'Erro ao carregar.');
        setEquipe([]);
        return;
      }
      setEquipe(data.equipe ?? []);
    } catch {
      setErro('Erro de conexão.');
      setEquipe([]);
    } finally {
      setCarregando(false);
    }
  }, [dataRef, router]);

  useEffect(() => {
    if (!autorizado) return;
    carregar();
  }, [autorizado, carregar]);

  if (!session || !autorizado) {
    return <PortalPaginaCarregando label="Carregando avaliação…" />;
  }

  return (
    <main className="space-y-6">
      <QuintaTreinoLiderBanner />

      <PortalPageHeader
        title="Avaliação da equipe"
        description={`Avalie a semana que já terminou (segunda a domingo). Semana em avaliação: ${intervaloSemana}.`}
        backHref="/portal"
        backLabel="Voltar ao portal"
        icon="📋"
        accent="verde"
      />

      {dataRefEhSemanaCorrente && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          <p className="font-semibold">Data da semana incorreta para a cobrança do RH</p>
          <p className="mt-1">
            Você está na semana que <strong>acabou de começar</strong>. O admin e as pendências consideram a{' '}
            <strong>semana passada</strong> ({formatarIntervaloSemanaPtBR(semanaPadrao)}). Ajuste a data abaixo para
            essa segunda-feira antes de salvar, ou reenvie se já salvou na data errada.
          </p>
        </div>
      )}

      {permiteCorrecaoPlantaoExtra && (
        <div className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">Correção de plantão liberada nesta semana</p>
          <p className="mt-1">
            Mesmo quem já usou a edição única pode tocar em <strong>Corrigir plantão</strong>: troque «meu plantão»
            por «outro plantão» (ou o inverso) se a pessoa estava com o outro gerente. Isso libera a avaliação de
            liderança correta para o colaborador.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-mel-200 bg-gradient-to-br from-mel-50/70 via-white to-cream-50 overflow-hidden shadow-sm">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 hover:bg-mel-50/60 transition-colors [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="text-lg">
                💡
              </span>
              <span className="text-sm font-semibold text-cafeteria-900">Como funciona esta avaliação</span>
            </span>
            <svg
              className="w-5 h-5 shrink-0 text-mel-600 transition-transform group-open:rotate-180"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="px-4 pb-4 pt-1 border-t border-mel-100 space-y-3 text-sm text-cafeteria-800">
            <p>
              É uma avaliação <strong>semanal</strong> sobre a <strong>semana que já terminou</strong>. Por padrão
              abrimos a <strong>semana passada</strong>. Cada colaborador pode receber também uma{' '}
              <strong>visita RH</strong> independente na mesma semana.
            </p>
            <p>
              Pense na semana avaliada, <strong>não no plantão que começou hoje</strong>. Na troca mensal de líderes
              (12x36), quem estava com o colaborador <strong>naquela semana</strong> dá as notas; o outro líder usa{' '}
              <strong>Não estava no meu plantão</strong>.
            </p>
            <p className="text-cafeteria-700">
              Exemplo: no dia 1º viramos o plantão, mas a semana passada (até domingo) ainda era do líder anterior — ele
              avalia.
            </p>
            <p className="rounded-lg bg-mel-50 border border-mel-200 px-3 py-2 text-cafeteria-800">
              Avaliação <strong>obrigatória</strong>. Depois de salvar, use <strong>✏️ Editar</strong> (uma correção por
              semana). Na <strong>semana passada em cobrança</strong>, quem já editou ainda pode{' '}
              <strong>Corrigir plantão</strong>. Para outras semanas, mude a data e toque em{' '}
              <strong>Atualizar lista</strong>.
            </p>
          </div>
        </details>
      </section>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="data-avaliacao" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Semana avaliada (segunda-feira da semana que terminou no domingo)
          </label>
          <input
            id="data-avaliacao"
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(inicioSemanaSegundaFeiraLocal(e.target.value))}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-cafeteria-900 focus:border-dourado-base focus:outline-none focus:ring-1 focus:ring-dourado-base"
          />
          <p className="text-sm text-cafeteria-600 mt-1">
            Intervalo: <strong>{intervaloSemana}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => carregar()}
          className="rounded-lg border border-cafeteria-300 px-4 py-2 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50"
        >
          Atualizar lista
        </button>
      </div>

      {!carregando && equipe.length > 0 && (
        <AvaliacaoSemanalChecklist
          titulo="Checklist da semana"
          itens={equipe.map((m) => ({
            id: m.id,
            nome: m.nome,
            concluido: m.avaliacao != null,
            editavel: Boolean(
              m.avaliacao &&
                !m.avaliacao.avaliado_por_outro_lider &&
                m.avaliacao.id &&
                (!m.avaliacao.edicao_utilizada || permiteCorrecaoPlantaoExtra)
            ),
            subtitulo:
              [
                m.avaliacao?.avaliado_por_outro_lider ? 'já avaliado por outro líder' : null,
                m.avaliacao?.assiduidade === 'fora_plantao' ? 'fora do plantão' : null,
                m.cargo,
                m.setor,
                m.onboarding_completo === false ? 'cadastro portal pendente' : null,
                !m.operacao_apto ? 'em adaptação' : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined,
          }))}
          filtroPendentes={filtroPendentes}
          onToggleFiltro={() => setFiltroPendentes((v) => !v)}
          onIrPara={(id) => {
            setEditandoId(null);
            document.getElementById(`membro-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onEditar={(id) => {
            setEditandoId(id);
            document.getElementById(`membro-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {!carregando && naoAtivaramPortal.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            {naoAtivaramPortal.length === 1
              ? '1 colaborador ainda não ativou o portal'
              : `${naoAtivaramPortal.length} colaboradores ainda não ativaram o portal`}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Avise para fazerem o primeiro acesso (login e cadastro). Você pode avaliar normalmente.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5 list-none p-0 m-0">
            {naoAtivaramPortal.map((m) => (
              <li
                key={m.id}
                className="rounded-full bg-white border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-950"
              >
                {m.nome}
                {m.setor ? <span className="text-amber-700"> · {m.setor}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {carregando ? (
        <PortalPaginaCarregando variant="section" label="Carregando equipe…" />
      ) : equipe.length === 0 ? (
        <div className="rounded-xl border border-dourado-base/40 bg-dourado-50/50 p-6 text-cafeteria-800">
          <p className="font-medium">Nenhum colaborador na sua equipe</p>
          <p className="text-sm mt-2 text-cafeteria-700">
            Confira se está logado como <strong>Daniel Brito Martins</strong> (administrador). Toque em{' '}
            <strong>Atualizar lista</strong>. Se continuar vazio, no Admin peça para aplicar o mapa em{' '}
            <strong>Liderança por setor</strong>.
          </p>
          <p className="text-sm mt-2 text-cafeteria-600">
            A tela <strong>Avaliar liderança</strong> é outro fluxo (feedback 1–5 sobre chefia). A avaliação
            semanal da equipe (presença, estrelas) fica aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-6 list-none p-0 m-0">
          {(filtroPendentes ? equipe.filter((m) => !m.avaliacao) : equipe).map((m) => (
            <li key={m.id} id={`membro-${m.id}`}>
              <ColaboradorAvaliacaoCard
                colaboradorId={m.id}
                nome={m.nome}
                cargo={m.cargo}
                setor={m.setor}
                unidade={m.unidade_nome}
                dataReferencia={dataRef}
                semanaLabel={intervaloSemana}
                avaliacaoInicial={m.avaliacao}
                onboardingCompleto={m.onboarding_completo !== false}
                operacaoApto={m.operacao_apto === true}
                forcarEdicao={editandoId === m.id}
                onModoEdicaoChange={(ativo) => {
                  if (!ativo && editandoId === m.id) setEditandoId(null);
                }}
                onSalvo={() => {
                  setEditandoId(null);
                  carregar();
                }}
                mostrarForaPlantao={colaboradorPermiteMarcarForaPlantao(m.tipo_escala, {
                  unidadeSlug: m.unidade_slug,
                })}
                permiteCorrecaoPlantaoExtra={permiteCorrecaoPlantaoExtra}
                mostrarFerias
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
