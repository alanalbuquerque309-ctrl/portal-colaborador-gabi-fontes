'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setPortalSession, clearPortalSession, getPendingCpf } from '@/lib/utils/session';

/** Valores fixos — sem carregamento do banco. Slugs para API. */
const BOTOES_UNIDADE = [
  { value: 'matriz', label: 'MATRIZ' },
  { value: 'mesquita', label: 'MESQUITA' },
  { value: 'nova-iguacu', label: 'NOVA IGUAÇU' },
  { value: 'barra', label: 'BARRA' },
] as const;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function CompleteRegistrationForm() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ nome: 'Alan Albuquerque', email: '', unidade: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const cpf = getPendingCpf();
    if (!cpf) {
      setErro('Sessão expirada. Faça login novamente.');
      return;
    }
    const valorSelecionado = form.unidade;
    if (!valorSelecionado) {
      setErro('Selecione uma unidade.');
      return;
    }
    setEnviando(true);
    const body: Record<string, unknown> = {
      cpf,
      nome: form.nome.trim(),
      email: form.email.trim() || undefined,
      role: 'socio',
    };
    if (isUuid(valorSelecionado)) {
      body.unidade_id = valorSelecionado;
    } else {
      body.unidade_slug = valorSelecionado;
    }
    try {
      const res = await fetch('/api/portal/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setPortalSession(data.colaborador.id, data.colaborador.unidade_id, 'socio');
        router.refresh();
        router.push('/portal');
      } else {
        setErro(data.erro || 'Erro ao cadastrar.');
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  const handleSair = () => {
    if (typeof window !== 'undefined' && !window.confirm('Deseja sair e voltar ao login?')) {
      return;
    }
    clearPortalSession();
    router.push('/login');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl bg-white border border-dourado-200 shadow-xl p-6">
        <h2 className="text-xl font-display font-semibold text-coffee-base mb-2">
          Complete seu cadastro
        </h2>
        <p className="text-sm text-coffee-100 mb-6">
          Você entrou com acesso temporário. Preencha os dados para concluir seu cadastro no portal.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-coffee-base mb-1">
              Nome *
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-coffee-base mb-1">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-coffee-base mb-2">Unidade *</span>
            <div className="grid grid-cols-2 gap-2">
              {BOTOES_UNIDADE.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, unidade: opt.value }))}
                  className={
                    'rounded-lg border-2 border-[#D4AF37] p-4 text-center text-sm font-semibold transition-all active:scale-95 min-h-[52px] ' +
                    (form.unidade === opt.value
                      ? 'bg-[#6F4E37] text-[#D4AF37]'
                      : 'bg-cream-50 text-coffee-base hover:bg-cream-100')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
            >
              {enviando ? 'Cadastrando…' : 'Concluir cadastro'}
            </button>
            <button
              type="button"
              onClick={handleSair}
              className="rounded-lg border border-cream-300 px-4 py-2 text-coffee-base font-medium hover:bg-cream-100"
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
