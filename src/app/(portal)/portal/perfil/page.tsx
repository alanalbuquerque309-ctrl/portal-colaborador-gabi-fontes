'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { CompletarCadastroPessoalBanner } from '@/components/portal/CompletarCadastroPessoalBanner';
import { CompletarFotoPerfilBanner } from '@/components/portal/CompletarFotoPerfilBanner';
import { EscolherFotoPerfil } from '@/components/portal/EscolherFotoPerfil';
import { formatTelefoneBr } from '@/lib/telefone';
import { urlOnboardingColaborador } from '@/lib/onboarding-reabrir';
import { fotoObrigatoriaPortal } from '@/lib/perfil-completo';
import { CafeConectaPerfilBloco } from '@/components/portal/CafeConectaPerfilBloco';

function PerfilPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completarObrigatorio = searchParams.get('completar') === '1';
  const fotoObrigatoria = searchParams.get('foto') === '1';
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
    foto_cadastrada?: boolean;
    onboarding_completo?: boolean;
    role?: string;
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
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
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
          if (fotoObrigatoria && !fotoObrigatoriaPortal(data.colaborador.role)) {
            router.replace('/portal/perfil');
            return;
          }
          if (
            fotoObrigatoria &&
            data.colaborador.foto_cadastrada &&
            !completarObrigatorio
          ) {
            router.replace('/portal');
          }
        }
      });
  }, [session?.colaboradorId, fotoObrigatoria, completarObrigatorio, router]);

  const handleFotoEnviada = (url: string) => {
    setColaborador((c) => (c ? { ...c, foto_url: url, foto_cadastrada: true } : null));
    setOkMsg('Foto salva! Redirecionando…');
    if (fotoObrigatoria && !completarObrigatorio) {
      window.setTimeout(() => router.replace('/portal'), 800);
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
        } else if (
          fotoObrigatoriaPortal(colaborador?.role) &&
          !colaborador?.foto_cadastrada &&
          !colaborador?.foto_url
        ) {
          router.replace('/portal/perfil?foto=1');
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

  const fotoGateAtivo = fotoObrigatoria && fotoObrigatoriaPortal(colaborador?.role);
  const mostrarFormulario = completarObrigatorio || !fotoGateAtivo;

  return (
    <div className={`max-w-lg mx-auto ${completarObrigatorio || fotoGateAtivo ? 'pb-8' : ''}`}>
      {completarObrigatorio ? (
        <CompletarCadastroPessoalBanner />
      ) : fotoGateAtivo ? (
        <CompletarFotoPerfilBanner />
      ) : (
        <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">Meu perfil</h1>
      )}

      <div
        className={`rounded-2xl bg-white border shadow-xl p-6 ${
          completarObrigatorio || fotoGateAtivo
            ? 'border-dourado-base/60 ring-2 ring-dourado-base/20'
            : 'border-dourado-200'
        }`}
      >
        {(fotoGateAtivo || !completarObrigatorio) && (
          <div className="mb-6 pb-6 border-b border-cream-200">
            <EscolherFotoPerfil
              nome={colaborador?.nome ?? form.nome}
              fotoUrl={colaborador?.foto_url}
              onFotoEnviada={handleFotoEnviada}
              variant={fotoGateAtivo ? 'modal' : 'perfil'}
            />
          </div>
        )}

        {erro && <p className="text-red-600 text-sm mb-3">{erro}</p>}
        {okMsg && <p className="text-green-700 text-sm mb-3">{okMsg}</p>}

        {mostrarFormulario && (
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
                Aniversário no mural (só dia e mês). Não é a data de admissão — essa fica com o RH no cadastro
                admin.
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
        )}

        {fotoGateAtivo && colaborador?.foto_cadastrada && (
          <button
            type="button"
            onClick={() => router.replace('/portal')}
            className="w-full mt-4 rounded-xl border border-dourado-base px-4 py-3 text-dourado-800 font-semibold hover:bg-dourado-50 min-h-[48px]"
          >
            Continuar no portal
          </button>
        )}
      </div>

      {!completarObrigatorio && !fotoGateAtivo && <CafeConectaPerfilBloco />}
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
