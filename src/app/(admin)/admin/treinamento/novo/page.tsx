'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AvisosPublicoSelector } from '@/components/admin/AvisosPublicoSelector';
import type { PublicoAvisoKey } from '@/lib/avisos-publico';
import type { TreinamentoTipoConteudo } from '@/lib/treinamento-conteudo';

export default function NovoTreinamentoPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tipo_conteudo: 'video' as TreinamentoTipoConteudo,
    video_youtube_url: '',
    conteudo_texto: '',
    publico_alvo: 'todos' as PublicoAvisoKey,
    exige_confirmacao: true,
    ordem: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.titulo.trim()) {
      setErro('Título é obrigatório.');
      return;
    }
    if (form.tipo_conteudo === 'video' && !form.video_youtube_url.trim()) {
      setErro('URL do YouTube é obrigatória para vídeo.');
      return;
    }
    if (form.tipo_conteudo === 'texto' && !form.conteudo_texto.trim()) {
      setErro('Informe o texto do material.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/treinamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) router.push('/admin/treinamento');
      else setErro(data.erro || 'Erro ao publicar.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">Novo treinamento</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <input
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2"
            placeholder="Ex: Treino de atendimento — bebidas quentes"
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
          <span className="block text-sm font-medium mb-2">Formato *</span>
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
            <label className="block text-sm font-medium mb-1">URL do YouTube *</label>
            <input
              value={form.video_youtube_url}
              onChange={(e) => setForm((f) => ({ ...f, video_youtube_url: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2"
              placeholder="https://youtu.be/... ou https://youtube.com/shorts/..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Conteúdo em texto *</label>
            <textarea
              rows={10}
              value={form.conteudo_texto}
              onChange={(e) => setForm((f) => ({ ...f, conteudo_texto: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 font-mono text-sm"
              placeholder="Cole ou escreva o material que o colaborador vai ler no portal."
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
          Exigir confirmação «Assisti e entendi» no portal
        </label>
        {erro ? <p className="text-red-600 text-sm">{erro}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium disabled:opacity-50"
          >
            {enviando ? 'Publicando…' : 'Publicar'}
          </button>
          <Link href="/admin/treinamento" className="rounded-lg border border-cream-300 px-4 py-2 text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
