'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), senha }),
    });
    const data = await res.json();
    if (data.ok) {
      router.push('/admin/dashboard');
      router.refresh();
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
          Portal do Colaborador — Gabi Fontes
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
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-cream-300 text-coffee-base focus:ring-2 focus:ring-dourado-base focus:border-transparent"
              placeholder="Digite a senha"
              required
              autoComplete="current-password"
            />
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
