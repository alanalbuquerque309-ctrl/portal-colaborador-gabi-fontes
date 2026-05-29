'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  useEffect(() => {
    fetch(`/api/admin/auth?_=${Date.now()}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) window.location.assign('/admin/dashboard');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-dourado-200 shadow-xl p-8">
        <h1 className="font-display text-xl text-coffee-base text-center mb-2">
          Acesso administrativo
        </h1>
        <p className="text-coffee-100 text-sm text-center mb-6">
          Entre primeiro pelo portal com celular/e-mail e senha. Seu cargo libera automaticamente os acessos.
        </p>
        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center rounded-lg bg-dourado-base px-4 py-2.5 text-cream-100 text-sm font-medium hover:bg-dourado-400"
        >
          Ir para o login do portal
        </Link>
        <p className="mt-4 text-center">
          <Link href="/portal" className="text-coffee-100 text-sm hover:text-coffee-base">
            ← Voltar ao portal
          </Link>
        </p>
      </div>
    </div>
  );
}
