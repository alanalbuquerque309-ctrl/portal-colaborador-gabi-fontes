'use client';

import { useState } from 'react';
import { AVALIACAO_IGNORAR_MOTIVO_MIN } from '@/lib/avaliacao-ignorada';

type AcaoAberta = null | 'ignorar' | 'ignorar_confirm' | 'apagar' | 'apagar_confirm';

type Props = {
  avaliacaoId: string;
  colaboradorNome?: string | null;
  avaliadorRotulo?: string | null;
  /** Se já ignorada, só mostra apagar. */
  jaIgnorada?: boolean;
  onAlterada: () => void;
  variant?: 'inline' | 'aside';
};

function rotuloContexto(colaboradorNome?: string | null, avaliadorRotulo?: string | null): string {
  const partes: string[] = [];
  if (colaboradorNome) partes.push(colaboradorNome);
  if (avaliadorRotulo) partes.push(avaliadorRotulo);
  return partes.length > 0 ? partes.join(' · ') : '';
}

export function AdminAvaliacaoAdminAcao({
  avaliacaoId,
  colaboradorNome,
  avaliadorRotulo,
  jaIgnorada = false,
  onAlterada,
  variant = 'inline',
}: Props) {
  const [acao, setAcao] = useState<AcaoAberta>(null);
  const [motivo, setMotivo] = useState('Vínculo de liderança incorreto no cadastro');
  const [confirmoIgnorar, setConfirmoIgnorar] = useState(false);
  const [confirmoApagar, setConfirmoApagar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const contexto = rotuloContexto(colaboradorNome, avaliadorRotulo);

  const fechar = () => {
    setAcao(null);
    setConfirmoIgnorar(false);
    setConfirmoApagar(false);
    setErro(null);
  };

  const executarIgnorar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch('/api/admin/avaliacoes-diarias/ignorar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao_id: avaliacaoId, motivo }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível ignorar.');
        return;
      }
      fechar();
      onAlterada();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const executarApagar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch('/api/admin/avaliacoes-diarias/apagar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao_id: avaliacaoId, confirmar_exclusao: true }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível apagar.');
        return;
      }
      fechar();
      onAlterada();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const triggerIgnorarClass =
    variant === 'aside'
      ? 'w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900 hover:bg-amber-100'
      : 'text-[10px] font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2';

  const triggerApagarClass =
    variant === 'aside'
      ? 'w-full rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-900 hover:bg-red-100'
      : 'text-[10px] font-medium text-red-800 hover:text-red-950 underline underline-offset-2';

  const painelClass =
    variant === 'aside'
      ? 'basis-full w-full rounded-lg border p-2 text-left'
      : 'mt-2 rounded-lg border p-2 text-left max-w-[16rem]';

  if (acao === 'ignorar' || acao === 'ignorar_confirm') {
    const painelIgnorar = acao === 'ignorar_confirm';
    return (
      <div className={`${painelClass} border-amber-200 bg-amber-50/90`}>
        {painelIgnorar ? (
          <>
            <p className="text-[10px] font-semibold text-amber-950 leading-snug">
              Confirmar ignorar avaliação?
            </p>
            <p className="text-[10px] text-amber-900 mt-1 leading-snug">
              O registro permanece no histórico, mas não entra na média, ranking nem bonificação.
              {contexto ? ` ${contexto}` : ''}
            </p>
            <p className="text-[10px] text-coffee-base mt-1.5 italic line-clamp-3" title={motivo}>
              Motivo: {motivo}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] text-amber-950 font-medium leading-snug">
              Ignorar avaliação (fora da média).
              {contexto ? ` ${contexto}` : ''}
            </p>
            <label className="block text-[10px] text-coffee-base mt-1.5 mb-0.5">Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="w-full rounded border border-cream-300 px-2 py-1 text-[11px] text-coffee-base"
            />
            <label className="flex items-start gap-1.5 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmoIgnorar}
                onChange={(e) => setConfirmoIgnorar(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-[10px] text-coffee-base leading-snug">
                Confirmo que esta avaliação não deve contar na média.
              </span>
            </label>
          </>
        )}
        {erro && <p className="text-[10px] text-red-600 mt-1">{erro}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {painelIgnorar ? (
            <>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void executarIgnorar()}
                className="rounded bg-amber-800 text-cream-100 px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
              >
                {salvando ? '…' : 'Sim, ignorar avaliação'}
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  setAcao('ignorar');
                  setErro(null);
                }}
                className="rounded border border-cream-300 px-2 py-0.5 text-[10px] text-coffee-base"
              >
                Voltar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={
                  salvando || !confirmoIgnorar || motivo.trim().length < AVALIACAO_IGNORAR_MOTIVO_MIN
                }
                onClick={() => {
                  setErro(null);
                  setAcao('ignorar_confirm');
                }}
                className="rounded bg-amber-800 text-cream-100 px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
              >
                Continuar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={fechar}
                className="rounded border border-cream-300 px-2 py-0.5 text-[10px] text-coffee-base"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (acao === 'apagar' || acao === 'apagar_confirm') {
    const painelApagar = acao === 'apagar_confirm';
    return (
      <div className={`${painelClass} border-red-200 bg-red-50/90`}>
        {painelApagar ? (
          <>
            <p className="text-[10px] font-semibold text-red-950 leading-snug">
              Apagar permanentemente?
            </p>
            <p className="text-[10px] text-red-900 mt-1 leading-snug">
              Esta ação não pode ser desfeita. A avaliação será removida do banco.
              {contexto ? ` ${contexto}` : ''}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] text-red-950 font-medium leading-snug">
              Apagar avaliação (exclusão permanente).
              {contexto ? ` ${contexto}` : ''}
            </p>
            <label className="flex items-start gap-1.5 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmoApagar}
                onChange={(e) => setConfirmoApagar(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-[10px] text-coffee-base leading-snug">
                Entendo que o registro será apagado e não poderá ser recuperado.
              </span>
            </label>
          </>
        )}
        {erro && <p className="text-[10px] text-red-600 mt-1">{erro}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {painelApagar ? (
            <>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void executarApagar()}
                className="rounded bg-red-800 text-cream-100 px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
              >
                {salvando ? '…' : 'Sim, apagar avaliação'}
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  setAcao('apagar');
                  setErro(null);
                }}
                className="rounded border border-cream-300 px-2 py-0.5 text-[10px] text-coffee-base"
              >
                Voltar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={salvando || !confirmoApagar}
                onClick={() => {
                  setErro(null);
                  setAcao('apagar_confirm');
                }}
                className="rounded bg-red-800 text-cream-100 px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
              >
                Continuar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={fechar}
                className="rounded border border-cream-300 px-2 py-0.5 text-[10px] text-coffee-base"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={variant === 'aside' ? 'flex flex-col gap-1 shrink-0 min-w-[7.5rem]' : 'flex flex-col gap-1'}>
      {!jaIgnorada && (
        <button type="button" onClick={() => setAcao('ignorar')} className={triggerIgnorarClass}>
          Ignorar avaliação
        </button>
      )}
      <button type="button" onClick={() => setAcao('apagar')} className={triggerApagarClass}>
        Apagar avaliação
      </button>
    </div>
  );
}