'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StarRating } from './StarRating';
import {
  calcularMediaDia,
  temNotaBaixaEquipe,
  assiduidadeLegacySemanalRemovida,
  type AssiduidadeTipo,
} from '@/lib/avaliacao-diaria';
import { DICA_CRITERIO_PROATIVIDADE, notaCriterioValida } from '@/lib/avaliacao-notas';

export type AvaliacaoServidor = {
  id?: string;
  assiduidade: AssiduidadeTipo;
  nota_vestimenta: number | null;
  nota_pontualidade: number | null;
  nota_trabalho_equipe: number | null;
  nota_desempenho_tarefas: number | null;
  nota_proatividade?: number | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
  edicao_utilizada?: boolean;
} | null;

type Props = {
  colaboradorId: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  unidade?: string | null;
  dataReferencia: string;
  /** Intervalo legível (ex.: 26 mai a 1 jun 2026) — usado no botão fora do plantão. */
  semanaLabel?: string;
  avaliacaoInicial: AvaliacaoServidor;
  /** Cadastro do portal ainda pendente (informativo; não bloqueia avaliação). */
  onboardingCompleto?: boolean;
  operacaoApto?: boolean;
  onSalvo: () => void;
  /** Endpoint POST (default: avaliação do gerente). */
  postUrl?: string;
  rotuloSalvar?: string;
  forcarEdicao?: boolean;
  onModoEdicaoChange?: (ativo: boolean) => void;
  /** Desabilita edição única (ex.: visita RH). */
  permiteEdicaoUnica?: boolean;
  /** Gerente de loja: botão «fora do plantão». Visita RH não usa. */
  mostrarForaPlantao?: boolean;
  /** Botão «de férias» (semana sem nota, fora da média). */
  mostrarFerias?: boolean;
};

function normalizarAssiduidadeForm(row: NonNullable<AvaliacaoServidor>): AssiduidadeTipo {
  const a = row.assiduidade;
  if (assiduidadeLegacySemanalRemovida(a)) return 'presente';
  if (a === 'fora_plantao' || a === 'falta_injustificada' || a === 'falta_justificada' || a === 'ferias') return a;
  return 'presente';
}

function mapRowToState(row: NonNullable<AvaliacaoServidor>): {
  assiduidade: AssiduidadeTipo;
  legado: boolean;
  v: number | null;
  p: number | null;
  e: number | null;
  d: number | null;
  pr: number | null;
} {
  const pick = (n: number | null | undefined) => (notaCriterioValida(n) ? n : null);
  return {
    assiduidade: normalizarAssiduidadeForm(row),
    legado: assiduidadeLegacySemanalRemovida(row.assiduidade),
    v: pick(row.nota_vestimenta),
    p: pick(row.nota_pontualidade),
    e: pick(row.nota_trabalho_equipe),
    d: pick(row.nota_desempenho_tarefas),
    pr: pick(row.nota_proatividade),
  };
}

export function ColaboradorAvaliacaoCard({
  colaboradorId,
  nome,
  cargo,
  setor,
  unidade,
  dataReferencia,
  semanaLabel,
  avaliacaoInicial,
  onboardingCompleto = true,
  operacaoApto = false,
  onSalvo,
  postUrl = '/api/portal/avaliacao-master',
  rotuloSalvar = 'Salvar avaliação',
  forcarEdicao = false,
  onModoEdicaoChange,
  permiteEdicaoUnica = true,
  mostrarForaPlantao = true,
  mostrarFerias = true,
}: Props) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [avaliando, setAvaliando] = useState(false);
  const edicaoUtilizada = avaliacaoInicial?.edicao_utilizada === true;
  const podeEditarAvaliacao =
    permiteEdicaoUnica && avaliacaoInicial != null && !edicaoUtilizada && !!avaliacaoInicial.id;
  const somenteLeitura = avaliacaoInicial != null && !modoEdicao;
  const cadastroPortalPendente = !onboardingCompleto;

  const inicial = useMemo(() => {
    if (!avaliacaoInicial) {
      return {
        assiduidade: 'presente' as AssiduidadeTipo,
        legado: false,
        v: null as number | null,
        p: null as number | null,
        e: null as number | null,
        d: null as number | null,
        pr: null as number | null,
      };
    }
    return mapRowToState(avaliacaoInicial);
  }, [avaliacaoInicial]);

  const [assiduidade, setAssiduidade] = useState<AssiduidadeTipo>(inicial.assiduidade);
  const [registroLegado, setRegistroLegado] = useState(inicial.legado);
  const [v, setV] = useState<number | null>(inicial.v);
  const [p, setP] = useState<number | null>(inicial.p);
  const [e, setE] = useState<number | null>(inicial.e);
  const [d, setD] = useState<number | null>(inicial.d);
  const [pr, setPr] = useState<number | null>(inicial.pr);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [justificativaNotaBaixa, setJustificativaNotaBaixa] = useState(
    avaliacaoInicial?.justificativa_nota_baixa ?? ''
  );
  const [apto, setApto] = useState(operacaoApto);
  const [marcandoApto, setMarcandoApto] = useState(false);

  useEffect(() => {
    setAssiduidade(inicial.assiduidade);
    setRegistroLegado(inicial.legado);
    setV(inicial.v);
    setP(inicial.p);
    setE(inicial.e);
    setD(inicial.d);
    setPr(inicial.pr);
    setJustificativaNotaBaixa(avaliacaoInicial?.justificativa_nota_baixa ?? '');
    setAvaliando(false);
    setMsg(null);
    setErro(null);
  }, [avaliacaoInicial?.justificativa_nota_baixa, inicial.assiduidade, inicial.legado, inicial.v, inicial.p, inicial.e, inicial.d, inicial.pr]);

  useEffect(() => {
    setApto(operacaoApto);
  }, [operacaoApto]);

  useEffect(() => {
    if (forcarEdicao && podeEditarAvaliacao) {
      setModoEdicao(true);
      setAvaliando(true);
      onModoEdicaoChange?.(true);
    }
  }, [forcarEdicao, podeEditarAvaliacao, onModoEdicaoChange]);

  const iniciarEdicao = () => {
    if (!podeEditarAvaliacao) return;
    setModoEdicao(true);
    setAvaliando(true);
    onModoEdicaoChange?.(true);
    setMsg(null);
    setErro(null);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setAvaliando(false);
    onModoEdicaoChange?.(false);
    setAssiduidade(inicial.assiduidade);
    setRegistroLegado(inicial.legado);
    setV(inicial.v);
    setP(inicial.p);
    setE(inicial.e);
    setD(inicial.d);
    setPr(inicial.pr);
    setJustificativaNotaBaixa(avaliacaoInicial?.justificativa_nota_baixa ?? '');
    setMsg(null);
    setErro(null);
  };

  const desfazerSemNotaNaEdicao = () => {
    setAssiduidade('presente');
    setRegistroLegado(false);
    setV(null);
    setP(null);
    setE(null);
    setD(null);
    setPr(null);
    setJustificativaNotaBaixa('');
    setErro(null);
    setMsg(null);
  };

  const injustificada = assiduidade === 'falta_injustificada';
  const justificada = assiduidade === 'falta_justificada';
  const foraPlantao = assiduidade === 'fora_plantao';
  const ferias = assiduidade === 'ferias';
  const semNotaSemanal = foraPlantao || ferias;
  const estrelasDesabilitadas = somenteLeitura || injustificada;
  /** Painel de atalhos antes de abrir estrelas. */
  const mostrarAcoesRapidas =
    !somenteLeitura && !avaliando && !foraPlantao && !ferias && !injustificada;
  /** Bloco de notas: presente ou falta justificada (com critérios). */
  const mostrarNotas = !semNotaSemanal && !injustificada && (somenteLeitura || avaliando);
  const temNotaBaixa = temNotaBaixaEquipe(assiduidade, {
    vestimenta: v,
    pontualidade: p,
    trabalhoEquipe: e,
    desempenhoTarefas: d,
    proatividade: pr,
  });

  const previewMedia = useMemo(() => {
    return calcularMediaDia(assiduidade, {
      vestimenta: v,
      pontualidade: p,
      trabalhoEquipe: e,
      desempenhoTarefas: d,
      proatividade: pr,
    }).media;
  }, [assiduidade, v, p, e, d, pr]);

  const toggleFaltaInjustificada = useCallback((marcada: boolean) => {
    setRegistroLegado(false);
    setMsg(null);
    setErro(null);
    if (marcada) {
      setAssiduidade('falta_injustificada');
      setV(0);
      setP(0);
      setE(0);
      setD(0);
      setPr(0);
    } else {
      setAssiduidade('presente');
      setV(null);
      setP(null);
      setE(null);
      setD(null);
      setPr(null);
    }
  }, []);

  const marcarApto = async () => {
    if (somenteLeitura || apto) return;
    setMarcandoApto(true);
    setErro(null);
    try {
      const res = await fetch('/api/portal/operacao-apto', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colaborador_id: colaboradorId, apto: true }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível registrar aptidão.');
        return;
      }
      setApto(true);
      setMsg('Registrado: apto na função.');
      onSalvo();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setMarcandoApto(false);
    }
  };

  const marcarForaPlantao = async () => {
    if (somenteLeitura) return;
    if (
      !window.confirm(
        `${nome} não estava no seu plantão na semana ${semanaLabel ?? 'selecionada'}?\n\nUse só se a pessoa NÃO trabalhou com você nessa semana (mesmo que o plantão mude no dia 1º). O outro líder avalia com notas.`
      )
    ) {
      return;
    }
    setAssiduidade('fora_plantao');
    setV(null);
    setP(null);
    setE(null);
    setD(null);
    setPr(null);
    setJustificativaNotaBaixa('');
    setErro(null);
    setMsg(null);
    setSalvando(true);
    try {
      const payload = {
        data_referencia: dataReferencia,
        colaborador_id: colaboradorId,
        assiduidade: 'fora_plantao' as const,
        nota_vestimenta: null,
        nota_pontualidade: null,
        nota_trabalho_equipe: null,
        nota_desempenho_tarefas: null,
        nota_proatividade: null,
        justificativa_nota_baixa: '',
      };
      const res = await fetch(postUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível registrar.');
        return;
      }
      setMsg('Registrado: fora do seu plantão nesta semana.');
      onSalvo();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const marcarFaltaInjustificada = async () => {
    if (somenteLeitura) return;
    if (
      !window.confirm(
        `${nome} faltou sem aviso na semana ${semanaLabel ?? 'selecionada'}?\n\nRegistra média 0 e sem Grãos na semana.`
      )
    ) {
      return;
    }
    setAssiduidade('falta_injustificada');
    setV(0);
    setP(0);
    setE(0);
    setD(0);
    setPr(0);
    setJustificativaNotaBaixa('');
    setErro(null);
    setMsg(null);
    setSalvando(true);
    try {
      const payload = {
        data_referencia: dataReferencia,
        colaborador_id: colaboradorId,
        assiduidade: 'falta_injustificada' as const,
        nota_vestimenta: 0,
        nota_pontualidade: 0,
        nota_trabalho_equipe: 0,
        nota_desempenho_tarefas: 0,
        nota_proatividade: 0,
        justificativa_nota_baixa: '',
      };
      const res = await fetch(postUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível registrar.');
        return;
      }
      setMsg('Registrado: falta injustificada (média 0).');
      onSalvo();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirFaltaJustificada = (motivoPreset?: string) => {
    if (somenteLeitura) return;
    setAssiduidade('falta_justificada');
    setJustificativaNotaBaixa(motivoPreset ?? '');
    setV(null);
    setP(null);
    setE(null);
    setD(null);
    setPr(null);
    setRegistroLegado(false);
    setErro(null);
    setMsg(null);
    setAvaliando(true);
  };

  const marcarFerias = async () => {
    if (somenteLeitura) return;
    if (
      !window.confirm(
        `${nome} está de férias na semana ${semanaLabel ?? 'selecionada'}?\n\nA semana não recebe nota e não entra na média do colaborador.`
      )
    ) {
      return;
    }
    setAssiduidade('ferias');
    setV(null);
    setP(null);
    setE(null);
    setD(null);
    setPr(null);
    setJustificativaNotaBaixa('');
    setErro(null);
    setMsg(null);
    setSalvando(true);
    try {
      const payload = {
        data_referencia: dataReferencia,
        colaborador_id: colaboradorId,
        assiduidade: 'ferias' as const,
        nota_vestimenta: null,
        nota_pontualidade: null,
        nota_trabalho_equipe: null,
        nota_desempenho_tarefas: null,
        nota_proatividade: null,
        justificativa_nota_baixa: '',
      };
      const res = await fetch(postUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível registrar.');
        return;
      }
      setMsg('Registrado: de férias nesta semana.');
      onSalvo();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const salvar = async () => {
    if (somenteLeitura) return;
    setErro(null);
    setMsg(null);
    if (
      (assiduidade === 'presente' || assiduidade === 'falta_justificada') &&
      ![v, p, e, d, pr].every((n) => notaCriterioValida(n))
    ) {
      setErro(
        assiduidade === 'falta_justificada'
          ? 'Com falta justificada, informe os cinco critérios (a nota vale; sem Grãos na semana).'
          : 'Informe os cinco critérios de 1 a 5.'
      );
      return;
    }
    if (temNotaBaixa && justificativaNotaBaixa.trim().length < 10) {
      setErro('Explique em poucas palavras o motivo da nota 3 ou menor.');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        data_referencia: dataReferencia,
        colaborador_id: colaboradorId,
        assiduidade,
        nota_vestimenta: estrelasDesabilitadas ? null : v,
        nota_pontualidade: estrelasDesabilitadas ? null : p,
        nota_trabalho_equipe: estrelasDesabilitadas ? null : e,
        nota_desempenho_tarefas: estrelasDesabilitadas ? null : d,
        nota_proatividade: estrelasDesabilitadas ? null : pr,
        justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa.trim() : '',
      };
      const res = await fetch(postUrl, {
        method: modoEdicao ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          modoEdicao ? { ...payload, avaliacao_id: avaliacaoInicial?.id } : payload
        ),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível salvar.');
        return;
      }
      setModoEdicao(false);
      onModoEdicaoChange?.(false);
      setMsg(modoEdicao ? 'Correção salva (edição única usada).' : 'Salvo.');
      onSalvo();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <article
      className={`rounded-xl border-2 bg-white shadow-sm overflow-hidden transition-colors ${
        injustificada ? 'border-red-500 ring-1 ring-red-200' : 'border-cafeteria-200'
      }`}
    >
      <div className="p-4 border-b border-cafeteria-100 bg-cream-50/80 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className="font-display text-lg text-cafeteria-900">{nome}</h3>
          {podeEditarAvaliacao && !modoEdicao ? (
            <button
              type="button"
              onClick={iniciarEdicao}
              className="inline-flex items-center gap-1 rounded-lg border border-cafeteria-300 bg-white px-3 py-2 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50 min-h-[44px]"
              title="Editar avaliação (uma vez)"
            >
              ✏️ Editar
            </button>
          ) : null}
          {modoEdicao ? (
            <span className="text-xs sm:text-sm font-medium rounded-full bg-sky-100 text-sky-900 px-2.5 py-0.5">
              Editando (única vez)
            </span>
          ) : null}
        </div>
        {cadastroPortalPendente ? (
          <span className="text-xs sm:text-sm font-medium rounded-full bg-cafeteria-200 text-cafeteria-900 px-2.5 py-0.5">
            Cadastro portal pendente
          </span>
        ) : null}
        {!apto && !somenteLeitura ? (
          <span className="text-xs font-medium rounded-full bg-sky-100 text-sky-900 px-2.5 py-0.5">
            Em adaptação
          </span>
        ) : apto ? (
          <span className="text-xs sm:text-sm font-medium rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5">
            Apto na função
          </span>
        ) : null}
        {somenteLeitura ? (
          foraPlantao ? (
            <span className="text-sm font-medium rounded-full bg-violet-100 text-violet-900 px-2.5 py-0.5">
              Outro líder
            </span>
          ) : ferias ? (
            <span className="text-sm font-medium rounded-full bg-sky-100 text-sky-900 px-2.5 py-0.5">
              Férias
            </span>
          ) : justificada ? (
            <span className="text-sm font-medium rounded-full bg-amber-100 text-amber-950 px-2.5 py-0.5">
              Falta justificada
            </span>
          ) : injustificada ? (
            <span className="text-sm font-medium rounded-full bg-red-100 text-red-900 px-2.5 py-0.5">
              Falta injustificada
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-medium rounded-full bg-green-100 text-green-800 px-2.5 py-0.5">
              Avaliado
            </span>
          )
        ) : (
          <span className="text-xs sm:text-sm font-medium rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5">Pendente</span>
        )}
        <p className="text-sm text-cafeteria-600 w-full">
          {[cargo, setor, unidade].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      <div className="p-4 space-y-5">
        {mostrarAcoesRapidas && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-cafeteria-900">O que aconteceu nesta semana?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  setAvaliando(true);
                  setMsg(null);
                  setErro(null);
                }}
                className="text-left rounded-xl border-2 border-cafeteria-600 bg-cafeteria-700 text-cream-50 px-3 py-3 min-h-[44px] hover:bg-cafeteria-800 disabled:opacity-50"
              >
                <span className="block text-sm font-semibold">Trabalhou na semana</span>
                <span className="block text-xs mt-0.5 opacity-90">Lançar nota dos 5 critérios</span>
              </button>
              {mostrarForaPlantao && (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void marcarForaPlantao()}
                  className="text-left rounded-xl border border-violet-400 bg-violet-50 text-violet-950 px-3 py-3 min-h-[44px] hover:bg-violet-100 disabled:opacity-50"
                >
                  <span className="block text-sm font-semibold">Outro plantão</span>
                  <span className="block text-xs mt-0.5 text-violet-800">
                    Não estava com você; o outro gerente (12x36) avalia
                  </span>
                </button>
              )}
              {mostrarFerias && (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void marcarFerias()}
                  className="text-left rounded-xl border border-sky-400 bg-sky-50 text-sky-950 px-3 py-3 min-h-[44px] hover:bg-sky-100 disabled:opacity-50"
                >
                  <span className="block text-sm font-semibold">Férias</span>
                  <span className="block text-xs mt-0.5 text-sky-800">Sem nota; fora da média do mês</span>
                </button>
              )}
              <button
                type="button"
                disabled={salvando}
                onClick={() => abrirFaltaJustificada()}
                className="text-left rounded-xl border border-amber-400 bg-amber-50 text-amber-950 px-3 py-3 min-h-[44px] hover:bg-amber-100 disabled:opacity-50"
              >
                <span className="block text-sm font-semibold">Falta justificada</span>
                <span className="block text-xs mt-0.5 text-amber-900">
                  Atestado ou motivo válido; você lança a nota dos critérios
                </span>
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => abrirFaltaJustificada('Licença médica / afastamento')}
                className="text-left rounded-xl border border-amber-300 bg-white text-amber-950 px-3 py-3 min-h-[44px] hover:bg-amber-50 disabled:opacity-50"
              >
                <span className="block text-sm font-semibold">Licença / afastamento</span>
                <span className="block text-xs mt-0.5 text-amber-900">
                  Afastamento com atestado; lançar nota normalmente
                </span>
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void marcarFaltaInjustificada()}
                className="text-left rounded-xl border border-red-400 bg-red-50 text-red-950 px-3 py-3 min-h-[44px] hover:bg-red-100 disabled:opacity-50 sm:col-span-2"
              >
                <span className="block text-sm font-semibold">Falta injustificada</span>
                <span className="block text-xs mt-0.5 text-red-900">
                  Faltou sem aviso; média 0 e sem Grãos na semana
                </span>
              </button>
            </div>
          </div>
        )}
        {cadastroPortalPendente && !mostrarAcoesRapidas && !avaliando && (
          <p className="text-sm text-cafeteria-800 bg-cafeteria-50 border border-cafeteria-200 rounded-lg px-3 py-2">
            Cadastro no portal ainda não concluído. Você pode avaliar a operação da semana normalmente.
          </p>
        )}
        {!apto && !somenteLeitura && !mostrarAcoesRapidas && !avaliando && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
            <p className="text-sm text-sky-950 flex-1 min-w-[200px]">
              Quando estiver 100% apto para trabalhar sem acompanhamento constante, registre abaixo.
            </p>
            <button
              type="button"
              disabled={marcandoApto}
              onClick={marcarApto}
              className="rounded-lg bg-sky-800 text-white text-sm font-medium px-3 py-2 hover:bg-sky-900 disabled:opacity-60"
            >
              {marcandoApto ? 'Salvando…' : 'Marcar como apto na função'}
            </button>
          </div>
        )}
        {somenteLeitura && !modoEdicao && !ferias && (
          <p className="text-sm text-cafeteria-800 bg-dourado-50 border border-dourado-200 rounded-lg px-3 py-2">
            <strong>{foraPlantao ? 'Repasse ao outro líder' : 'Avaliação enviada'}</strong>
            {foraPlantao
              ? ' — você informou que não era o gerente desta semana. Pendência sai da sua lista.'
              : edicaoUtilizada
                ? ' — leitura apenas (edição única já usada).'
                : podeEditarAvaliacao
                  ? ' — use Editar ao lado do nome para corrigir uma vez.'
                  : ' — leitura apenas.'}
          </p>
        )}
        {registroLegado && somenteLeitura && !foraPlantao && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Registro antigo (folga/escala). Edite para lançar a nota semanal atual.
          </p>
        )}
        {modoEdicao && (
          <p className="text-sm text-sky-950 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            Você pode corrigir esta avaliação <strong>uma única vez</strong>. Depois de salvar, não será possível
            alterar de novo.
          </p>
        )}
        {mostrarNotas && (
          <>
            {!somenteLeitura && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-cafeteria-900">Como foi a semana?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssiduidade('presente');
                      if (injustificada || justificada) {
                        setV(null);
                        setP(null);
                        setE(null);
                        setD(null);
                        setPr(null);
                      }
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] ${
                      assiduidade === 'presente'
                        ? 'bg-cafeteria-700 text-cream-50'
                        : 'border border-cafeteria-300 bg-white text-cafeteria-800'
                    }`}
                  >
                    Presente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssiduidade('falta_justificada');
                      setJustificativaNotaBaixa('');
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] ${
                      justificada
                        ? 'bg-amber-700 text-cream-50'
                        : 'border border-amber-400 bg-amber-50 text-amber-950'
                    }`}
                  >
                    Falta justificada
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFaltaInjustificada(true)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] ${
                      injustificada
                        ? 'bg-red-700 text-cream-50'
                        : 'border border-red-400 bg-red-50 text-red-950'
                    }`}
                  >
                    Falta injustificada
                  </button>
                </div>
              </div>
            )}

            {justificada && !somenteLeitura && (
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Falta justificada: <strong>sem Grãos</strong> nesta semana, mas informe a nota dos cinco critérios
                normalmente.
              </p>
            )}

            {justificada && !somenteLeitura && (
              <label className="block text-sm">
                <span className="text-cafeteria-800">Motivo (opcional)</span>
                <input
                  type="text"
                  value={justificativaNotaBaixa}
                  onChange={(e) => setJustificativaNotaBaixa(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-cafeteria-200 px-3 py-2"
                  maxLength={500}
                  placeholder="Ex.: atestado médico"
                />
              </label>
            )}

            {injustificada && (
              <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Falta injustificada: critérios zerados, média <strong>0</strong> e sem Grãos na semana.
              </p>
            )}

            <div className={`space-y-4 ${estrelasDesabilitadas ? 'opacity-60 pointer-events-none' : ''}`}>
              <StarRating
                idPrefix={`${colaboradorId}-vest`}
                label="Vestimenta"
                value={injustificada ? null : v}
                disabled={estrelasDesabilitadas}
                onChange={setV}
              />
              <StarRating
                idPrefix={`${colaboradorId}-pont`}
                label="Pontualidade"
                value={injustificada ? null : p}
                disabled={estrelasDesabilitadas}
                onChange={setP}
              />
              <StarRating
                idPrefix={`${colaboradorId}-eq`}
                label="Trabalho em equipe"
                value={injustificada ? null : e}
                disabled={estrelasDesabilitadas}
                onChange={setE}
              />
              <StarRating
                idPrefix={`${colaboradorId}-des`}
                label="Desempenho de tarefas"
                value={injustificada ? null : d}
                disabled={estrelasDesabilitadas}
                onChange={setD}
              />
              <div>
                <StarRating
                  idPrefix={`${colaboradorId}-pro`}
                  label="Proatividade e iniciativa"
                  value={injustificada ? null : pr}
                  disabled={estrelasDesabilitadas}
                  onChange={setPr}
                />
                <p className="text-sm text-cafeteria-500 pl-0 sm:pl-[10.5rem] leading-snug break-words">
                  {DICA_CRITERIO_PROATIVIDADE}
                </p>
              </div>
            </div>
          </>
        )}

        {foraPlantao && somenteLeitura && (
          <p className="text-sm text-violet-900 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
            Você sinalizou que <strong>outro líder</strong> deve avaliar esta semana. Não há notas suas aqui.
            {podeEditarAvaliacao ? (
              <>
                {' '}
                Se foi engano, use <strong>✏️ Editar</strong> e depois <strong>Avaliar esta semana</strong>.
              </>
            ) : null}
          </p>
        )}

        {modoEdicao && foraPlantao && (
          <div className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-3 space-y-3">
            <p className="text-sm text-violet-950">
              Você marcou <strong>outro plantão</strong>. Se {nome} estava com você nesta semana, desfaça e lance as
              notas.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={desfazerSemNotaNaEdicao}
                className="rounded-lg bg-violet-800 text-white text-sm font-medium px-4 py-2 min-h-[44px] hover:bg-violet-900"
              >
                Avaliar esta semana
              </button>
              <button
                type="button"
                onClick={cancelarEdicao}
                disabled={salvando}
                className="rounded-lg border border-violet-400 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50 min-h-[44px]"
              >
                Cancelar edição
              </button>
            </div>
          </div>
        )}

        {modoEdicao && ferias && (
          <div className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-3 space-y-3">
            <p className="text-sm text-sky-950">
              Você marcou <strong>férias</strong>. Se a pessoa trabalhou na semana, desfaça e avalie com notas.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={desfazerSemNotaNaEdicao}
                className="rounded-lg bg-sky-800 text-white text-sm font-medium px-4 py-2 min-h-[44px] hover:bg-sky-900"
              >
                Avaliar esta semana
              </button>
              <button
                type="button"
                onClick={cancelarEdicao}
                disabled={salvando}
                className="rounded-lg border border-sky-400 px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50 min-h-[44px]"
              >
                Cancelar edição
              </button>
            </div>
          </div>
        )}

        {justificada && somenteLeitura && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <strong>Falta justificada</strong> nesta semana — sem Grãos, mas a nota do líder vale para
            desempenho.
            {avaliacaoInicial?.justificativa_nota_baixa ? (
              <>
                {' '}
                Motivo: {avaliacaoInicial.justificativa_nota_baixa}
              </>
            ) : null}
          </p>
        )}

        {ferias && somenteLeitura && (
          <p className="text-sm text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            Colaborador <strong>de férias</strong> nesta semana. Sem nota e fora da média.
          </p>
        )}

        {mostrarNotas && (temNotaBaixa || avaliacaoInicial?.justificativa_nota_baixa) && (
          <div>
            <label className="block text-sm font-medium text-cafeteria-800 mb-1">
              Justificativa da nota baixa
            </label>
            {somenteLeitura ? (
              <div className="rounded-lg border border-cafeteria-200 bg-cafeteria-50 px-3 py-2.5 text-sm text-cafeteria-900 whitespace-pre-wrap break-words leading-relaxed">
                {justificativaNotaBaixa.trim() || '—'}
              </div>
            ) : (
              <textarea
                value={justificativaNotaBaixa}
                onChange={(e) => setJustificativaNotaBaixa(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full rounded-lg border border-cafeteria-200 px-3 py-2.5 text-sm text-cafeteria-900 whitespace-pre-wrap break-words leading-relaxed"
                placeholder="Explique o motivo para orientar o acompanhamento."
              />
            )}
            {!somenteLeitura && temNotaBaixa && (
              <p className="mt-1 text-sm text-cafeteria-600">
                Obrigatório quando houver nota 3 ou menor.
              </p>
            )}
          </div>
        )}

        {mostrarNotas && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-cafeteria-100">
            <p className="text-sm text-cafeteria-700">
              Média da semana{somenteLeitura ? '' : ' (prévia)'}:{' '}
              <strong>
                {somenteLeitura && avaliacaoInicial?.media_dia != null
                  ? Number(avaliacaoInicial.media_dia).toFixed(2)
                  : injustificada
                    ? '0,00'
                    : previewMedia === null
                      ? 'Preencha os 5 critérios'
                      : previewMedia.toFixed(2)}
              </strong>
              {!somenteLeitura && !injustificada && previewMedia !== null && (
                <span className="text-cafeteria-500 font-normal"> (média dos 5 critérios)</span>
              )}
            </p>
            {!somenteLeitura && (
              <div className="flex flex-wrap gap-2">
                {modoEdicao ? (
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    disabled={salvando}
                    className="rounded-lg border border-cafeteria-300 px-4 py-2 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                ) : avaliando ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAvaliando(false);
                      setMsg(null);
                      setErro(null);
                    }}
                    disabled={salvando}
                    className="rounded-lg border border-cafeteria-300 px-4 py-2 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50 disabled:opacity-50"
                  >
                    Voltar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={salvar}
                  disabled={salvando}
                  className="rounded-lg bg-cafeteria-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-cafeteria-800 disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : modoEdicao ? 'Salvar correção' : rotuloSalvar}
                </button>
              </div>
            )}
          </div>
        )}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {msg && !erro && <p className="text-sm text-green-700">{msg}</p>}
      </div>
    </article>
  );
}
