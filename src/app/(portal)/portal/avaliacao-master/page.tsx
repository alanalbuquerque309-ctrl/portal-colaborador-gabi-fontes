'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { ColaboradorAvaliacaoCard, type AvaliacaoServidor } from '@/components/portal/avaliacao-master/ColaboradorAvaliacaoCard';
import { normalizePortalRole } from '@/lib/roles';
import { colaboradorPermiteMarcarForaPlantao } from '@/lib/escala-portal';
import { formatarIntervaloSemanaPtBR, inicioSemanaSegundaFeiraLocal, lembreteAvaliacaoSemanaPassada, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';
import { AvaliacaoSemanalChecklist } from '@/components/portal/AvaliacaoSemanalChecklist';

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
  const lembretePadrao = lembreteAvaliacaoSemanaPassada();
  const exibindoSemanaPassada = dataRef === semanaAvaliacaoEquipePadraoISO();

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
    return <p className="text-cafeteria-700 text-center py-12">Carregando…</p>;
  }

  return (
    <main className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Avaliação da equipe
        </h1>
        <p className="mt-2 text-base md:text-lg font-medium text-dourado-900 max-w-2xl">
          {exibindoSemanaPassada ? lembretePadrao.titulo : 'Semana selecionada'}:{' '}
          <strong>{intervaloSemana}</strong>
        </p>
        <p className="text-cafeteria-600 mt-2 text-sm md:text-base max-w-2xl">
          Avaliação <strong>semanal</strong> sobre a <strong>semana que já terminou</strong> (segunda a domingo). Por
          padrão abrimos a <strong>semana passada</strong>. Cada colaborador pode receber também uma{' '}
          <strong>visita RH</strong> independente na mesma semana.
        </p>

        <div className="mt-3 rounded-xl border-2 border-dourado-base/50 bg-dourado-50/80 px-4 py-3 max-w-2xl space-y-2">
          <p className="text-sm md:text-base font-semibold text-cafeteria-900">
            Semana em avaliação: {intervaloSemana}
          </p>
          <p className="text-sm text-cafeteria-800">
            Pense nesta semana, <strong>não no plantão que começou hoje</strong>. Na troca mensal de líderes (12x36),
            quem estava com o colaborador <strong>naquela semana</strong> dá as notas; o outro líder usa{' '}
            <strong>Não estava no meu plantão</strong>.
          </p>
          <p className="text-sm text-cafeteria-700">
            Exemplo: no dia 1º viramos o plantão, mas a semana passada (até domingo) ainda era do líder anterior — ele
            avalia; o líder novo só marca fora do plantão se a pessoa não estava com ele naquela semana.
          </p>
        </div>

        <p className="mt-2 text-sm rounded-md bg-amber-50 border border-amber-300 px-3 py-2.5 text-amber-800 max-w-2xl">
          Aviso interno da liderança: esta avaliação da equipe é obrigatória. Depois de salvar, use o botão{' '}
          <strong>✏️ Editar</strong> no checklist ou no card (uma correção por semana). Semanas anteriores: altere a
          data acima e toque em <strong>Atualizar lista</strong>.
        </p>
      </div>

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
            editavel: Boolean(m.avaliacao && !m.avaliacao.edicao_utilizada && m.avaliacao.id),
            subtitulo:
              [
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
        <p className="text-cafeteria-600">Carregando equipe…</p>
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
                mostrarForaPlantao={colaboradorPermiteMarcarForaPlantao(m.tipo_escala)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
