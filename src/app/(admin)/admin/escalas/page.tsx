'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Colaborador {
  id: string;
  nome: string;
  unidade_nome?: string;
}

interface Escala {
  id: string;
  data: string;
  hora_entrada: string;
  hora_saida: string;
  colaborador_nome: string;
}

export default function EscalasPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [form, setForm] = useState({
    colaborador_id: '',
    data: '',
    hora_entrada: '08:00',
    hora_saida: '14:00',
    observacao: '',
  });
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtroColaborador, setFiltroColaborador] = useState('');

  const hoje = new Date().toISOString().slice(0, 10);
  const daquiUmaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('colaboradores')
      .select('id, nome, unidades(nome)')
      .order('nome')
      .then((res) => {
        if (res.data) {
          setColaboradores(
            res.data.map((c: Record<string, unknown>) => ({
              id: String(c.id ?? ''),
              nome: String(c.nome ?? ''),
              unidade_nome: (c.unidades as { nome?: string } | null)?.nome ?? undefined,
            }))
          );
        }
      });
  }, []);

  const carregarEscalas = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('data_inicio', hoje);
    params.set('data_fim', daquiUmaSemana);
    if (filtroColaborador) params.set('colaborador_id', filtroColaborador);
    fetch(`/api/admin/escalas?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.escalas) setEscalas(data.escalas);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarEscalas();
  }, [filtroColaborador]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.colaborador_id || !form.data || !form.hora_entrada || !form.hora_saida) {
      setErro('Preencha colaborador, data, entrada e saída.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/escalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          colaborador_id: form.colaborador_id,
          data: form.data,
          hora_entrada: form.hora_entrada,
          hora_saida: form.hora_saida,
          observacao: form.observacao.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setForm((f) => ({ ...f, data: '', observacao: '' }));
        carregarEscalas();
      } else {
        setErro(data.erro || 'Erro ao cadastrar escala.');
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Escalas
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-medium text-coffee-base mb-4">Cadastrar turno</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end max-w-2xl">
          <div className="min-w-[200px]">
            <label htmlFor="colaborador" className="block text-xs font-medium text-coffee-100 mb-1">
              Colaborador *
            </label>
            <select
              id="colaborador"
              required
              value={form.colaborador_id}
              onChange={(e) => setForm((f) => ({ ...f, colaborador_id: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.unidade_nome ? `(${c.unidade_nome})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="data" className="block text-xs font-medium text-coffee-100 mb-1">
              Data *
            </label>
            <input
              id="data"
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="hora_entrada" className="block text-xs font-medium text-coffee-100 mb-1">
              Entrada *
            </label>
            <input
              id="hora_entrada"
              type="time"
              required
              value={form.hora_entrada}
              onChange={(e) => setForm((f) => ({ ...f, hora_entrada: e.target.value }))}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="hora_saida" className="block text-xs font-medium text-coffee-100 mb-1">
              Saída *
            </label>
            <input
              id="hora_saida"
              type="time"
              required
              value={form.hora_saida}
              onChange={(e) => setForm((f) => ({ ...f, hora_saida: e.target.value }))}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[120px]">
            <label htmlFor="observacao" className="block text-xs font-medium text-coffee-100 mb-1">
              Observação
            </label>
            <input
              id="observacao"
              type="text"
              placeholder="Ex: Caixa"
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {enviando ? 'Salvando…' : 'Adicionar'}
          </button>
        </form>
        {erro && <p className="text-red-600 text-sm mt-2">{erro}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-coffee-base">Próximos 7 dias</h2>
          <select
            value={filtroColaborador}
            onChange={(e) => setFiltroColaborador(e.target.value)}
            className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os colaboradores</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <XicaraCarregando size="md" label="Carregando…" />
          </div>
        ) : escalas.length === 0 ? (
          <div className="rounded-xl border border-cream-300 bg-cream-50 p-6">
            <p className="text-coffee-base">Nenhuma escala nos próximos 7 dias.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-cream-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-base font-medium">Colaborador</th>
                  <th className="text-left px-4 py-3 text-coffee-base font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-coffee-base font-medium">Entrada</th>
                  <th className="text-left px-4 py-3 text-coffee-base font-medium">Saída</th>
                </tr>
              </thead>
              <tbody>
                {escalas.map((e) => (
                  <tr key={e.id} className="border-t border-cream-300">
                    <td className="px-4 py-3 text-coffee-base">{e.colaborador_nome}</td>
                    <td className="px-4 py-3 text-coffee-100">
                      {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-coffee-100">{e.hora_entrada}</td>
                    <td className="px-4 py-3 text-coffee-100">{e.hora_saida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
