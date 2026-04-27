'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { ColaboradorAvaliacaoCard, type AvaliacaoServidor } from '@/components/portal/avaliacao-master/ColaboradorAvaliacaoCard';
import { normalizePortalRole } from '@/lib/roles';

function isRoleGerenteAvaliadorPortal(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'admin';
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
  const avaliadosNoDia = equipe.filter((m) => m.avaliacao != null).length;
  const pendentesNoDia = Math.max(0, equipe.length - avaliadosNoDia);

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
          Avaliação diária dos colaboradores vinculados ao seu usuário como liderança. Cada colaborador recebe
          no máximo uma avaliação por data.
        </p>
        <p className="mt-2 text-xs rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-amber-800 max-w-2xl">
          Aviso interno da liderança: esta avaliação da equipe é obrigatória.
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

      {!carregando && equipe.length > 0 && (
        <section className="rounded-xl border border-cafeteria-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg text-cafeteria-900">Checklist do dia</h2>
            <p className="text-sm text-cafeteria-700">
              <strong>{avaliadosNoDia}</strong> de <strong>{equipe.length}</strong> avaliados
              {pendentesNoDia > 0 ? ` · ${pendentesNoDia} pendente(s)` : ' · tudo concluído'}
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {equipe.map((m) => {
              const concluido = m.avaliacao != null;
              return (
                <li key={`check-${m.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`membro-${m.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                      concluido
                        ? 'border-green-200 bg-green-50 text-green-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <span className="font-medium">{concluido ? '✅' : '⬜'} {m.nome}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-cafeteria-600">Carregando equipe…</p>
      ) : equipe.length === 0 ? (
        <div className="rounded-xl border border-dourado-base/40 bg-dourado-50/50 p-6 text-cafeteria-800">
          <p className="font-medium">Nenhum colaborador na sua equipe</p>
          <p className="text-sm mt-2 text-cafeteria-700">
            Peça ao administrador para definir o campo <strong>Líderes diretos</strong> nos perfis que você
            avalia (mesma unidade). Seu usuário precisa ter função <strong>Gerente</strong>, <strong>Master</strong> ou <strong>Administrador</strong>.
          </p>
        </div>
      ) : (
        <ul className="space-y-6 list-none p-0 m-0">
          {equipe.map((m) => (
            <li key={m.id} id={`membro-${m.id}`}>
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
