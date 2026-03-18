'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [stats, setStats] = useState({
    colaboradores: 0,
    avisos: 0,
    onboardingPendente: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('colaboradores').select('id', { count: 'exact', head: true }),
      supabase.from('avisos').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('onboarding_completo', false),
    ]).then(([c, a, o]) => {
      setStats({
        colaboradores: c.count ?? 0,
        avisos: a.count ?? 0,
        onboardingPendente: o.count ?? 0,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Dashboard Admin
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm">
          <p className="text-coffee-100 text-sm">Colaboradores</p>
          <p className="text-2xl font-display font-semibold text-coffee-base">{stats.colaboradores}</p>
        </div>
        <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm">
          <p className="text-coffee-100 text-sm">Avisos ativos</p>
          <p className="text-2xl font-display font-semibold text-coffee-base">{stats.avisos}</p>
        </div>
        <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm">
          <p className="text-coffee-100 text-sm">Onboarding pendente</p>
          <p className="text-2xl font-display font-semibold text-dourado-500">{stats.onboardingPendente}</p>
        </div>
      </div>
      <div className="mt-8 rounded-xl border border-dourado-200 bg-white p-6 shadow-sm">
        <h2 className="font-display font-semibold text-coffee-base mb-2">Link para convite</h2>
        <p className="text-sm text-coffee-100 mb-3">
          Envie este link pelo WhatsApp para o colaborador acessar o portal e concluir o cadastro. Ele poderá instalar o app no celular.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 truncate rounded-lg bg-cream-100 px-3 py-2 text-sm text-coffee-base">
            {typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}
          </code>
          <button
            type="button"
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
              void navigator.clipboard?.writeText(url).then(() => {
                setLinkCopiado(true);
                setTimeout(() => setLinkCopiado(false), 2000);
              });
            }}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 text-sm font-medium hover:bg-dourado-400 whitespace-nowrap"
          >
            {linkCopiado ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-dourado-200 bg-white p-6 shadow-sm">
        <h2 className="font-display font-semibold text-coffee-base mb-2">Acesso rápido</h2>
        <ul className="space-y-2 text-coffee-base">
          <li>
            <a href="/admin/colaboradores" className="text-dourado-500 hover:underline">
              Cadastrar colaboradores
            </a>
          </li>
          <li>
            <a href="/admin/avisos" className="text-dourado-500 hover:underline">
              Criar avisos para as unidades
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
