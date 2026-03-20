'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface LoginFormProps {
  onSubmit: (cpf: string, senha?: string, senhaConfirmacao?: string) => void;
  error: string | null;
  formatCpf: (value: string) => string;
  /** Fluxo de primeiro acesso — definir senha */
  mode?: 'login' | 'primeira_senha';
  /** CPF (só dígitos) travado no modo primeira senha */
  cpfBloqueado?: string;
}

export function LoginForm({
  onSubmit,
  error,
  formatCpf,
  mode = 'login',
  cpfBloqueado = '',
}: LoginFormProps) {
  const [cpf, setCpf] = useState('');
  const [masked, setMasked] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showSenha2, setShowSenha2] = useState(false);

  const primeiraSenha = mode === 'primeira_senha';
  const maskedBloqueado = cpfBloqueado ? formatCpf(cpfBloqueado) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(digits);
    setMasked(formatCpf(digits));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (primeiraSenha) {
      onSubmit(cpfBloqueado, senha, senha2);
    } else {
      onSubmit(cpf, senha);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-2xl font-display font-semibold text-cafeteria-800">
        {primeiraSenha ? 'Crie sua senha' : 'Portal do Colaborador'}
      </h1>
      <p className="mb-6 text-sm text-cafeteria-600">
        {primeiraSenha
          ? 'É seu primeiro acesso. Defina uma senha para continuar.'
          : 'Cafeteria Gabi Fontes'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-cafeteria-700">CPF</label>
        {primeiraSenha ? (
          <input
            type="text"
            readOnly
            value={maskedBloqueado}
            className="w-full rounded-lg border border-cafeteria-200 bg-cream-100 px-4 py-3 text-base text-cafeteria-600 min-h-[44px]"
            aria-readonly="true"
          />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="username"
            value={masked}
            onChange={handleChange}
            placeholder="000.000.000-00"
            className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
          />
        )}

        {!primeiraSenha && (
          <>
            <label className="block text-sm font-medium text-cafeteria-700">Senha</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 pr-12 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cafeteria-500 hover:text-cafeteria-700 p-1"
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {showSenha ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M4.5 4.5l15 15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-right">
              <Link
                href="/login/esqueci-senha"
                className="text-sm text-dourado-base font-medium hover:underline"
              >
                Esqueci minha senha
              </Link>
            </p>
          </>
        )}

        {primeiraSenha && (
          <>
            <label className="block text-sm font-medium text-cafeteria-700">Nova senha</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 pr-12 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cafeteria-500 hover:text-cafeteria-700 p-1"
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {showSenha ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M4.5 4.5l15 15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <label className="block text-sm font-medium text-cafeteria-700">Confirmar senha</label>
            <div className="relative">
              <input
                type={showSenha2 ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                placeholder="Repita a senha"
                className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 pr-12 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
              />
              <button
                type="button"
                onClick={() => setShowSenha2(!showSenha2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cafeteria-500 hover:text-cafeteria-700 p-1"
                aria-label={showSenha2 ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                tabIndex={-1}
              >
                {showSenha2 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M4.5 4.5l15 15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">
          {primeiraSenha ? 'Definir senha e continuar' : 'Entrar'}
        </Button>
      </form>
      {!primeiraSenha && (
        <p className="mt-6 pt-4 border-t border-cafeteria-200 text-center text-sm">
          <span className="text-coffee-100">Sócios e admins:</span>{' '}
          <Link
            href="/admin"
            className="text-dourado-base font-medium hover:underline"
          >
            Entrar no painel Admin (usuário + senha)
          </Link>
        </p>
      )}
    </div>
  );
}
