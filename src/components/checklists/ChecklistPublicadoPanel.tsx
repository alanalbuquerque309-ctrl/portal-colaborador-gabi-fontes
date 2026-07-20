'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type HistoricoItem = {
  data_referencia: string;
  dia_semana_rotulo: string;
  publicado_em: string;
  publicado_por_nome?: string;
  ok: number;
  pendente: number;
  total: number;
  eh_hoje: boolean;
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
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [rascunhos, setRascunhos] = useState<RascunhoPayload[]>([]);
  const [diaHojeRotulo, setDiaHojeRotulo] = useState('');
  const [hojePublicado, setHojePublicado] = useState(false);
  const [unidadeNome, setUnidadeNome] = useState('');
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setHistorico([]);
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
        setHistorico([]);
        setRascunhos([]);
        return;
      }
      const hist: HistoricoItem[] = Array.isArray(data.historico) ? data.historico : [];
      setTemplate(data.template ?? null);
      setUnidadeNome(data.unidade?.nome ?? '');
      setHistorico(hist);
      setRascunhos(Array.isArray(data.rascunhos) ? data.rascunhos : []);
      setDiaHojeRotulo(String(data.dia_hoje_rotulo ?? ''));
      setHojePublicado(Boolean(data.hoje_publicado));
      const hoje = hist.find((h) => h.eh_hoje);
      setDiaSelecionado(hoje?.data_referencia ?? hist[0]?.data_referencia ?? null);
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [unidadeId, tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const selecionado = useMemo(
    () => historico.find((h) => h.data_referencia === diaSelecionado) ?? null,
    [historico, diaSelecionado]
  );

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
      {!hojePublicado && (
        <section className="rounded-2xl border border-dourado-base/40 bg-gradient-to-br from-amber-50/90 via-white to-cream-50 px-4 py-4 text-sm space-y-2 shadow-sm">
          <p className="font-semibold text-coffee-base">
            Checklist de hoje{diaHojeRotulo ? ` — ${diaHojeRotulo}` : ''} ainda não foi publicado
          </p>
          <p className="text-xs text-cafeteria-600 leading-relaxed">
            Cada dia abre em branco. Os últimos 7 dias ficam aqui só para conferência e não travam o dia seguinte.
          </p>
          <Link
            href={hrefEditar}
            className="inline-flex items-center justify-center rounded-xl bg-coffee-base px-4 py-2.5 text-sm font-semibold text-cream-50 hover:opacity-95 min-h-[44px]"
          >
            Preencher checklist de hoje →
          </Link>
        </section>
      )}

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

      {historico.length === 0 && !hojePublicado ? (
        <section className="rounded-2xl border border-dashed border-cafeteria-300 bg-cream-50/80 px-4 py-6 text-center text-sm text-cafeteria-600">
          <p className="font-semibold text-coffee-base">Nenhum checklist publicado ainda</p>
          <p className="mt-1">
            Quando o gerente clicar em <strong className="text-coffee-base">Publicar</strong>, o envio fica visível por
            até 7 dias.
          </p>
        </section>
      ) : null}

      {historico.length > 0 && (
        <section className="rounded-2xl border border-cafeteria-200 bg-white px-4 py-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-cafeteria-500">Últimos 7 dias</p>
          <ul className="flex flex-wrap gap-2">
            {historico.map((h) => {
              const ativo = h.data_referencia === diaSelecionado;
              return (
                <li key={h.data_referencia}>
                  <button
                    type="button"
                    onClick={() => setDiaSelecionado(h.data_referencia)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold min-h-[40px] ${
                      ativo
                        ? 'border-coffee-base bg-coffee-base text-cream-50'
                        : 'border-cafeteria-200 bg-cream-50 text-coffee-base hover:border-dourado-base'
                    }`}
                  >
                    {h.dia_semana_rotulo}
                    {h.eh_hoje ? ' · hoje' : ''}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-cafeteria-500 leading-relaxed">
            No 8º dia o mais antigo some sozinho. Publicar ontem não bloqueia o checklist de hoje.
          </p>
        </section>
      )}

      {selecionado && template && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cafeteria-500">
              {selecionado.eh_hoje ? 'Publicado hoje' : 'Conferência'}
            </h2>
            <Link href={hrefEditar} className="text-xs font-semibold text-dourado-base hover:underline">
              {hojePublicado ? 'Editar / republicar hoje →' : 'Preencher hoje →'}
            </Link>
          </div>

          {!selecionado.eh_hoje && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Dia anterior (só leitura). O formulário de hoje continua livre.
            </p>
          )}

          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-cream-50 p-4 md:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap gap-2">
              <ChecklistChip destaque>
                <span aria-hidden>📍</span> {unidadeNome}
              </ChecklistChip>
              <ChecklistChip>
                <span aria-hidden>📅</span> {selecionado.dia_semana_rotulo}
              </ChecklistChip>
              {selecionado.publicado_por_nome && (
                <ChecklistChip>
                  <span aria-hidden>✓</span> {selecionado.publicado_por_nome}
                </ChecklistChip>
              )}
            </div>
            <ChecklistProgressBar
              concluidos={selecionado.ok + selecionado.pendente}
              total={selecionado.total}
              label="Itens publicados"
            />
            <p className="text-xs text-cafeteria-600">
              Publicado em {new Date(selecionado.publicado_em).toLocaleString('pt-BR')}
              {selecionado.pendente > 0 && (
                <>
                  {' '}
                  · <span className="text-amber-800 font-semibold">{selecionado.pendente} pendência(s)</span>
                </>
              )}
            </p>
          </div>

          {template.secoes.map((secao) => {
            const status = selecionado.respostas.status_itens ?? {};
            const just = selecionado.respostas.justificativas_itens ?? {};
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
