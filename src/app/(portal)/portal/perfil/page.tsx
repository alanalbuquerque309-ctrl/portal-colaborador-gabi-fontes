'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { CompletarCadastroPessoalBanner } from '@/components/portal/CompletarCadastroPessoalBanner';
import { formatTelefoneBr } from '@/lib/telefone';
import { urlOnboardingColaborador } from '@/lib/onboarding-reabrir';

function PerfilPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completarObrigatorio = searchParams.get('completar') === '1';
  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [colaborador, setColaborador] = useState<{
    nome: string;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
    data_nascimento: string | null;
    cargo: string | null;
    foto_url: string | null;
    perfil_completo?: boolean;
    onboarding_completo?: boolean;
    unidade_id?: string;
    unidades?: { nome: string };
  } | null>(null);
  const [form, setForm] = useState({
    nome: '',
    endereco: '',
    telefone: '',
    email: '',
    data_nascimento: '',
  });
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
            data_nascimento: String(data.colaborador.data_nascimento ?? ''),
          });
        }
      });
  }, [session?.colaboradorId]);

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (completarObrigatorio) return;
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
              data_nascimento: form.data_nascimento,
              perfil_completo: true,
            }
          : prev
      );
      if (completarObrigatorio) {
        setOkMsg('Cadastro salvo! Redirecionando…');
        const uid = colaborador?.unidade_id ?? session?.unidadeId ?? '';
        const cid = session?.colaboradorId ?? '';
        if (!colaborador?.onboarding_completo && cid && uid) {
          router.replace(urlOnboardingColaborador(cid, uid));
        } else {
          router.replace('/portal');
        }
        return;
      }
      setOkMsg('Perfil atualizado com sucesso.');
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
    <div className={`max-w-lg mx-auto ${completarObrigatorio ? 'pb-8' : ''}`}>
      {completarObrigatorio ? (
        <CompletarCadastroPessoalBanner />
      ) : (
        <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">Meu perfil</h1>
      )}

      <div
        className={`rounded-2xl bg-white border shadow-xl p-6 ${
          completarObrigatorio ? 'border-dourado-base/60 ring-2 ring-dourado-base/20' : 'border-dourado-200'
        }`}
      >
        {!completarObrigatorio && (
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
                </svg>
              </label>
            </div>
            <p className="text-xs text-coffee-100 mt-2">
              {enviando ? 'Enviando…' : 'Toque no ícone para trocar a foto'}
            </p>
          </div>
        )}

        {erro && <p className="text-red-600 text-sm mb-3">{erro}</p>}
        {okMsg && <p className="text-green-700 text-sm mb-3">{okMsg}</p>}

        <form onSubmit={handleSalvarPerfil} className="space-y-3 text-sm">
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Nome completo *</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">E-mail *</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base min-h-[44px]"
            />
            <p className="text-xs text-coffee-100/80 mt-1">Usado para login e confirmações no portal.</p>
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Celular *</label>
            <input
              required
              inputMode="tel"
              autoComplete="tel"
              value={form.telefone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefone: formatTelefoneBr(e.target.value) }))
              }
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base min-h-[44px]"
            />
            <p className="text-xs text-coffee-100/80 mt-1">Usado para login. Se alterar, entre com o novo número.</p>
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Endereço *</label>
            <input
              required
              value={form.endereco}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-coffee-100 font-medium block mb-1">Data de nascimento *</label>
            <input
              type="date"
              required
              value={form.data_nascimento}
              onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-coffee-base min-h-[44px]"
            />
            <p className="text-xs text-coffee-100/80 mt-1">
              Alimenta o mural de aniversariantes do mês (somente dia e mês são exibidos).
            </p>
          </div>
          <div>
            <span className="text-coffee-100 font-medium">Cargo:</span>{' '}
            <span className="text-coffee-base">{colaborador?.cargo ?? '—'}</span>
          </div>
          <div>
            <span className="text-coffee-100 font-medium">Unidade:</span>{' '}
            <span className="text-coffee-base">{colaborador?.unidades?.nome ?? '—'}</span>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-xl bg-dourado-base px-4 py-3 text-cream-100 font-semibold hover:bg-dourado-400 disabled:opacity-50 min-h-[48px] mt-2"
          >
            {salvando
              ? 'Salvando…'
              : completarObrigatorio
                ? 'Salvar e continuar no portal'
                : 'Salvar perfil'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <XicaraCarregando size="md" label="Carregando…" />
        </div>
      }
    >
      <PerfilPageContent />
    </Suspense>
  );
}
