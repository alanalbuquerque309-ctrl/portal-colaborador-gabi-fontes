'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Colaborador {
  id: string;
  nome: string;
  unidade_nome?: string;
}

export default function DestaquePage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [destaqueAtual, setDestaqueAtual] = useState<{
    colaborador_id: string;
    colaborador_nome: string;
    titulo: string;
    descricao: string;
  } | null>(null);
  const [form, setForm] = useState({ colaborador_id: '', titulo: '', descricao: '' });
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('colaboradores')
        .select('id, nome, unidades(nome)')
        .order('nome'),
      fetch('/api/admin/destaque', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([colRes, destRes]) => {
        if (colRes.data) {
          setColaboradores(
            colRes.data.map((c: Record<string, unknown>): Colaborador => ({
              id: String(c.id ?? ''),
              nome: String(c.nome ?? ''),
              unidade_nome: (c.unidades as { nome?: string } | null)?.nome ?? undefined,
            }))
          );
        }
        if (destRes.ok && destRes.destaque) {
          setDestaqueAtual(destRes.destaque);
          setForm({
            colaborador_id: destRes.destaque.colaborador_id ?? '',
            titulo: destRes.destaque.titulo ?? '',
            descricao: destRes.destaque.descricao ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.colaborador_id || !form.titulo.trim()) {
      setErro('Selecione um colaborador e informe o título.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/destaque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          colaborador_id: form.colaborador_id,
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDestaqueAtual({
          colaborador_id: form.colaborador_id,
          colaborador_nome: colaboradores.find((c) => c.id === form.colaborador_id)?.nome ?? '',
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim(),
        });
      } else {
        setErro(data.erro || 'Erro ao definir destaque.');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando…" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Colaborador em Destaque
      </h1>

      {destaqueAtual && (
        <div className="mb-6 rounded-xl border border-dourado-200 bg-dourado-50/50 p-4">
          <p className="text-sm font-medium text-coffee-100 mb-1">Destaque atual no portal</p>
          <p className="font-display font-semibold text-coffee-base">{destaqueAtual.titulo}</p>
          <p className="text-sm text-coffee-100">
            {destaqueAtual.colaborador_nome}
            {destaqueAtual.descricao && ` — ${destaqueAtual.descricao}`}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label htmlFor="colaborador" className="block text-sm font-medium text-coffee-base mb-1">
            Colaborador em destaque *
          </label>
          <select
            id="colaborador"
            required
            value={form.colaborador_id}
            onChange={(e) => setForm((f) => ({ ...f, colaborador_id: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
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
          <label htmlFor="titulo" className="block text-sm font-medium text-coffee-base mb-1">
            Título * (ex: Destaque do Mês)
          </label>
          <input
            id="titulo"
            type="text"
            required
            placeholder="Ex: Destaque do Mês de Março"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-coffee-base mb-1">
            Descrição (opcional)
          </label>
          <textarea
            id="descricao"
            rows={3}
            placeholder="Ex: Pelo excelente atendimento e comprometimento."
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
        >
          {enviando ? 'Salvando…' : 'Definir como Destaque'}
        </button>
      </form>

      <p className="mt-4 text-xs text-coffee-100">
        O colaborador em destaque aparece na página inicial do portal. O novo destaque substitui o
        anterior.
      </p>
    </div>
  );
}
