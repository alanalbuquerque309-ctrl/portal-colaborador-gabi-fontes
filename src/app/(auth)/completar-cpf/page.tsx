'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCpf } from '@/lib/utils/cpf';
import { setPortalSession } from '@/lib/utils/session';
import { Button } from '@/components/ui/Button';

export default function CompletarCpfPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [masked, setMasked] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleCpf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(digits);
    setMasked(formatCpf(digits));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch('/api/portal/definir-cpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cpf }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível salvar o CPF.');
        return;
      }
      if (data.colaborador && typeof data.colaborador === 'object') {
        const c = data.colaborador as { id: string; unidade_id: string; role?: string };
        setPortalSession(c.id, c.unidade_id, c.role);
      }
      if (data.redirect && typeof data.redirect === 'string') {
        router.push(data.redirect);
        router.refresh();
        return;
      }
      setErro('Resposta inesperada. Tente fazer login novamente.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl border border-cafeteria-200">
        <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-2">Informe seu CPF</h1>
        <p className="text-sm text-cafeteria-600 mb-6">
          Para concluir seu cadastro e acessar o portal com segurança, informe seu CPF (11 dígitos). Ele não foi
          cadastrado pelo RH e fica vinculado apenas ao seu login.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-cafeteria-700">CPF</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={masked}
            onChange={handleCpf}
            placeholder="000.000.000-00"
            className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base min-h-[44px]"
            required
          />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Continuar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
