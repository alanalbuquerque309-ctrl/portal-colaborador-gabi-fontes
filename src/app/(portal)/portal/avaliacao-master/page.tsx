'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { ColaboradorAvaliacaoCard, type AvaliacaoServidor } from '@/components/portal/avaliacao-master/ColaboradorAvaliacaoCard';
import { normalizePortalRole } from '@/lib/roles';
import { formatarIntervaloSemanaPtBR, hojeInicioSemanaISO, inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';
import { AvaliacaoSemanalChecklist } from '@/components/portal/AvaliacaoSemanalChecklist';

function isRoleGerenteAvaliadorPortal(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'admin';
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
  const [dataRef, setDataRef] = useState(hojeInicioSemanaISO);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroPendentes, setFiltroPendentes] = useState(false);

  const autorizado =
    !!session?.colaboradorId &&
    session.colaboradorId !== 'pending' &&
    isRoleGerenteAvaliadorPortal(session.role);
  const avaliadosNaSemana = equipe.filter((m) => m.avaliacao != null).length;
  const pendentesNaSemana = Math.max(0, equipe.length - avaliadosNaSemana);
  const intervaloSemana = formatarIntervaloSemanaPtBR(dataRef);

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
          Avaliação <strong>semanal</strong> dos colaboradores vinculados ao seu usuário como liderança. Cada
          colaborador recebe no máximo uma avaliação por semana civil (semana que começa na segunda-feira da data
          escolhida).
        </p>
        <p className="mt-2 text-xs rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-amber-800 max-w-2xl">
          Aviso interno da liderança: esta avaliação da equipe é obrigatória.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="data-avaliacao" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Semana (qualquer dia — usamos a segunda-feira da semana)
          </label>
          <input
            id="data-avaliacao"
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(inicioSemanaSegundaFeiraLocal(e.target.value))}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-cafeteria-900 focus:border-dourado-base focus:outline-none focus:ring-1 focus:ring-dourado-base"
          />
          <p className="text-xs text-cafeteria-500 mt-1">Semana selecionada: {intervaloSemana}</p>
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
        <AvaliacaoSemanalChecklist
          titulo="Checklist da semana"
          itens={equipe.map((m) => ({
            id: m.id,
            nome: m.nome,
            concluido: m.avaliacao != null,
            subtitulo: [m.cargo, m.setor].filter(Boolean).join(' · ') || undefined,
          }))}
          filtroPendentes={filtroPendentes}
          onToggleFiltro={() => setFiltroPendentes((v) => !v)}
          onIrPara={(id) => {
            document.getElementById(`membro-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
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
          {(filtroPendentes ? equipe.filter((m) => !m.avaliacao) : equipe).map((m) => (
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
