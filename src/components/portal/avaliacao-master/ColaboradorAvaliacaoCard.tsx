'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StarRating } from './StarRating';
import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';
import { calcularMediaDia, temNotaBaixaEquipe } from '@/lib/avaliacao-diaria';
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
  dataReferencia: string;
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
};

function mapRowToState(row: NonNullable<AvaliacaoServidor>): {
  assiduidade: AssiduidadeTipo;
  v: number | null;
  p: number | null;
  e: number | null;
  d: number | null;
  pr: number | null;
} {
  const pick = (n: number | null | undefined) => (notaCriterioValida(n) ? n : null);
  return {
    assiduidade: row.assiduidade,
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
  dataReferencia,
  avaliacaoInicial,
  onboardingCompleto = true,
  operacaoApto = false,
  onSalvo,
  postUrl = '/api/portal/avaliacao-master',
  rotuloSalvar = 'Salvar avaliação',
  forcarEdicao = false,
  onModoEdicaoChange,
  permiteEdicaoUnica = true,
}: Props) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const edicaoUtilizada = avaliacaoInicial?.edicao_utilizada === true;
  const podeEditarAvaliacao =
    permiteEdicaoUnica && avaliacaoInicial != null && !edicaoUtilizada && !!avaliacaoInicial.id;
  const somenteLeitura = avaliacaoInicial != null && !modoEdicao;
  const cadastroPortalPendente = !onboardingCompleto;

  const inicial = useMemo(() => {
    if (!avaliacaoInicial) {
      return {
        assiduidade: 'presente' as AssiduidadeTipo,
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
    setV(inicial.v);
    setP(inicial.p);
    setE(inicial.e);
    setD(inicial.d);
    setPr(inicial.pr);
    setJustificativaNotaBaixa(avaliacaoInicial?.justificativa_nota_baixa ?? '');
    setMsg(null);
    setErro(null);
  }, [avaliacaoInicial?.justificativa_nota_baixa, inicial.assiduidade, inicial.v, inicial.p, inicial.e, inicial.d, inicial.pr]);

  useEffect(() => {
    setApto(operacaoApto);
  }, [operacaoApto]);

  useEffect(() => {
    if (forcarEdicao && podeEditarAvaliacao) {
      setModoEdicao(true);
      onModoEdicaoChange?.(true);
    }
  }, [forcarEdicao, podeEditarAvaliacao, onModoEdicaoChange]);

  const iniciarEdicao = () => {
    if (!podeEditarAvaliacao) return;
    setModoEdicao(true);
    onModoEdicaoChange?.(true);
    setMsg(null);
    setErro(null);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    onModoEdicaoChange?.(false);
    setAssiduidade(inicial.assiduidade);
    setV(inicial.v);
    setP(inicial.p);
    setE(inicial.e);
    setD(inicial.d);
    setPr(inicial.pr);
    setJustificativaNotaBaixa(avaliacaoInicial?.justificativa_nota_baixa ?? '');
    setMsg(null);
    setErro(null);
  };

  const injustificada = assiduidade === 'falta_injustificada';
  const isento =
    assiduidade === 'falta_justificada' || assiduidade === 'folga' || assiduidade === 'outra_escala';
  const estrelasDesabilitadas = somenteLeitura || injustificada || isento;
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

  const setAssiduidadeComEfeito = useCallback((next: AssiduidadeTipo) => {
    setAssiduidade(next);
    setMsg(null);
    setErro(null);
    if (next === 'falta_injustificada') {
      setV(0);
      setP(0);
      setE(0);
      setD(0);
    }
    if (next === 'falta_justificada') {
      setV(null);
      setP(null);
      setE(null);
      setD(null);
    }
    if (next === 'folga') {
      setV(null);
      setP(null);
      setE(null);
      setD(null);
    }
    if (next === 'outra_escala') {
      setV(null);
      setP(null);
      setE(null);
      setD(null);
    }
    if (next === 'presente') {
      setV(null);
      setP(null);
      setE(null);
      setD(null);
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

  const salvar = async () => {
    if (somenteLeitura) return;
    setErro(null);
    setMsg(null);
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
            <span className="text-xs font-medium rounded-full bg-sky-100 text-sky-900 px-2.5 py-0.5">
              Editando (única vez)
            </span>
          ) : null}
        </div>
        {cadastroPortalPendente ? (
          <span className="text-xs font-medium rounded-full bg-cafeteria-200 text-cafeteria-900 px-2.5 py-0.5">
            Cadastro portal pendente
          </span>
        ) : null}
        {!apto && !somenteLeitura ? (
          <span className="text-xs font-medium rounded-full bg-sky-100 text-sky-900 px-2.5 py-0.5">
            Em adaptação
          </span>
        ) : apto ? (
          <span className="text-xs font-medium rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5">
            Apto na função
          </span>
        ) : null}
        {somenteLeitura ? (
          <span className="text-xs font-medium rounded-full bg-green-100 text-green-800 px-2.5 py-0.5">Avaliado</span>
        ) : (
          <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5">Pendente</span>
        )}
        <p className="text-sm text-cafeteria-600">
          {[cargo, setor].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      <div className="p-4 space-y-5">
        {cadastroPortalPendente && (
          <p className="text-sm text-cafeteria-800 bg-cafeteria-50 border border-cafeteria-200 rounded-lg px-3 py-2">
            Cadastro no portal ainda não concluído. Você pode avaliar a operação da semana normalmente.
          </p>
        )}
        {!apto && !somenteLeitura && (
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
        {somenteLeitura && !modoEdicao && (
          <p className="text-sm text-cafeteria-800 bg-dourado-50 border border-dourado-200 rounded-lg px-3 py-2">
            <strong>Avaliação enviada</strong>
            {edicaoUtilizada
              ? ' — leitura apenas (edição única já usada).'
              : podeEditarAvaliacao
                ? ' — use Editar ao lado do nome para corrigir uma vez.'
                : ' — leitura apenas.'}
          </p>
        )}
        {modoEdicao && (
          <p className="text-sm text-sky-950 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            Você pode corrigir esta avaliação <strong>uma única vez</strong>. Depois de salvar, não será possível
            alterar de novo.
          </p>
        )}
        <div>
          <span className="block text-sm font-medium text-cafeteria-800 mb-2">Assiduidade</span>
          <div
            className={`flex flex-col gap-2 ${somenteLeitura ? 'pointer-events-none opacity-90' : ''}`}
            role="radiogroup"
            aria-label="Assiduidade"
            aria-readonly={somenteLeitura}
          >
            {(
              [
                { value: 'presente' as const, label: 'Presente' },
                { value: 'folga' as const, label: 'Folga (semana isenta na média mensal)' },
                { value: 'outra_escala' as const, label: 'Outra escala (12x36, semana isenta na média mensal)' },
                { value: 'falta_justificada' as const, label: 'Falta justificada (semana isenta na média mensal)' },
                { value: 'falta_injustificada' as const, label: 'Falta injustificada (zera a semana)' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                  assiduidade === opt.value
                    ? opt.value === 'falta_injustificada'
                      ? 'border-red-500 bg-red-50 text-red-950'
                      : 'border-dourado-base bg-dourado-50'
                    : 'border-cafeteria-200 hover:border-cafeteria-300'
                }`}
              >
                <input
                  type="radio"
                  name={`assid-${colaboradorId}`}
                  value={opt.value}
                  checked={assiduidade === opt.value}
                  onChange={() => setAssiduidadeComEfeito(opt.value)}
                  className="mt-1"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {isento && (
          <p className="text-sm text-cafeteria-600 bg-cafeteria-50 border border-cafeteria-100 rounded-lg px-3 py-2">
            Semana marcada como <strong>isenta</strong> — não entra no cálculo da média mensal.
          </p>
        )}

        {injustificada && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Os cinco critérios foram zerados. A média da semana é{' '}
            <strong>0</strong>.
          </p>
        )}

        <div className={`space-y-4 ${estrelasDesabilitadas ? 'opacity-60 pointer-events-none' : ''}`}>
          <StarRating
            idPrefix={`${colaboradorId}-vest`}
            label="Vestimenta"
            value={isento || injustificada ? null : v}
            disabled={estrelasDesabilitadas}
            onChange={setV}
          />
          <StarRating
            idPrefix={`${colaboradorId}-pont`}
            label="Pontualidade"
            value={isento || injustificada ? null : p}
            disabled={estrelasDesabilitadas}
            onChange={setP}
          />
          <StarRating
            idPrefix={`${colaboradorId}-eq`}
            label="Trabalho em equipe"
            value={isento || injustificada ? null : e}
            disabled={estrelasDesabilitadas}
            onChange={setE}
          />
          <StarRating
            idPrefix={`${colaboradorId}-des`}
            label="Desempenho de tarefas"
            value={isento || injustificada ? null : d}
            disabled={estrelasDesabilitadas}
            onChange={setD}
          />
          <div>
            <StarRating
              idPrefix={`${colaboradorId}-pro`}
              label="Proatividade e iniciativa"
              value={isento || injustificada ? null : pr}
              disabled={estrelasDesabilitadas}
              onChange={setPr}
            />
            <p className="text-xs sm:text-sm text-cafeteria-500 pl-0 sm:pl-[10.5rem] -mt-1">{DICA_CRITERIO_PROATIVIDADE}</p>
          </div>
        </div>

        {(temNotaBaixa || avaliacaoInicial?.justificativa_nota_baixa) && (
          <div>
            <label className="block text-sm font-medium text-cafeteria-800 mb-1">
              Justificativa da nota baixa
            </label>
            <textarea
              value={justificativaNotaBaixa}
              onChange={(e) => setJustificativaNotaBaixa(e.target.value)}
              disabled={somenteLeitura}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-cafeteria-200 px-3 py-2 text-sm text-cafeteria-900 disabled:bg-cafeteria-50"
              placeholder="Explique o motivo para orientar o acompanhamento."
            />
            {!somenteLeitura && temNotaBaixa && (
              <p className="mt-1 text-xs text-cafeteria-600">
                Obrigatório quando houver nota 3 ou menor.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-cafeteria-100">
          <p className="text-sm text-cafeteria-700">
            Média da semana{somenteLeitura ? '' : ' (prévia)'}:{' '}
            <strong>
              {somenteLeitura && avaliacaoInicial?.media_dia != null
                ? Number(avaliacaoInicial.media_dia).toFixed(2)
                : isento
                  ? 'Isenta'
                  : previewMedia === null
                    ? assiduidade === 'presente'
                      ? 'Preencha os 5 critérios'
                      : '—'
                    : previewMedia.toFixed(2)}
            </strong>
            {!somenteLeitura && assiduidade === 'presente' && previewMedia !== null && (
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
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {msg && !erro && <p className="text-sm text-green-700">{msg}</p>}
      </div>
    </article>
  );
}
