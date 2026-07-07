'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { ChecklistTurno } from '@/lib/checklists/types';

type SetorResumo = {
  setor: string;
  label: string;
  emoji: string;
  tipo_checklist: string;
  descricao: string;
  preenchido: boolean;
  turnos_preenchidos: string[];
  status_efetivo: 'conferido' | 'pendente' | 'nao_preenchido';
};

type Props = {
  unidadeId: string;
  unidadeSlug: string;
  turno: ChecklistTurno;
};

function rotuloStatus(status: SetorResumo['status_efetivo']) {
  if (status === 'conferido') return { texto: 'Conferido', classe: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (status === 'pendente') return { texto: 'Aguardando OK', classe: 'bg-amber-50 text-amber-900 border-amber-200' };
  return { texto: 'Não preenchido', classe: 'bg-cream-100 text-cafeteria-600 border-cafeteria-200' };
}

function rotuloTurno(t: string) {
  if (t === 'manha') return 'manhã';
  if (t === 'tarde') return 'tarde';
  return t;
}

export function ChecklistVistoriaPanel({ unidadeId, unidadeSlug, turno }: Props) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [setores, setSetores] = useState<SetorResumo[]>([]);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!unidadeId || unidadeSlug !== 'mesquita') {
      setSetores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/portal/checklists/vistoria?unidade_id=${encodeURIComponent(unidadeId)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Não foi possível carregar vistoria.');
        return;
      }
      setSetores(data.setores ?? []);
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [unidadeId, unidadeSlug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const conferir = async (setor: string, status: 'conferido' | 'pendente') => {
    setSalvando(setor);
    setMsg(null);
    try {
      const res = await fetch('/api/portal/checklists/vistoria', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unidade_id: unidadeId, setor, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Falha ao salvar vistoria.');
        return;
      }
      setMsg(data.mensagem ?? 'Salvo.');
      await carregar();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(null);
    }
  };

  if (unidadeSlug !== 'mesquita') return null;

  return (
    <section className="rounded-2xl border border-coffee-base/15 bg-white p-4 md:p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-bold text-coffee-base">Vistoria dos setores</h2>
        <p className="text-sm text-cafeteria-600 mt-1">
          Ao passar por Estoque, ASG, Cozinha, Balcão ou Caixa, confira se o checklist do dia foi preenchido e marque OK.
        </p>
      </div>

      {msg && (
        <p className="text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      {erro && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <XicaraCarregando size="sm" label="Carregando setores…" />
        </div>
      ) : (
        <ul className="space-y-3">
          {setores.map((s) => {
            const st = rotuloStatus(s.status_efetivo);
            const linkForm = `/portal/checklists/${s.tipo_checklist}?unidade_id=${encodeURIComponent(unidadeId)}&turno=${turno}`;
            return (
              <li
                key={s.setor}
                className="rounded-xl border border-cafeteria-200 bg-cream-50/50 p-3 md:p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-coffee-base">
                      <span aria-hidden className="mr-1.5">{s.emoji}</span>
                      {s.label}
                    </p>
                    <p className="text-xs text-cafeteria-500 mt-0.5">{s.descricao}</p>
                    {s.preenchido && s.turnos_preenchidos.length > 0 && (
                      <p className="text-xs text-cafeteria-600 mt-1">
                        Preenchido: {s.turnos_preenchidos.map(rotuloTurno).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${st.classe}`}>
                    {st.texto}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={linkForm}
                    className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-xl border border-cafeteria-200 bg-white text-sm font-semibold text-coffee-base hover:bg-cream-50"
                  >
                    Ver formulário
                  </Link>
                  <button
                    type="button"
                    disabled={salvando === s.setor || !s.preenchido}
                    onClick={() => void conferir(s.setor, 'conferido')}
                    className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-xl bg-dourado-base text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {salvando === s.setor ? 'Salvando…' : 'Conferir OK'}
                  </button>
                  {s.status_efetivo === 'conferido' && (
                    <button
                      type="button"
                      disabled={salvando === s.setor}
                      onClick={() => void conferir(s.setor, 'pendente')}
                      className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-xl border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
                    >
                      Desfazer OK
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
