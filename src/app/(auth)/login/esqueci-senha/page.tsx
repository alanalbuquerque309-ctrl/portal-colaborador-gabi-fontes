'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCpf } from '@/lib/utils/cpf';
import { Button } from '@/components/ui/Button';

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [masked, setMasked] = useState('');
  const [email, setEmail] = useState('');
  const [nova, setNova] = useState('');
  const [nova2, setNova2] = useState('');
  const [erro, setErro] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleCpf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(digits);
    setMasked(formatCpf(digits));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setOkMsg('');
    const cleanCpf = cpf.replace(/\D/g, '').trim().padStart(11, '0');
    if (cleanCpf.length !== 11) {
      setErro('CPF inválido.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/login/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cleanCpf,
          email: email.trim(),
          novaSenha: nova.trim(),
          novaSenhaConfirmacao: nova2.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setOkMsg(data.mensagem || 'Senha redefinida. Redirecionando para o login…');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setErro(data.erro || 'Não foi possível redefinir.');
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-display font-semibold text-cafeteria-800">
          Redefinir senha
        </h1>
        <p className="mb-6 text-sm text-cafeteria-600">
          Informe o CPF e o e-mail cadastrados no RH e defina uma nova senha. Por segurança, a senha
          antiga não pode ser exibida.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cafeteria-700 mb-1">CPF</label>
            <input
              type="text"
              inputMode="numeric"
              value={masked}
              onChange={handleCpf}
              placeholder="000.000.000-00"
              className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base min-h-[44px]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cafeteria-700 mb-1">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base min-h-[44px]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cafeteria-700 mb-1">Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base min-h-[44px]"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cafeteria-700 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={nova2}
              onChange={(e) => setNova2(e.target.value)}
              className="w-full rounded-lg border border-cafeteria-200 bg-cream-50 px-4 py-3 text-base min-h-[44px]"
              required
              minLength={6}
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {okMsg && <p className="text-sm text-green-700">{okMsg}</p>}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Redefinir senha'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-dourado-base font-medium hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
