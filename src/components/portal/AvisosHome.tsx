'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalBalaoCard } from '@/components/portal/vivo/PortalBalaoCard';
import { MegafoneAnimado } from '@/components/portal/vivo/MegafoneAnimado';

type Aviso = {
  id: string;
  titulo: string;
  conteudo: string | null;
  data_publicacao: string;
  exige_confirmacao?: boolean;
  confirmado?: boolean;
};

/** Comunicados da administração — megafone anima quando há aviso pendente. */
export function AvisosHome() {
  const [loading, setLoading] = useState(true);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const carregar = () => {
    fetch('/api/portal/avisos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; avisos?: Aviso[] }) => {
        if (d.ok && Array.isArray(d.avisos)) {
          setAvisos(d.avisos.slice(0, 2));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const temPendente = avisos.some((a) => a.exige_confirmacao && !a.confirmado);
  const temAviso = avisos.length > 0;

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
      }
    } finally {
      setConfirmando(null);
    }
  };

  if (loading) {
    return (
      <PortalBalaoCard tom="branco" ramoCanto="nenhum" className="p-5">
        <div className="flex justify-center py-2">
          <XicaraCarregando size="sm" label="Carregando comunicados…" />
        </div>
      </PortalBalaoCard>
    );
  }

  if (!temAviso) return null;

  return (
    <PortalBalaoCard tom="branco" ramoCanto="esquerda" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-semibold text-cafeteria-900">Comunicado</h2>
          <p className="text-sm text-cafeteria-600 mt-0.5">
            {temPendente ? 'Leia e confirme o aviso da administração.' : 'Avisos da sua unidade.'}
          </p>
        </div>
        <MegafoneAnimado ativo={temPendente || temAviso} className="w-[4.5rem] h-[3.5rem] sm:w-20 sm:h-16" />
      </div>

      <ul className="space-y-3">
        {avisos.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-cafeteria-100 bg-white/90 px-4 py-3.5 shadow-sm"
          >
            <h3 className="font-semibold text-cafeteria-900 leading-snug">{a.titulo}</h3>
            {a.conteudo ? (
              <p className="text-sm text-cafeteria-700 mt-1.5 leading-relaxed whitespace-pre-wrap line-clamp-4">
                {a.conteudo}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-cream-200">
              <span className="text-xs text-cafeteria-500">
                {new Date(a.data_publicacao).toLocaleDateString('pt-BR')}
              </span>
              {a.exige_confirmacao &&
                (a.confirmado ? (
                  <span className="text-xs font-medium text-emerald-700">Li e confirmei ✓</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConfirmar(a.id)}
                    disabled={confirmando === a.id}
                    className="rounded-lg bg-dourado-base px-3 py-1.5 text-xs font-semibold text-cream-100 hover:bg-dourado-400 disabled:opacity-50 min-h-[36px]"
                  >
                    {confirmando === a.id ? 'Confirmando…' : 'Li e confirmei'}
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/portal/mural"
        className="inline-block mt-4 text-sm font-medium text-dourado-base hover:underline"
      >
        Ver todos no mural →
      </Link>
    </PortalBalaoCard>
  );
}
