'use client';

import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import { ChecklistPreviewBanner, ChecklistProgressBar } from '@/components/checklists/ChecklistUi';

type Unidade = { id: string; nome: string; slug: string };

type Linha = {
  id: string;
  tipo: string;
  tipo_titulo: string;
  turno: string;
  turno_rotulo: string;
  dia_semana: number;
  dia_semana_rotulo: string;
  unidade_nome?: string;
  colaborador_nome?: string;
  preenchido_em: string;
  observacoes: string | null;
  respostas: { itens?: Record<string, boolean> };
};

function statsItens(linha: Linha) {
  const itens = linha.respostas?.itens ?? {};
  const vals = Object.values(itens);
  const ok = vals.filter(Boolean).length;
  return { ok, total: vals.length };
}

export function AdminChecklistsClient() {
  const [loading, setLoading] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState('');
  const [registros, setRegistros] = useState<Linha[]>([]);

  const consultar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const qs = new URLSearchParams();
      if (unidadeId) qs.set('unidade_id', unidadeId);
      const res = await fetch(`/api/admin/checklists?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Falha na consulta.');
        setRegistros([]);
        return;
      }
      setPreview(data.preview_socios === true);
      setUnidades(data.unidades ?? []);
      setRegistros(data.registros ?? []);
      setCarregado(true);
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    void consultar();
  }, []);

  return (
    <div className="space-y-6">
      {preview && <ChecklistPreviewBanner />}

      <div className="rounded-2xl border border-cafeteria-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-sm flex-1 min-w-[200px]">
            <span className="font-semibold text-coffee-base block mb-2">Filtrar loja</span>
            <select
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              className="w-full rounded-xl border border-cafeteria-200 bg-cream-50/60 px-3 py-2.5 min-h-[48px] text-coffee-base focus:outline-none focus:ring-2 focus:ring-dourado-base/30"
            >
              <option value="">Todas as lojas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void consultar()}
            className="rounded-xl bg-gradient-to-r from-coffee-base to-coffee-base/90 text-cream-50 px-6 py-3 min-h-[48px] font-semibold shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
          >
            {loading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
        <p className="mt-3 text-xs text-cafeteria-500 leading-relaxed">
          Consulta sob demanda, sem atualização automática. Um slot por dia da semana + tipo + turno + loja.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{erro}</div>
      )}

      {loading && !carregado ? (
        <div className="flex justify-center py-12">
          <XicaraCarregando size="sm" label="Consultando…" />
        </div>
      ) : registros.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cafeteria-300 bg-cream-50/80 px-6 py-10 text-center">
          <p className="text-3xl mb-2" aria-hidden>
            📋
          </p>
          <p className="font-semibold text-coffee-base">Nenhum registro ainda</p>
          <p className="text-sm text-cafeteria-600 mt-1 max-w-md mx-auto">
            Quando os sócios preencherem checklists no portal, eles aparecem aqui.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-cafeteria-600">
            {registros.length} registro{registros.length === 1 ? '' : 's'} encontrado{registros.length === 1 ? '' : 's'}
          </p>

          <div className="md:hidden space-y-3">
            {registros.map((r) => {
              const { ok, total } = statsItens(r);
              return (
                <article
                  key={r.id}
                  className="rounded-2xl border border-cafeteria-200 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-coffee-base">{r.tipo_titulo}</p>
                      <p className="text-sm text-cafeteria-600 mt-0.5">{r.unidade_nome ?? '—'}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wide rounded-full bg-cream-100 text-cafeteria-700 px-2 py-1">
                      {r.turno_rotulo}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-dourado-50 text-coffee-base px-2.5 py-1 font-medium">
                      {r.dia_semana_rotulo}
                    </span>
                    <span className="rounded-full bg-cafeteria-100 text-cafeteria-700 px-2.5 py-1">
                      {r.colaborador_nome ?? '—'}
                    </span>
                  </div>
                  {total > 0 && <ChecklistProgressBar concluidos={ok} total={total} label="Itens OK" />}
                  <p className="text-xs text-cafeteria-500">
                    {new Date(r.preenchido_em).toLocaleString('pt-BR')}
                  </p>
                </article>
              );
            })}
          </div>

          <AdminSection title="Registros" description="Visão em tabela para desktop" className="hidden md:block">
            <div className="overflow-x-auto rounded-xl border border-cafeteria-100 -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cafeteria-100 bg-cream-50/80 text-left">
                    <th className="px-4 py-3 font-semibold text-coffee-base">Loja</th>
                    <th className="px-4 py-3 font-semibold text-coffee-base">Checklist</th>
                    <th className="px-4 py-3 font-semibold text-coffee-base">Dia</th>
                    <th className="px-4 py-3 font-semibold text-coffee-base">Turno</th>
                    <th className="px-4 py-3 font-semibold text-coffee-base min-w-[140px]">Conferência</th>
                    <th className="px-4 py-3 font-semibold text-coffee-base">Responsável</th>
                    <th className="px-4 py-3 font-semibold text-coffee-base">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => {
                    const { ok, total } = statsItens(r);
                    return (
                      <tr key={r.id} className="border-b border-cafeteria-50 last:border-0 hover:bg-cream-50/50">
                        <td className="px-4 py-3 font-medium text-coffee-base">{r.unidade_nome ?? '—'}</td>
                        <td className="px-4 py-3">{r.tipo_titulo}</td>
                        <td className="px-4 py-3">{r.dia_semana_rotulo}</td>
                        <td className="px-4 py-3">{r.turno_rotulo}</td>
                        <td className="px-4 py-3">
                          {total > 0 ? (
                            <div className="min-w-[120px]">
                              <ChecklistProgressBar concluidos={ok} total={total} compacto />
                              <span className="text-xs text-cafeteria-500 tabular-nums mt-1 block">
                                {ok}/{total}
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-cafeteria-700">{r.colaborador_nome ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-cafeteria-600 text-xs">
                          {new Date(r.preenchido_em).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminSection>
        </>
      )}
    </div>
  );
}
