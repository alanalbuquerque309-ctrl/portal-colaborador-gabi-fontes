'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { ChecklistItemStatus, ChecklistSecao } from '@/lib/checklists/types';
import {
  ChecklistChip,
  ChecklistItemStatusLeitura,
  ChecklistProgressBar,
  ChecklistSectionCard,
} from '@/components/checklists/ChecklistUi';

type Props = {
  unidadeId: string;
  tipo?: string;
};

type PublicadoPayload = {
  dia_semana_rotulo: string;
  publicado_em: string;
  publicado_por_nome?: string;
  ok: number;
  pendente: number;
  total: number;
  respostas: {
    status_itens: Record<string, ChecklistItemStatus>;
    justificativas_itens?: Record<string, string>;
  };
};

type TemplatePayload = {
  titulo: string;
  secoes: ChecklistSecao[];
};

export function ChecklistPublicadoPanel({ unidadeId, tipo = 'gerencia_diaria_mesquita' }: Props) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplatePayload | null>(null);
  const [publicado, setPublicado] = useState<PublicadoPayload | null>(null);
  const [unidadeNome, setUnidadeNome] = useState('');

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setPublicado(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/portal/checklists/publicado?unidade_id=${encodeURIComponent(unidadeId)}&tipo=${encodeURIComponent(tipo)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Não foi possível carregar.');
        setPublicado(null);
        return;
      }
      setTemplate(data.template ?? null);
      setUnidadeNome(data.unidade?.nome ?? '');
      setPublicado(data.publicado ?? null);
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [unidadeId, tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!unidadeId) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <XicaraCarregando size="sm" label="Carregando publicado…" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{erro}</div>
    );
  }

  if (!publicado || !template) {
    return (
      <section className="rounded-2xl border border-dashed border-cafeteria-300 bg-cream-50/80 px-4 py-6 text-center text-sm text-cafeteria-600">
        <p className="font-semibold text-coffee-base">Nenhum checklist publicado ainda</p>
        <p className="mt-1">Quando o gerente publicar, o último envio aparece aqui para toda a liderança.</p>
      </section>
    );
  }

  const status = publicado.respostas.status_itens ?? {};
  const just = publicado.respostas.justificativas_itens ?? {};

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-cafeteria-500">Checklist publicado</h2>
        <Link
          href={`/portal/checklists/${tipo}?unidade_id=${encodeURIComponent(unidadeId)}`}
          className="text-xs font-semibold text-dourado-base hover:underline"
        >
          Editar / novo plantão →
        </Link>
      </div>

      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-cream-50 p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          <ChecklistChip destaque>
            <span aria-hidden>📍</span> {unidadeNome}
          </ChecklistChip>
          <ChecklistChip>
            <span aria-hidden>📅</span> {publicado.dia_semana_rotulo}
          </ChecklistChip>
        </div>
        <p className="text-sm font-semibold text-coffee-base">{template.titulo}</p>
        <ChecklistProgressBar
          concluidos={publicado.ok + publicado.pendente}
          total={publicado.total}
          label="Itens respondidos"
        />
        <p className="text-xs text-cafeteria-600">
          <span className="text-emerald-700 font-semibold">{publicado.ok} OK</span>
          {publicado.pendente > 0 && (
            <>
              {' '}
              · <span className="text-amber-800 font-semibold">{publicado.pendente} pendente(s)</span>
            </>
          )}
          {' '}
          · Publicado {new Date(publicado.publicado_em).toLocaleString('pt-BR')}
          {publicado.publicado_por_nome ? ` por ${publicado.publicado_por_nome}` : ''}
        </p>
      </div>

      {template.secoes.map((secao) => {
        const ids = secao.itens.map((i) => i.id);
        const respondidos = ids.filter((id) => status[id] === 'ok' || status[id] === 'pendente').length;
        return (
          <ChecklistSectionCard key={secao.id} titulo={secao.titulo} concluidos={respondidos} total={ids.length}>
            {secao.itens.map((item) => (
              <ChecklistItemStatusLeitura
                key={item.id}
                label={item.horario ? `${item.horario} — ${item.label}` : item.label}
                status={status[item.id] ?? null}
                justificativa={just[item.id]}
              />
            ))}
          </ChecklistSectionCard>
        );
      })}
    </section>
  );
}
