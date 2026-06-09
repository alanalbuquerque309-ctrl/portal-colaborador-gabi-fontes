'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstadoAniversarioHoje } from '@/lib/aniversario-hoje';
import { AniversarioBalaoModal } from './AniversarioBalaoModal';
import { AniversarioFaixaHoje } from './AniversarioFaixaHoje';

type Props = {
  /** Carregar estado quando o portal estiver liberado (independente do termômetro). */
  ativo: boolean;
};

export function AniversarioBalaoPortal({ ativo }: Props) {
  const [estado, setEstado] = useState<EstadoAniversarioHoje | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [indicePendente, setIndicePendente] = useState(0);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/portal/aniversario-hoje', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json()) as EstadoAniversarioHoje & { ok?: boolean };
      if (data?.ok) {
        setEstado(data);
      } else {
        setEstado(null);
      }
    } catch {
      setEstado(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!ativo) return;
    recarregar();
  }, [ativo, recarregar]);

  const pendentes = useMemo(() => {
    if (!estado) return [];
    const ids = new Set(estado.pendentes_ids);
    return estado.aniversariantes.filter((a) => ids.has(a.id));
  }, [estado]);

  useEffect(() => {
    if (indicePendente >= pendentes.length) {
      setIndicePendente(0);
    }
  }, [pendentes.length, indicePendente]);

  const alvoColega = pendentes[indicePendente] ?? pendentes[0] ?? null;

  const aplicarEstadoResposta = (data: { estado?: EstadoAniversarioHoje }) => {
    if (data.estado) setEstado(data.estado);
    else recarregar();
  };

  const enviarParabens = async () => {
    if (!alvoColega) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/portal/aniversario-hoje/parabens', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para_colaborador_id: alvoColega.id }),
      });
      const data = await res.json();
      if (data.ok) {
        aplicarEstadoResposta(data);
        setIndicePendente((i) => i + 1);
      }
    } finally {
      setEnviando(false);
    }
  };

  const dispensar = async () => {
    setEnviando(true);
    try {
      const res = await fetch('/api/portal/aniversario-hoje/dispensar', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) aplicarEstadoResposta(data);
    } finally {
      setEnviando(false);
    }
  };

  if (!ativo || carregando || !estado?.pode_ver_feature) return null;
  if (estado.aniversariantes.length === 0) return null;

  const mostrarModal = estado.mostrar_balao;
  const mostrarFaixa = estado.mostrar_faixa && !mostrarModal;

  return (
    <>
      <AniversarioBalaoModal
        aberto={mostrarModal}
        souAniversariante={estado.sou_aniversariante && estado.pendentes_ids.length === 0}
        alvo={estado.sou_aniversariante && pendentes.length === 0 ? null : alvoColega}
        meusParabensCount={estado.meus_parabens_count}
        totalPendentes={pendentes.length}
        indiceAtual={Math.min(indicePendente, Math.max(0, pendentes.length - 1))}
        enviando={enviando}
        previewAtivo={estado.preview_ativo}
        redeAtiva={estado.rede_ativa}
        onParabens={enviarParabens}
        onDispensar={dispensar}
      />
      {mostrarFaixa && (
        <AniversarioFaixaHoje
          aniversariantes={estado.aniversariantes}
          parabenizouAlgum={estado.parabenizou_algum}
        />
      )}
    </>
  );
}
