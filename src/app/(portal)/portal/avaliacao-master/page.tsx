'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { ColaboradorAvaliacaoCard, type AvaliacaoServidor } from '@/components/portal/avaliacao-master/ColaboradorAvaliacaoCard';

function isRoleGerenteAvaliadorPortal(role: string | null | undefined): boolean {
  const r = (role || '').trim().toLowerCase();
  return r === 'gerente' || r === 'master';
}

function dataLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type MembroEquipe = {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  avaliacao: AvaliacaoServidor;
};

export default function AvaliacaoMasterPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getPortalSession>>(null);
  const [dataRef, setDataRef] = useState(dataLocalISO);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const autorizado =
    !!session?.colaboradorId &&
    session.colaboradorId !== 'pending' &&
    isRoleGerenteAvaliadorPortal(session.role);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    if (!isRoleGerenteAvaliadorPortal(s.role)) {
      router.replace('/portal');
      return;
    }
    setSession(s);
  }, [router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/avaliacao-master?data=${encodeURIComponent(dataRef)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.status === 403 || res.status === 401) {
        router.replace('/portal');
        return;
      }
      if (!data.ok) {
        setErro(data.erro || 'Erro ao carregar.');
        setEquipe([]);
        return;
      }
      setEquipe(data.equipe ?? []);
    } catch {
      setErro('Erro de conexão.');
      setEquipe([]);
    } finally {
      setCarregando(false);
    }
  }, [dataRef, router]);

  useEffect(() => {
    if (!autorizado) return;
    carregar();
  }, [autorizado, carregar]);

  if (!session || !autorizado) {
    return <p className="text-cafeteria-700 text-center py-12">Carregando…</p>;
  }

  return (
    <main className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Avaliação da equipe
        </h1>
        <p className="text-cafeteria-600 mt-1 text-sm md:text-base max-w-2xl">
          Avaliação diária dos colaboradores com você como <strong>líder direto</strong>. No painel admin,
          defina o líder em cada perfil (mesma unidade). Após o envio, a avaliação fica só leitura.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="data-avaliacao" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Data da avaliação
          </label>
          <input
            id="data-avaliacao"
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-cafeteria-900 focus:border-dourado-base focus:outline-none focus:ring-1 focus:ring-dourado-base"
          />
        </div>
        <button
          type="button"
          onClick={() => carregar()}
          className="rounded-lg border border-cafeteria-300 px-4 py-2 text-sm font-medium text-cafeteria-800 hover:bg-cafeteria-50"
        >
          Atualizar lista
        </button>
      </div>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-cafeteria-600">Carregando equipe…</p>
      ) : equipe.length === 0 ? (
        <div className="rounded-xl border border-dourado-base/40 bg-dourado-50/50 p-6 text-cafeteria-800">
          <p className="font-medium">Nenhum colaborador na sua equipe</p>
          <p className="text-sm mt-2 text-cafeteria-700">
            Peça ao administrador para definir o campo <strong>Líder direto</strong> nos perfis que você
            avalia (mesma unidade). O seu usuário precisa ter função <strong>Gerente</strong>.
          </p>
        </div>
      ) : (
        <ul className="space-y-6 list-none p-0 m-0">
          {equipe.map((m) => (
            <li key={m.id}>
              <ColaboradorAvaliacaoCard
                colaboradorId={m.id}
                nome={m.nome}
                cargo={m.cargo}
                setor={m.setor}
                dataReferencia={dataRef}
                avaliacaoInicial={m.avaliacao}
                onSalvo={carregar}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
