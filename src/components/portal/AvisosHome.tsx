'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalBalaoCard } from '@/components/portal/vivo/PortalBalaoCard';
import { MegafoneAnimado } from '@/components/portal/vivo/MegafoneAnimado';
import { emitPortalHomeAtualizado } from '@/lib/portal-home-events';

type Aviso = {
  id: string;
  titulo: string;
  conteudo: string | null;
  data_publicacao: string;
  exige_confirmacao?: boolean;
  confirmado?: boolean;
};

const MAX_AVISOS_HOME = 2;
const STORAGE_RECOLHIDOS = 'portal_comunicados_recolhidos';

function lerRecolhidosLocal(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_RECOLHIDOS);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function gravarRecolhidosLocal(ids: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_RECOLHIDOS, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

function estaRecolhido(a: Aviso, index: number, recolhidosLocal: Set<string>): boolean {
  if (index >= 1) return true;
  if (a.exige_confirmacao && a.confirmado) return true;
  if (!a.exige_confirmacao && recolhidosLocal.has(a.id)) return true;
  return false;
}

function ConteudoComunicado({
  aviso,
  confirmando,
  onConfirmar,
  onRecolher,
  modoGaveta,
}: {
  aviso: Aviso;
  confirmando: string | null;
  onConfirmar: (id: string) => void;
  onRecolher?: () => void;
  modoGaveta?: boolean;
}) {
  const pendente = Boolean(aviso.exige_confirmacao && !aviso.confirmado);

  return (
    <>
      <h3 className="font-semibold text-cafeteria-900 leading-snug pr-2">{aviso.titulo}</h3>
      {aviso.conteudo ? (
        <p className="text-sm text-cafeteria-700 mt-2 leading-relaxed whitespace-pre-wrap">{aviso.conteudo}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-cream-200">
        <span className="text-xs text-cafeteria-500">
          {new Date(aviso.data_publicacao).toLocaleDateString('pt-BR')}
        </span>
        <div className="flex flex-wrap gap-2">
          {modoGaveta && onRecolher ? (
            <button
              type="button"
              onClick={onRecolher}
              className="rounded-lg border border-cafeteria-200 px-3 py-1.5 text-xs font-semibold text-cafeteria-800 hover:bg-cream-50 min-h-[36px]"
            >
              Fechar
            </button>
          ) : null}
          {aviso.exige_confirmacao &&
            (aviso.confirmado ? (
              <span className="text-xs font-medium text-emerald-700">Li e confirmei ✓</span>
            ) : (
              <button
                type="button"
                onClick={() => onConfirmar(aviso.id)}
                disabled={confirmando === aviso.id}
                className="rounded-lg bg-dourado-base px-3 py-1.5 text-xs font-semibold text-cream-100 hover:bg-dourado-400 disabled:opacity-50 min-h-[36px]"
              >
                {confirmando === aviso.id ? 'Confirmando…' : 'Li e confirmei'}
              </button>
            ))}
          {!aviso.exige_confirmacao && onRecolher && !modoGaveta ? (
            <button
              type="button"
              onClick={onRecolher}
              className="rounded-lg border border-cafeteria-200 px-3 py-1.5 text-xs font-semibold text-cafeteria-800 hover:bg-cream-50 min-h-[36px]"
            >
              Recolher
            </button>
          ) : null}
        </div>
      </div>
      {pendente && modoGaveta ? (
        <p className="text-xs text-amber-800 mt-2">Confirme a leitura para concluir este comunicado.</p>
      ) : null}
    </>
  );
}

function LinhaRecolhida({
  aviso,
  pendente,
  onAbrir,
}: {
  aviso: Aviso;
  pendente: boolean;
  onAbrir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="w-full flex items-center gap-2 rounded-xl border border-cafeteria-100 bg-white/90 px-3 py-2.5 min-h-[44px] shadow-sm hover:border-dourado-base/60 hover:bg-cream-50/80 transition-colors text-left"
    >
      <span className="text-sm font-semibold text-cafeteria-900 shrink-0">Comunicado</span>
      <span className="text-sm text-cafeteria-600 truncate flex-1 min-w-0">{aviso.titulo}</span>
      <MegafoneAnimado ativo={pendente} className="w-11 h-9 shrink-0" />
    </button>
  );
}

/** Comunicados na home: no máximo 2; o mais recente aberto até ler; anteriores recolhidos (gaveta). */
export function AvisosHome() {
  const [loading, setLoading] = useState(true);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [recolhidosLocal, setRecolhidosLocal] = useState<Set<string>>(() => new Set());
  const [gavetaId, setGavetaId] = useState<string | null>(null);
  const visualizadosRef = useRef<Set<string>>(new Set());

  const registrarVisualizacao = useCallback((avisoId: string) => {
    if (visualizadosRef.current.has(avisoId)) return;
    visualizadosRef.current.add(avisoId);
    fetch('/api/portal/avisos/visualizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ aviso_id: avisoId }),
    }).catch(() => undefined);
  }, []);

  const carregar = useCallback(() => {
    fetch('/api/portal/avisos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; avisos?: Aviso[] }) => {
        if (d.ok && Array.isArray(d.avisos)) {
          setAvisos(d.avisos.slice(0, MAX_AVISOS_HOME));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRecolhidosLocal(lerRecolhidosLocal());
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    if (window.location.hash === '#comunicados-home') {
      document.getElementById('comunicados-home')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

  useEffect(() => {
    setRecolhidosLocal((prev) => {
      const ids = new Set(Array.from(prev).filter((id) => avisos.some((a) => a.id === id)));
      gravarRecolhidosLocal(ids);
      return ids;
    });
  }, [avisos]);

  useEffect(() => {
    if (!gavetaId) return;
    registrarVisualizacao(gavetaId);
  }, [gavetaId, registrarVisualizacao]);

  useEffect(() => {
    if (loading || avisos.length === 0) return;
    avisos.forEach((a, index) => {
      if (!estaRecolhido(a, index, recolhidosLocal)) {
        registrarVisualizacao(a.id);
      }
    });
  }, [avisos, loading, recolhidosLocal, registrarVisualizacao]);

  const marcarRecolhido = (id: string) => {
    setRecolhidosLocal((prev) => {
      const next = new Set(prev);
      next.add(id);
      gravarRecolhidosLocal(next);
      return next;
    });
  };

  const handleConfirmar = async (avisoId: string) => {
    setConfirmando(avisoId);
    try {
      const res = await fetch('/api/portal/avisos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ aviso_id: avisoId }),
      });
      const data = await res.json();
      if (data.ok) {
        setAvisos((prev) =>
          prev.map((a) => (a.id === avisoId ? { ...a, confirmado: true } : a))
        );
        setGavetaId((atual) => (atual === avisoId ? null : atual));
        emitPortalHomeAtualizado();
      }
    } finally {
      setConfirmando(null);
    }
  };

  const avisoGaveta = gavetaId ? avisos.find((a) => a.id === gavetaId) : null;
  const temPendente = avisos.some((a) => a.exige_confirmacao && !a.confirmado);

  if (loading) {
    return (
      <PortalBalaoCard tom="branco" ramoCanto="nenhum" className="p-5">
        <div className="flex justify-center py-2">
          <XicaraCarregando size="sm" label="Carregando comunicados…" />
        </div>
      </PortalBalaoCard>
    );
  }

  if (avisos.length === 0) return null;

  const algumAberto = avisos.some((a, i) => !estaRecolhido(a, i, recolhidosLocal));

  return (
    <>
      <div id="comunicados-home">
      <PortalBalaoCard tom="branco" ramoCanto="esquerda" className="p-4 sm:p-5 space-y-2">
        {algumAberto ? (
          <p className="text-xs text-cafeteria-600 px-1 pb-1">
            {temPendente ? 'Leia e confirme o comunicado da administração.' : 'Comunicados da sua unidade.'}
          </p>
        ) : null}

        <ul className="space-y-2">
          {avisos.map((a, index) => {
            const recolhido = estaRecolhido(a, index, recolhidosLocal);
            const pendente = Boolean(a.exige_confirmacao && !a.confirmado);

            if (recolhido) {
              return (
                <li key={a.id}>
                  <LinhaRecolhida
                    aviso={a}
                    pendente={pendente}
                    onAbrir={() => {
                      setGavetaId(a.id);
                      registrarVisualizacao(a.id);
                    }}
                  />
                </li>
              );
            }

            return (
              <li
                key={a.id}
                className="rounded-xl border border-dourado-200/80 bg-white/95 px-4 py-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-dourado-800">
                    Comunicado
                  </span>
                  <MegafoneAnimado ativo={pendente} className="w-11 h-9 shrink-0" />
                </div>
                <ConteudoComunicado
                  aviso={a}
                  confirmando={confirmando}
                  onConfirmar={handleConfirmar}
                  onRecolher={() => marcarRecolhido(a.id)}
                />
              </li>
            );
          })}
        </ul>

        <Link
          href="/portal/mural"
          className="inline-block px-1 pt-2 text-xs font-medium text-dourado-base hover:underline"
        >
          Ver todos no mural →
        </Link>
      </PortalBalaoCard>
      </div>

      {avisoGaveta ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-cafeteria-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gaveta-comunicado-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar gaveta"
            onClick={() => setGavetaId(null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-cafeteria-200 bg-white shadow-xl p-5 max-h-[min(85vh,520px)] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-cafeteria-900 shrink-0">Comunicado</span>
                <MegafoneAnimado
                  ativo={Boolean(avisoGaveta.exige_confirmacao && !avisoGaveta.confirmado)}
                  className="w-10 h-8 shrink-0"
                />
              </div>
              <button
                type="button"
                onClick={() => setGavetaId(null)}
                className="text-cafeteria-500 hover:text-cafeteria-800 text-sm font-medium shrink-0 min-h-[36px] px-2"
              >
                Fechar
              </button>
            </div>
            <div id="gaveta-comunicado-titulo">
              <ConteudoComunicado
                aviso={avisoGaveta}
                confirmando={confirmando}
                onConfirmar={handleConfirmar}
                onRecolher={() => setGavetaId(null)}
                modoGaveta
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
