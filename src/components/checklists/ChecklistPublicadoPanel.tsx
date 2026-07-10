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

type RascunhoPayload = {
  turno: string;
  turno_rotulo: string;
  colaborador_nome: string | null;
  updated_at: string;
  ok: number;
  pendente: number;
  respondidos: number;
  total: number;
};

export function ChecklistPublicadoPanel({ unidadeId, tipo = 'gerencia_diaria_mesquita' }: Props) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplatePayload | null>(null);
  const [publicado, setPublicado] = useState<PublicadoPayload | null>(null);
  const [rascunhos, setRascunhos] = useState<RascunhoPayload[]>([]);
  const [diaHojeRotulo, setDiaHojeRotulo] = useState('');
  const [unidadeNome, setUnidadeNome] = useState('');

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setPublicado(null);
      setRascunhos([]);
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
        setRascunhos([]);
        return;
      }
      setTemplate(data.template ?? null);
      setUnidadeNome(data.unidade?.nome ?? '');
      setPublicado(data.publicado ?? null);
      setRascunhos(Array.isArray(data.rascunhos) ? data.rascunhos : []);
      setDiaHojeRotulo(String(data.dia_hoje_rotulo ?? ''));
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

  const hrefEditar = `/portal/checklists/${tipo}?unidade_id=${encodeURIComponent(unidadeId)}`;

  return (
    <div className="space-y-3">
      {rascunhos.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 space-y-2">
          <p className="font-semibold text-coffee-base">
            Rascunho em andamento{diaHojeRotulo ? ` (${diaHojeRotulo})` : ''}
          </p>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            Já há preenchimento salvo, mas ainda não foi publicado. A liderança só vê o checklist completo depois de{' '}
            <strong>Publicar</strong>.
          </p>
          <ul className="space-y-1.5 text-xs">
            {rascunhos.map((r) => (
              <li key={r.turno} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">{r.turno_rotulo}</span>
                <span>
                  {r.respondidos}/{r.total} itens
                  {r.pendente > 0 ? ` · ${r.pendente} pend.` : ''}
                </span>
                {r.colaborador_nome && <span className="text-amber-800/80">· {r.colaborador_nome}</span>}
                <Link
                  href={`${hrefEditar}&turno=${r.turno}`}
                  className="font-semibold text-dourado-base hover:underline"
                >
                  Abrir →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!publicado || !template ? (
        <section className="rounded-2xl border border-dashed border-cafeteria-300 bg-cream-50/80 px-4 py-6 text-center text-sm text-cafeteria-600">
          <p className="font-semibold text-coffee-base">Nenhum checklist publicado ainda</p>
          <p className="mt-1">
            Quando o gerente clicar em <strong className="text-coffee-base">Publicar</strong>, o último envio aparece
            aqui para toda a liderança.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cafeteria-500">Checklist publicado</h2>
            <Link href={hrefEditar} className="text-xs font-semibold text-dourado-base hover:underline">
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
              {publicado.publicado_por_nome && (
                <ChecklistChip>
                  <span aria-hidden>✓</span> {publicado.publicado_por_nome}
                </ChecklistChip>
              )}
            </div>
            <ChecklistProgressBar
              concluidos={publicado.ok + publicado.pendente}
              total={publicado.total}
              label="Itens publicados"
            />
            <p className="text-xs text-cafeteria-600">
              Publicado em {new Date(publicado.publicado_em).toLocaleString('pt-BR')}
              {publicado.pendente > 0 && (
                <>
                  {' '}
                  · <span className="text-amber-800 font-semibold">{publicado.pendente} pendência(s)</span>
                </>
              )}
            </p>
          </div>

          {template.secoes.map((secao) => {
            const status = publicado.respostas.status_itens ?? {};
            const just = publicado.respostas.justificativas_itens ?? {};
            const ids = secao.itens.map((i) => i.id);
            const respondidos = ids.filter((id) => status[id] === 'ok' || status[id] === 'pendente').length;
            return (
              <ChecklistSectionCard key={secao.id} titulo={secao.titulo} concluidos={respondidos} total={ids.length}>
                {secao.itens.map((item) => (
                  <ChecklistItemStatusLeitura
                    key={item.id}
                    label={item.horario ? `${item.horario} — ${item.label}` : item.label}
                    status={status[item.id] ?? null}
                    justificativa={just[item.id] ?? ''}
                  />
                ))}
              </ChecklistSectionCard>
            );
          })}
        </section>
      )}
    </div>
  );
}
