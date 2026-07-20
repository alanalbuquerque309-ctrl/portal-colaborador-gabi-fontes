'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortalPerfil } from '@/contexts/PortalPerfilContext';
import { normalizePortalRole } from '@/lib/roles';

type EventoManual = {
  id: string;
  colaborador_nome: string;
  colaborador_telefone: string | null;
  tipo_label: string;
  manual_path: string | null;
  created_at: string;
};

const POLL_MS = 60000;
const ACK_IDS_KEY = 'manual_eventos_ack_v1';
const BASELINE_KEY = 'manual_eventos_baseline_v1';

function carregarAckIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACK_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function salvarAckIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACK_IDS_KEY, JSON.stringify(ids.slice(-400)));
}

function garantirBaseline(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  const atual = window.localStorage.getItem(BASELINE_KEY);
  if (atual) return atual;
  const agora = new Date().toISOString();
  window.localStorage.setItem(BASELINE_KEY, agora);
  return agora;
}

function formatarData(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR', { hour12: false });
}

export function ManualEventosToast() {
  const { role, carregado } = usePortalPerfil();
  const podeNotificar =
    carregado && (normalizePortalRole(role) === 'socio' || normalizePortalRole(role) === 'admin');
  const [eventos, setEventos] = useState<EventoManual[]>([]);

  const carregarEventos = useCallback(async () => {
    if (!podeNotificar) return;
    try {
      const res = await fetch('/api/admin/manual-eventos?limit=40', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.eventos)) return;

      const baselineIso = garantirBaseline();
      const baselineMs = new Date(baselineIso).getTime();
      const ackIds = new Set(carregarAckIds());

      const novos = (data.eventos as EventoManual[])
        .filter((e) => !ackIds.has(e.id))
        .filter((e) => {
          const ms = new Date(e.created_at).getTime();
          return Number.isFinite(ms) && ms > baselineMs;
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setEventos(novos);
    } catch {
      // Falha silenciosa para não poluir a UI.
    }
  }, [podeNotificar]);

  useEffect(() => {
    if (!podeNotificar) return;
    void carregarEventos();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregarEventos();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [podeNotificar, carregarEventos]);

  const atual = useMemo(() => (eventos.length > 0 ? eventos[0] : null), [eventos]);

  const handleOk = useCallback(() => {
    if (!atual) return;
    const ackIds = carregarAckIds();
    if (!ackIds.includes(atual.id)) ackIds.push(atual.id);
    salvarAckIds(ackIds);
    setEventos((prev) => prev.filter((e) => e.id !== atual.id));
  }, [atual]);

  if (!podeNotificar || !atual) return null;

  return (
    <div className="fixed left-4 right-4 bottom-24 z-[75] md:left-6 md:right-auto md:bottom-6 md:w-[420px]">
      <div className="rounded-xl border border-amber-300 bg-white shadow-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Alerta de captura/impressão
        </p>
        <p className="text-sm text-coffee-base mt-2">
          <strong>{atual.colaborador_nome}</strong>
          {atual.colaborador_telefone ? ` (${atual.colaborador_telefone})` : ''} acionou{' '}
          <strong>{atual.tipo_label}</strong>.
        </p>
        {atual.manual_path && (
          <p className="text-xs text-coffee-100 mt-1">Origem: {atual.manual_path}</p>
        )}
        <p className="text-xs text-coffee-100 mt-1">Quando: {formatarData(atual.created_at)}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleOk}
            className="rounded-lg bg-dourado-base px-3 py-2 text-xs font-medium text-cream-100 hover:bg-dourado-400"
          >
            OK
          </button>
          <Link
            href="/admin/manual-eventos"
            className="rounded-lg border border-cream-300 px-3 py-2 text-xs font-medium text-coffee-base hover:bg-cream-50"
          >
            Ver detalhes
          </Link>
          {eventos.length > 1 && (
            <span className="ml-auto text-xs text-coffee-100">+{eventos.length - 1} alerta(s)</span>
          )}
        </div>
      </div>
    </div>
  );
}

