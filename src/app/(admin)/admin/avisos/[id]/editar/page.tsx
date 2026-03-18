'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

const OPCOES_UNIDADE = [
  { value: 'matriz', label: 'Matriz (todas as lojas)' },
  { value: 'mesquita', label: 'Mesquita' },
  { value: 'barra', label: 'Barra' },
  { value: 'nova-iguacu', label: 'Nova Iguaçu' },
];

function slugFromNome(nome: string): string {
  const mapa: Record<string, string> = {
    'Matriz (todas as lojas)': 'matriz',
    Mesquita: 'mesquita',
    Barra: 'barra',
    'Nova Iguaçu': 'nova-iguacu',
  };
  return mapa[nome] ?? 'matriz';
}

export default function EditarAvisoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    unidade_slug: 'matriz',
    ativo: true,
    exige_confirmacao: false,
  });

  useEffect(() => {
    if (!id) return;
    fetch('/api/admin/avisos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.avisos)) {
          const aviso = data.avisos.find((a: { id: string }) => a.id === id);
          if (aviso) {
            setForm({
              titulo: aviso.titulo ?? '',
              conteudo: aviso.conteudo ?? '',
              unidade_slug: slugFromNome(aviso.unidade_nome ?? '') || 'matriz',
              ativo: aviso.ativo !== false,
              exige_confirmacao: aviso.exige_confirmacao === true,
            });
          } else {
            setErro('Aviso não encontrado.');
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.titulo.trim()) {
      setErro('O título é obrigatório.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/admin/avisos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          conteudo: form.conteudo.trim() || null,
          unidade_slug: form.unidade_slug,
          ativo: form.ativo,
          exige_confirmacao: form.exige_confirmacao,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/admin/avisos');
      } else {
        setErro(data.erro || 'Erro ao atualizar.');
      }
    } catch {
      setErro('Erro ao atualizar. Tente novamente.');
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

  if (erro && !form.titulo) {
    return (
      <div>
        <p className="text-red-600 mb-4">{erro}</p>
        <Link href="/admin/avisos" className="text-dourado-base hover:underline">
          Voltar para avisos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Editar aviso
      </h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
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
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Unidade *</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Unidade">
            {OPCOES_UNIDADE.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, unidade_slug: opt.value }))}
                className={`min-h-[48px] rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  form.unidade_slug === opt.value
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="ativo"
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
            className="h-4 w-4 rounded border-cream-300 text-dourado-base focus:ring-dourado-base"
          />
          <label htmlFor="ativo" className="text-sm text-coffee-base">
            Aviso ativo (visível no mural)
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="exige_confirmacao"
            type="checkbox"
            checked={form.exige_confirmacao}
            onChange={(e) => setForm((f) => ({ ...f, exige_confirmacao: e.target.checked }))}
            className="h-4 w-4 rounded border-cream-300 text-dourado-base focus:ring-dourado-base"
          />
          <label htmlFor="exige_confirmacao" className="text-sm text-coffee-base">
            Exigir confirmação (&quot;Li e confirmei&quot;)
          </label>
        </div>
        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
          >
            {enviando ? 'Salvando…' : 'Salvar'}
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
