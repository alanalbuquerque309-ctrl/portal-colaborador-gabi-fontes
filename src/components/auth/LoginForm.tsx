'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  lerPreferenciaManterLogado,
  lerUltimoLoginSalvo,
} from '@/lib/portal-remember-login';

interface LoginFormProps {
  onSubmit: (
    login: string,
    senha?: string,
    senhaConfirmacao?: string,
    opts?: { manterLogado: boolean }
  ) => void;
  /** Troca obrigatória após senha padrão 123456 — não exige senha atual */
  onTrocarSenhaObrigatoria?: (
    login: string,
    senhaNova: string,
    senhaConfirmacao: string,
    opts?: { manterLogado: boolean }
  ) => void;
  error: string | null;
  formatTelefone: (value: string) => string;
  /** Fluxo de primeiro acesso — definir senha */
  mode?: 'login' | 'primeira_senha' | 'trocar_senha_obrigatoria';
  /** Login travado no modo primeira senha / troca obrigatória */
  loginBloqueado?: string;
}

export function LoginForm({
  onSubmit,
  onTrocarSenhaObrigatoria,
  error,
  formatTelefone,
  mode = 'login',
  loginBloqueado = '',
}: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showSenha2, setShowSenha2] = useState(false);
  const [manterLogado, setManterLogado] = useState(true);

  useEffect(() => {
    setManterLogado(lerPreferenciaManterLogado());
    const salvo = lerUltimoLoginSalvo();
    if (salvo && mode === 'login') {
      setLogin(salvo.includes('@') ? salvo : salvo.replace(/\D/g, '').slice(0, 11));
    }
  }, [mode]);

  const primeiraSenha = mode === 'primeira_senha';
  const trocarObrigatoria = mode === 'trocar_senha_obrigatoria';
  const maskedBloqueado =
    loginBloqueado && !loginBloqueado.includes('@') ? formatTelefone(loginBloqueado) : loginBloqueado;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trimStart();
    if (raw.includes('@')) {
      setLogin(raw.toLowerCase());
      return;
    }
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    setLogin(digits);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opts = { manterLogado };
    if (trocarObrigatoria && onTrocarSenhaObrigatoria) {
      onTrocarSenhaObrigatoria(loginBloqueado, senha, senha2, opts);
      return;
    }
    if (primeiraSenha) {
      onSubmit(loginBloqueado, senha, senha2, opts);
    } else {
      onSubmit(login, senha, undefined, opts);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl border border-cream-200">
      <div className="mb-6 flex justify-center">
        <Image
          src="/logo-gabi-fontes.png"
          alt="Gabi Fontes — Cafeteria & Doceria"
          width={220}
          height={158}
          className="h-auto w-full max-w-[220px] object-contain"
          priority
        />
      </div>
      <h1 className="mb-2 text-2xl font-display font-semibold text-cafeteria-800 text-center">
        {trocarObrigatoria
          ? 'Defina sua nova senha'
          : primeiraSenha
            ? 'Crie sua senha'
            : 'Portal do Colaborador'}
      </h1>
      <p className="mb-6 text-sm text-cafeteria-600 text-center">
        {trocarObrigatoria
          ? 'Por segurança, troque a senha padrão (123456) por uma senha só sua: 6 números.'
          : primeiraSenha
            ? 'É seu primeiro acesso. Defina uma senha de 6 números para continuar.'
            : 'Cafeteria Gabi Fontes'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-cafeteria-700">Celular (com DDD) ou e-mail</label>
        {primeiraSenha || trocarObrigatoria ? (
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
            autoComplete="username"
            inputMode={login.includes('@') ? 'email' : 'numeric'}
            value={login.includes('@') ? login : formatTelefone(login)}
            onChange={handleChange}
            placeholder="(21) 99999-9999 ou nome@empresa.com"
            className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
          />
        )}

        {trocarObrigatoria && (
          <>
            <label className="block text-sm font-medium text-cafeteria-700">Nova senha (6 números)</label>
            <input
              type={showSenha ? 'text' : 'password'}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
            />
            <label className="block text-sm font-medium text-cafeteria-700">Confirmar nova senha</label>
            <input
              type={showSenha2 ? 'text' : 'password'}
              autoComplete="new-password"
              value={senha2}
              onChange={(e) => setSenha2(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
            />
          </>
        )}

        {!primeiraSenha && !trocarObrigatoria && (
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
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={manterLogado}
                onChange={(e) => setManterLogado(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-cafeteria-300 text-dourado-base focus:ring-dourado-base"
              />
              <span className="text-sm text-cafeteria-700 leading-snug">
                <span className="font-medium text-cafeteria-800">Manter conectado</span>
                <span className="block text-cafeteria-500 text-xs mt-0.5">
                  Não precisa digitar celular/e-mail de novo; sessão válida por até 90 dias neste aparelho.
                </span>
              </span>
            </label>
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
            <label className="block text-sm font-medium text-cafeteria-700">Nova senha (6 números)</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
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
                onChange={(e) => setSenha2(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
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
          {trocarObrigatoria
            ? 'Salvar e continuar'
            : primeiraSenha
              ? 'Definir senha e continuar'
              : 'Entrar'}
        </Button>
      </form>
      {!primeiraSenha && !trocarObrigatoria && (
        <p className="mt-6 pt-4 border-t border-cafeteria-200 text-center text-sm">
          <span className="text-coffee-100">
            Todos os perfis entram por aqui com celular/e-mail e senha. O acesso é aplicado conforme o cargo.
          </span>
        </p>
      )}
    </div>
  );
}
