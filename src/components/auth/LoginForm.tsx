'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface LoginFormProps {
  onSubmit: (cpf: string, senha?: string) => void;
  error: string | null;
  formatCpf: (value: string) => string;
}

export function LoginForm({ onSubmit, error, formatCpf }: LoginFormProps) {
  const [cpf, setCpf] = useState('');
  const [masked, setMasked] = useState('');
  const [senha, setSenha] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(digits);
    setMasked(formatCpf(digits));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(cpf, senha);
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-2xl font-display font-semibold text-cafeteria-800">
        Portal do Colaborador
      </h1>
      <p className="mb-6 text-sm text-cafeteria-600">Gabi Fontes</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-cafeteria-700">
          CPF
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={masked}
          onChange={handleChange}
          placeholder="000.000.000-00"
          className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
        />
        <label className="block text-sm font-medium text-cafeteria-700">
          Senha
        </label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite sua senha"
          className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base text-cafeteria-800 placeholder:text-cafeteria-300 focus:border-cafeteria-500 focus:outline-none focus:ring-1 focus:ring-cafeteria-500 min-h-[44px] touch-manipulation"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-6 pt-4 border-t border-cafeteria-200 text-center">
        <Link
          href="/admin"
          className="text-cafeteria-600 font-medium hover:text-cafeteria-800 hover:underline"
        >
          Acesso administrativo
        </Link>
      </p>
    </div>
  );
}
