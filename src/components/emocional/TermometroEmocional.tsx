'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { EMOCOES_TERMOMETRO, EMOCIONAL_MOTIVO_MAX, metaEmocao } from '@/lib/emocional-opcoes';

type Passo = 'escolher' | 'falar' | 'escrever';

type Props = {
  /** Chamado após salvar o registro do dia (gate de entrada). */
  onRegistroConcluido?: () => void;
  /** Texto e tom para o modal obrigatório na entrada. */
  modoGate?: boolean;
};

export function TermometroEmocional({ onRegistroConcluido, modoGate = false }: Props = {}) {
  const [emocaoAtual, setEmocaoAtual] = useState<string | null>(null);
  const [motivoAtual, setMotivoAtual] = useState<string | null>(null);
  const [passo, setPasso] = useState<Passo>('escolher');
  const [emocaoPendente, setEmocaoPendente] = useState<string | null>(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reescolhendo, setReescolhendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) return;

    fetch('/api/portal/emocional', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setEmocaoAtual(data.emocao ?? null);
          setMotivoAtual(data.motivo ?? null);
        }
      });
  }, []);

  const fecharFluxo = (emocao: string, motivo: string | null) => {
    setEmocaoAtual(emocao);
    setMotivoAtual(motivo);
    setPasso('escolher');
    setEmocaoPendente(null);
    setMotivoTexto('');
    setReescolhendo(false);
    setErro(null);
    onRegistroConcluido?.();
  };

  const enviarRegistro = async (emocao: string, motivo?: string | null) => {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch('/api/portal/emocional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emocao,
          motivo: motivo === null ? null : motivo?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível registrar.');
        return;
      }
      fecharFluxo(emocao, data.motivo ?? (motivo?.trim() || null));
    } finally {
      setEnviando(false);
    }
  };

  const escolherEmocao = (emocao: string) => {
    setEmocaoPendente(emocao);
    setMotivoTexto('');
    setPasso('falar');
    setErro(null);
  };

  const responderFalar = (querFalar: boolean) => {
    if (!emocaoPendente) return;
    if (!querFalar) {
      void enviarRegistro(emocaoPendente, null);
      return;
    }
    setPasso('escrever');
  };

  const voltarEscolher = () => {
    setPasso('escolher');
    setEmocaoPendente(null);
    setMotivoTexto('');
    setReescolhendo(false);
    setErro(null);
  };

  const metaAtual = emocaoAtual ? metaEmocao(emocaoAtual) : null;
  const metaPendente = emocaoPendente ? metaEmocao(emocaoPendente) : null;
  const emFluxo = passo !== 'escolher' || reescolhendo;

  return (
    <div className="rounded-xl border border-dourado-200 bg-cream-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {!modoGate ? (
            <h3 className="font-display font-semibold text-coffee-base text-sm">Como você está hoje?</h3>
          ) : null}
          <p className="text-coffee-100 text-xs mt-0.5 leading-relaxed">
            {modoGate
              ? 'Sua resposta ajuda a liderança e o RH a cuidarem da equipe. Colegas da operação não veem.'
              : 'Liderança, RH, administração e sócios podem ver sua resposta com seu nome. Colegas da operação não têm acesso.'}
          </p>
        </div>
        {emocaoAtual && !emFluxo && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">{metaAtual?.emoji ?? '✓'}</span>
            <span className="text-sm text-coffee-base font-medium">{metaAtual?.label ?? emocaoAtual}</span>
          </div>
        )}
      </div>

      {emocaoAtual && motivoAtual && !emFluxo && (
        <p className="mt-3 text-sm text-coffee-base/90 border-t border-cream-200 pt-3 whitespace-pre-wrap break-words">
          <span className="font-medium text-coffee-100">O que você compartilhou: </span>
          {motivoAtual}
        </p>
      )}

      {emocaoAtual && !emFluxo && (
        <button
          type="button"
          onClick={() => {
            setReescolhendo(true);
            setEmocaoPendente(null);
            setMotivoTexto('');
            setPasso('escolher');
          }}
          className="mt-3 text-xs text-dourado-base font-medium hover:underline"
        >
          Alterar resposta de hoje
        </button>
      )}

      {!emocaoAtual && passo === 'escolher' && !reescolhendo && (
        <p className="mt-2 text-xs text-terracota-700 font-medium">Ainda não respondeu hoje.</p>
      )}

      {reescolhendo && passo === 'escolher' && (
        <p className="mt-2 text-xs text-coffee-100">Escolha como está se sentindo hoje.</p>
      )}

      {passo === 'escolher' && (!emocaoAtual || reescolhendo) && (
        <div className="mt-4 pt-4 border-t border-cream-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EMOCOES_TERMOMETRO.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => escolherEmocao(e.id)}
                disabled={enviando}
                className="flex items-center gap-2 rounded-xl border-2 border-cream-300 bg-white px-3 py-2 text-sm hover:border-dourado-200 hover:bg-dourado-50 disabled:opacity-50 transition-colors text-left"
              >
                <span className="text-xl shrink-0">{e.emoji}</span>
                <span className="text-coffee-base leading-tight">{e.label}</span>
              </button>
            ))}
          </div>
          {reescolhendo && (
            <button
              type="button"
              onClick={voltarEscolher}
              className="mt-3 text-xs text-coffee-100 hover:text-coffee-base"
            >
              Cancelar alteração
            </button>
          )}
        </div>
      )}

      {passo === 'falar' && emocaoPendente && (
        <div className="mt-4 pt-4 border-t border-cream-200 space-y-4">
          <div className="flex items-center gap-2 text-sm text-coffee-base">
            <span className="text-xl">{metaPendente?.emoji}</span>
            <span className="font-medium">{metaPendente?.label ?? emocaoPendente}</span>
          </div>
          <p className="text-sm font-medium text-coffee-base">Quer falar sobre isso?</p>
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={() => responderFalar(true)}
              className="rounded-lg bg-dourado-base px-4 py-2.5 text-cream-100 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50 min-h-[44px]"
            >
              Sim
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => responderFalar(false)}
              className="rounded-lg border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-coffee-base hover:bg-cream-50 disabled:opacity-50 min-h-[44px]"
            >
              {enviando ? 'Salvando…' : 'Não, só registrar'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={voltarEscolher}
              className="rounded-lg px-4 py-2.5 text-sm text-coffee-100 hover:text-coffee-base disabled:opacity-50 min-h-[44px]"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {passo === 'escrever' && emocaoPendente && (
        <div className="mt-4 pt-4 border-t border-cream-200 space-y-3">
          <div className="flex items-center gap-2 text-sm text-coffee-base">
            <span className="text-xl">{metaPendente?.emoji}</span>
            <span className="font-medium">{metaPendente?.label ?? emocaoPendente}</span>
          </div>
          <label className="block text-sm text-coffee-base">
            <span className="font-medium">Conte o que está sentindo</span>
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              maxLength={EMOCIONAL_MOTIVO_MAX}
              rows={3}
              autoFocus
              placeholder="Escreva com suas palavras…"
              className="mt-1.5 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-coffee-base placeholder:text-coffee-100/70 resize-y min-h-[72px]"
            />
            <span className="text-xs text-coffee-100 mt-1 block">
              {motivoTexto.length}/{EMOCIONAL_MOTIVO_MAX} · liderança, RH e gestão leem
            </span>
          </label>
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enviando || motivoTexto.trim().length === 0}
              onClick={() => void enviarRegistro(emocaoPendente, motivoTexto)}
              className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50 min-h-[44px]"
            >
              {enviando ? 'Salvando…' : 'Publicar'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => setPasso('falar')}
              className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm text-coffee-base hover:bg-cream-50 disabled:opacity-50 min-h-[44px]"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
