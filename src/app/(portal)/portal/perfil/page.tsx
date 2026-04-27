'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

export default function PerfilPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completarObrigatorio = searchParams.get('completar') === '1';
  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [colaborador, setColaborador] = useState<{
    nome: string;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
    cargo: string | null;
    foto_url: string | null;
    perfil_completo?: boolean;
    unidades?: { nome: string };
  } | null>(null);
  const [form, setForm] = useState({ nome: '', endereco: '', telefone: '', email: '' });
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId) {
      router.push('/login');
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!session?.colaboradorId) return;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.colaborador) {
          setColaborador(data.colaborador);
          setForm({
            nome: String(data.colaborador.nome ?? ''),
            endereco: String(data.colaborador.endereco ?? ''),
            telefone: String(data.colaborador.telefone ?? ''),
            email: String(data.colaborador.email ?? ''),
          });
        }
      });
  }, [session?.colaboradorId]);

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.colaboradorId) return;
    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem (JPG, PNG ou WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5 MB.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);
      const res = await fetch('/api/portal/perfil/foto', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.foto_url) {
        setColaborador((c) => (c ? { ...c, foto_url: data.foto_url } : null));
      } else {
        setErro(data.erro || 'Erro ao enviar foto.');
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
      e.target.value = '';
    }
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setOkMsg('');
    setSalvando(true);
    try {
      const res = await fetch('/api/portal/perfil', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível salvar o perfil.');
        return;
      }
      setColaborador((prev) =>
        prev
          ? {
              ...prev,
              nome: form.nome.trim(),
              endereco: form.endereco.trim(),
              telefone: form.telefone.trim(),
              email: form.email.trim(),
              perfil_completo: true,
            }
          : prev
      );
      setOkMsg('Perfil atualizado com sucesso.');
      if (completarObrigatorio) router.replace('/portal');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  if (!session) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando…" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">Meu perfil</h1>
      <div className="rounded-2xl bg-white border border-dourado-200 shadow-xl p-6">
        {completarObrigatorio && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Complete e confirme seu perfil para continuar no portal.
          </div>
        )}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {colaborador?.foto_url ? (
              <img
                src={colaborador.foto_url}
                alt="Sua foto"
                className="w-32 h-32 rounded-full object-cover border-2 border-dourado-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-cream-200 flex items-center justify-center border-2 border-cream-300">
                <span className="text-4xl text-coffee-200 font-display">
                  {colaborador?.nome?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-dourado-base p-2 text-cream-100 hover:bg-dourado-400 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFoto}
                disabled={enviando}
                className="sr-only"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
              </svg>
            </label>
          </div>
          <p className="text-xs text-coffee-100 mt-2">
            {enviando ? 'Enviando…' : 'Toque no ícone para trocar a foto'}
          </p>
          {erro && <p className="text-red-600 text-sm mt-1">{erro}</p>}
          {okMsg && <p className="text-green-700 text-sm mt-1">{okMsg}</p>}
        </div>
        <form onSubmit={handleSalvarPerfil} className="space-y-3 text-sm">
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Nome *</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base"
            />
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">E-mail *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base"
            />
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Telefone *</label>
            <input
              required
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base"
            />
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Endereço *</label>
            <input
              required
              value={form.endereco}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base"
            />
          </div>
          <div>
            <span className="text-coffee-100 font-medium">Cargo:</span>{' '}
            <span className="text-coffee-base">{colaborador?.cargo ?? '-'}</span>
          </div>
          <div>
            <span className="text-coffee-100 font-medium">Unidade:</span>{' '}
            <span className="text-coffee-base">{colaborador?.unidades?.nome ?? '-'}</span>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>
      </div>
    </div>
  );
}
