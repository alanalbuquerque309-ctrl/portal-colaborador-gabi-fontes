'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const [login, setLogin] = useState('');

  useEffect(() => {
    fetch(`/api/admin/auth?_=${Date.now()}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) window.location.assign('/admin/dashboard');
      });
  }, []);
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), senha }),
    });
    const data = await res.json();
    if (data.ok) {
      // Navegação completa garante que o cookie admin_session seja enviado na próxima página
      window.location.assign('/admin/dashboard');
    } else {
      setErro('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-dourado-200 shadow-xl p-8">
        <h1 className="font-display text-xl text-coffee-base text-center mb-2">
          Acesso Administrativo
        </h1>
        <p className="text-coffee-100 text-sm text-center mb-6">
          Portal do Colaborador — Cafeteria Gabi Fontes
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-coffee-base mb-1">
              Usuário
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-cream-300 text-coffee-base focus:ring-2 focus:ring-dourado-base focus:border-transparent"
              placeholder="Digite seu usuário"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-coffee-base mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-2 pr-12 rounded-lg border border-cream-300 text-coffee-base focus:ring-2 focus:ring-dourado-base focus:border-transparent"
                placeholder="Digite a senha"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-200 hover:text-coffee-base p-1"
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
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center">
          <a href="/" className="text-coffee-100 text-sm hover:text-coffee-base">
            ← Voltar ao portal
          </a>
        </p>
      </div>
    </div>
  );
}
