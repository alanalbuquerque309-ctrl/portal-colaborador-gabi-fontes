'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { AvisosPublicoSelector } from '@/components/admin/AvisosPublicoSelector';
import { resolverPublicoAviso, type PublicoAvisoKey } from '@/lib/avisos-publico';
import { normalizarTipoConteudo, type TreinamentoTipoConteudo } from '@/lib/treinamento-conteudo';

export default function EditarTreinamentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tipo_conteudo: 'video' as TreinamentoTipoConteudo,
    video_youtube_url: '',
    conteudo_texto: '',
    publico_alvo: 'todos' as PublicoAvisoKey,
    ativo: true,
    exige_confirmacao: true,
    ordem: 0,
  });

  useEffect(() => {
    if (!id) return;
    fetch('/api/admin/treinamentos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.treinamentos)) {
          const t = data.treinamentos.find((x: { id: string }) => x.id === id);
          if (t) {
            setForm({
              titulo: t.titulo ?? '',
              descricao: t.descricao ?? '',
              tipo_conteudo: normalizarTipoConteudo(t.tipo_conteudo),
              video_youtube_url: t.video_youtube_url ?? '',
              conteudo_texto: t.conteudo_texto ?? '',
              publico_alvo: resolverPublicoAviso(t.publico_alvo, t.unidade_slug),
              ativo: t.ativo !== false,
              exige_confirmacao: t.exige_confirmacao === true,
              ordem: Number(t.ordem) || 0,
            });
          } else setErro('Treinamento não encontrado.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`/api/admin/treinamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) router.push('/admin/treinamento');
      else setErro(data.erro || 'Erro ao salvar.');
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
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">Editar treinamento</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <input
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <textarea
            rows={3}
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </div>
        <div>
          <span className="block text-sm font-medium mb-2">Formato</span>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="tipo_conteudo"
                checked={form.tipo_conteudo === 'video'}
                onChange={() => setForm((f) => ({ ...f, tipo_conteudo: 'video' }))}
              />
              Vídeo (YouTube)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="tipo_conteudo"
                checked={form.tipo_conteudo === 'texto'}
                onChange={() => setForm((f) => ({ ...f, tipo_conteudo: 'texto' }))}
              />
              Texto no portal
            </label>
          </div>
        </div>
        {form.tipo_conteudo === 'video' ? (
          <div>
            <label className="block text-sm font-medium mb-1">URL do YouTube</label>
            <input
              value={form.video_youtube_url}
              onChange={(e) => setForm((f) => ({ ...f, video_youtube_url: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Conteúdo em texto</label>
            <textarea
              rows={10}
              value={form.conteudo_texto}
              onChange={(e) => setForm((f) => ({ ...f, conteudo_texto: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        )}
        <AvisosPublicoSelector
          value={form.publico_alvo}
          onChange={(publico_alvo) => setForm((f) => ({ ...f, publico_alvo }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.exige_confirmacao}
            onChange={(e) => setForm((f) => ({ ...f, exige_confirmacao: e.target.checked }))}
          />
          Exigir confirmação no portal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
          />
          Ativo
        </label>
        {erro ? <p className="text-red-600 text-sm">{erro}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium disabled:opacity-50"
          >
            {enviando ? 'Salvando…' : 'Salvar'}
          </button>
          <Link href="/admin/treinamento" className="rounded-lg border border-cream-300 px-4 py-2 text-sm">
            Voltar
          </Link>
        </div>
      </form>
    </div>
  );
}
