'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AvisosPublicoSelector } from '@/components/admin/AvisosPublicoSelector';
import type { PublicoAvisoKey } from '@/lib/avisos-publico';

export default function NovoAvisoPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    publico_alvo: 'todos' as PublicoAvisoKey,
    exige_confirmacao: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.titulo.trim()) {
      setErro('O título é obrigatório.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          conteudo: form.conteudo.trim() || undefined,
          publico_alvo: form.publico_alvo,
          exige_confirmacao: form.exige_confirmacao,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/admin/avisos');
      } else {
        setErro(data.erro || 'Erro ao criar aviso.');
      }
    } catch {
      setErro('Erro ao criar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Novo aviso
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label htmlFor="titulo" className="block text-sm font-medium text-coffee-base mb-1">
            Título *
          </label>
          <input
            id="titulo"
            name="titulo"
            type="text"
            required
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
            placeholder="Ex: Horário de funcionamento no feriado"
          />
        </div>
        <div>
          <label htmlFor="conteudo" className="block text-sm font-medium text-coffee-base mb-1">
            Conteúdo
          </label>
          <textarea
            id="conteudo"
            name="conteudo"
            rows={5}
            value={form.conteudo}
            onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
            placeholder="Texto do aviso..."
          />
        </div>
        <AvisosPublicoSelector
          value={form.publico_alvo}
          onChange={(publico_alvo) => setForm((f) => ({ ...f, publico_alvo }))}
        />
        <div className="flex items-center gap-3">
          <input
            id="exige_confirmacao"
            type="checkbox"
            checked={form.exige_confirmacao}
            onChange={(e) => setForm((f) => ({ ...f, exige_confirmacao: e.target.checked }))}
            className="h-4 w-4 rounded border-cream-300 text-dourado-base focus:ring-dourado-base"
          />
          <label htmlFor="exige_confirmacao" className="text-sm text-coffee-base">
            Exigir confirmação (colaborador deve marcar &quot;Li e confirmei&quot;)
          </label>
        </div>
        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
          >
            {enviando ? 'Criando…' : 'Criar aviso'}
          </button>
          <Link
            href="/admin/avisos"
            className="rounded-lg border border-cream-300 px-4 py-2 text-coffee-base font-medium hover:bg-cream-100 transition-colors"
          >
            Voltar
          </Link>
        </div>
      </form>
    </div>
  );
}
