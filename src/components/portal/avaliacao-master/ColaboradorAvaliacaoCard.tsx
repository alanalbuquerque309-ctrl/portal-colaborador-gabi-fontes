'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StarRating } from './StarRating';
import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';
import { calcularMediaDia } from '@/lib/avaliacao-diaria';

export type AvaliacaoServidor = {
  assiduidade: AssiduidadeTipo;
  nota_vestimenta: number | null;
  nota_pontualidade: number | null;
  nota_trabalho_equipe: number | null;
  nota_desempenho_tarefas: number | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
} | null;

type Props = {
  colaboradorId: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  dataReferencia: string;
  avaliacaoInicial: AvaliacaoServidor;
  onSalvo: () => void;
};

function mapRowToState(row: NonNullable<AvaliacaoServidor>): {
  assiduidade: AssiduidadeTipo;
  v: number | null;
  p: number | null;
  e: number | null;
  d: number | null;
} {
  return {
    assiduidade: row.assiduidade,
    v:
      row.nota_vestimenta != null && row.nota_vestimenta >= 1 && row.nota_vestimenta <= 5
        ? row.nota_vestimenta
        : null,
    p:
      row.nota_pontualidade != null && row.nota_pontualidade >= 1 && row.nota_pontualidade <= 5
        ? row.nota_pontualidade
        : null,
    e:
      row.nota_trabalho_equipe != null && row.nota_trabalho_equipe >= 1 && row.nota_trabalho_equipe <= 5
        ? row.nota_trabalho_equipe
        : null,
    d:
      row.nota_desempenho_tarefas != null && row.nota_desempenho_tarefas >= 1 && row.nota_desempenho_tarefas <= 5
        ? row.nota_desempenho_tarefas
        : null,
  };
}

export function ColaboradorAvaliacaoCard({
  colaboradorId,
  nome,
  cargo,
  setor,
  dataReferencia,
  avaliacaoInicial,
  onSalvo,
}: Props) {
  const somenteLeitura = avaliacaoInicial != null;

  const inicial = useMemo(() => {
    if (!avaliacaoInicial) {
      return {
        assiduidade: 'presente' as AssiduidadeTipo,
        v: null as number | null,
        p: null as number | null,
        e: null as number | null,
        d: null as number | null,
      };
    }
    return mapRowToState(avaliacaoInicial);
  }, [avaliacaoInicial]);

  const [assiduidade, setAssiduidade] = useState<AssiduidadeTipo>(inicial.assiduidade);
  const [v, setV] = useState<number | null>(inicial.v);
  const [p, setP] = useState<number | null>(inicial.p);
  const [e, setE] = useState<number | null>(inicial.e);
  const [d, setD] = useState<number | null>(inicial.d);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [justificativaNotaBaixa, setJustificativaNotaBaixa] = useState(
    avaliacaoInicial?.justificativa_nota_baixa ?? ''
  );

  useEffect(() => {
    setAssiduidade(inicial.assiduidade);
    setV(inicial.v);
    setP(inicial.p);
    setE(inicial.e);
    setD(inicial.d);
    setJustificativaNotaBaixa(avaliacaoInicial?.justificativa_nota_baixa ?? '');
    setMsg(null);
    setErro(null);
  }, [avaliacaoInicial?.justificativa_nota_baixa, inicial.assiduidade, inicial.v, inicial.p, inicial.e, inicial.d]);

  const injustificada = assiduidade === 'falta_injustificada';
  const isento =
    assiduidade === 'falta_justificada' || assiduidade === 'folga' || assiduidade === 'outra_escala';
  const estrelasDesabilitadas = somenteLeitura || injustificada || isento;
  const temNotaBaixa =
    injustificada ||
    [v, p, e, d].some((nota) => typeof nota === 'number' && nota <= 3);

  const previewMedia = useMemo(() => {
    return calcularMediaDia(assiduidade, {
      vestimenta: v,
      pontualidade: p,
      trabalhoEquipe: e,
      desempenhoTarefas: d,
    }).media;
  }, [assiduidade, v, p, e, d]);

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
      const res = await fetch('/api/portal/avaliacao-master', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_referencia: dataReferencia,
          colaborador_id: colaboradorId,
          assiduidade,
          nota_vestimenta: estrelasDesabilitadas ? null : v,
          nota_pontualidade: estrelasDesabilitadas ? null : p,
          nota_trabalho_equipe: estrelasDesabilitadas ? null : e,
          nota_desempenho_tarefas: estrelasDesabilitadas ? null : d,
          justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa.trim() : '',
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível salvar.');
        return;
      }
      setMsg('Salvo.');
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
        <h3 className="font-display text-lg text-cafeteria-900">{nome}</h3>
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
        {somenteLeitura && (
          <p className="text-sm text-cafeteria-800 bg-dourado-50 border border-dourado-200 rounded-lg px-3 py-2">
            <strong>Avaliação enviada</strong> — leitura apenas. Alterações só pelo administrativo/RH.
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
            Os critérios Vestimenta, Pontualidade, Equipe e Desempenho foram zerados. A média da semana é{' '}
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
                      ? 'Preencha as 4 notas'
                      : '—'
                    : previewMedia.toFixed(2)}
            </strong>
            {!somenteLeitura && assiduidade === 'presente' && previewMedia !== null && (
              <span className="text-cafeteria-500 font-normal"> (inclui presença = 5)</span>
            )}
          </p>
          {!somenteLeitura && (
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="rounded-lg bg-cafeteria-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-cafeteria-800 disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar avaliação'}
            </button>
          )}
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {msg && !erro && <p className="text-sm text-green-700">{msg}</p>}
      </div>
    </article>
  );
}
