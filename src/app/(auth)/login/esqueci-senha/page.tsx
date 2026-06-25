'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTelefoneBr, normalizeTelefoneLogin, telefoneLoginValido } from '@/lib/telefone';
import { Button } from '@/components/ui/Button';

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [telefone, setTelefone] = useState('');
  const [masked, setMasked] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleTelefone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setTelefone(digits);
    setMasked(formatTelefoneBr(digits));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setOkMsg('');
    const telefoneLogin = normalizeTelefoneLogin(telefone);
    if (!telefoneLoginValido(telefoneLogin)) {
      setErro('Informe um celular válido com DDD (10 ou 11 dígitos).');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/login/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefoneLogin,
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setOkMsg(data.mensagem || 'Pedido enviado. Procure o RH para concluir a redefinição.');
        setTimeout(() => router.push('/login'), 4000);
      } else {
        setErro(data.erro || 'Não foi possível enviar o pedido.');
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
          Solicitar redefinição
        </h1>
        <p className="mb-6 text-sm text-cafeteria-600">
          Informe o celular (com DDD) e o e-mail <strong>exatamente como estão no cadastro do RH</strong>. Se
          conferirem, seu pedido entra na fila do RH, que redefine a senha e avisa você. Por segurança, a redefinição
          não é automática: ninguém recebe nova senha por e-mail ou SMS sozinho.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cafeteria-700 mb-1">Celular (com DDD)</label>
            <input
              type="text"
              inputMode="numeric"
              value={masked}
              onChange={handleTelefone}
              placeholder="(21) 99999-9999"
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
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {okMsg && <p className="text-sm text-green-700">{okMsg}</p>}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar pedido ao RH'}
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
