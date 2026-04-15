'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Colaborador {
  id: string;
  nome: string;
  onboarding_completo: boolean;
}

export default function AdminDashboardPage() {
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [avisos, setAvisos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erroApi, setErroApi] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/colaboradores', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/admin/avisos', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()),
    ]).then(([cols, avs]) => {
      if (!cols.ok) {
        setErroApi(
          typeof cols.erro === 'string' ? cols.erro : 'Não foi possível carregar os colaboradores.'
        );
      } else if (Array.isArray(cols.colaboradores)) {
        setColaboradores(
          cols.colaboradores.map((c: { id: string; nome: string; onboarding_completo?: boolean }) => ({
            id: c.id,
            nome: c.nome,
            onboarding_completo: c.onboarding_completo === true,
          }))
        );
      }
      if (avs.ok && Array.isArray(avs.avisos)) {
        setAvisos(avs.avisos.filter((a: { ativo?: boolean }) => a.ativo !== false).length);
      } else if (!avs.ok) {
        setErroApi((prev) => prev ?? (typeof avs.erro === 'string' ? avs.erro : null));
      }
      setLoading(false);
    });
  }, []);

  const ativos = colaboradores.filter((c) => c.onboarding_completo);
  const pendentes = colaboradores.filter((c) => !c.onboarding_completo);

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Dashboard Admin
      </h1>
      {erroApi && (
        <div
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          <strong className="font-semibold">Atenção:</strong> {erroApi} Verifique se o banco está
          configurado e a variável de ambiente do Supabase está correta.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm">
          <p className="text-coffee-100 text-sm">Colaboradores</p>
          <p className="text-2xl font-display font-semibold text-coffee-base">
            {loading ? '…' : colaboradores.length}
          </p>
        </div>
        <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm">
          <p className="text-coffee-100 text-sm">Avisos ativos</p>
          <p className="text-2xl font-display font-semibold text-coffee-base">{loading ? '…' : avisos}</p>
        </div>
        <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm">
          <p className="text-coffee-100 text-sm">Onboarding pendente</p>
          <p className="text-2xl font-display font-semibold text-dourado-500">
            {loading ? '…' : pendentes.length}
          </p>
        </div>
      </div>

      {!loading && !erroApi && colaboradores.length === 0 && (
        <div className="mt-6 rounded-xl border border-dourado-200 bg-white p-6 shadow-sm">
          <h2 className="font-display font-semibold text-coffee-base mb-2">Colaboradores</h2>
          <p className="text-sm text-coffee-100 mb-4">
            Ainda não há colaboradores cadastrados. Comece pelo cadastro para convidar a equipe ao portal.
          </p>
          <Link
            href="/admin/colaboradores"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-dourado-base px-4 py-2 text-sm font-medium text-cream-100 hover:bg-dourado-400"
          >
            Cadastrar colaborador
          </Link>
        </div>
      )}
      {!loading && colaboradores.length > 0 && (
        <div className="mt-6 rounded-xl border border-dourado-200 bg-white p-6 shadow-sm">
          <h2 className="font-display font-semibold text-coffee-base mb-3">Colaboradores cadastrados</h2>
          <div className="space-y-2 text-sm">
            {ativos.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Ativo" />
                <span className="text-coffee-base">{c.nome}</span>
                <span className="text-green-600">• ativo</span>
              </div>
            ))}
            {pendentes.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Pendente" />
                <span className="text-coffee-base">{c.nome}</span>
                <span className="text-amber-600">• pendente</span>
              </div>
            ))}
          </div>
          <p className="mt-3">
            <Link href="/admin/colaboradores" className="text-dourado-500 hover:underline text-sm">
              Ver todos →
            </Link>
          </p>
        </div>
      )}
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
          <li>
            <a href="/admin/avaliacoes-diarias" className="text-dourado-500 hover:underline">
              Relatório de avaliações diárias
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
