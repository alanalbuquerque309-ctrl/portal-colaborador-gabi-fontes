'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import {
  RelatorioDiariasPorSetor,
  RelatorioLiderancaPorSetor,
  type LinhaDiariaRelatorio,
  type LinhaLiderRelatorio,
} from '@/components/portal/RelatorioAvaliacoesPorSetor';

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inicioMesISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type BlocoFilial = {
  slug: string;
  label: string;
  diarias: LinhaDiariaRelatorio[];
  lideranca: LinhaLiderRelatorio[];
  erro?: string;
};

export default function RelatoriosAvaliacoesPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [inicio, setInicio] = useState(inicioMesISO);
  const [fim, setFim] = useState(hojeISO);
  const [carregando, setCarregando] = useState(false);
  const [blocos, setBlocos] = useState<BlocoFilial[]>([]);
  const [notaLider, setNotaLider] = useState('');

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { role?: string | null } }) => {
        if (cancel) return;
        const role = data.colaborador?.role ?? '';
        if (data.ok && podeVerRelatoriosAvaliacoesCompletos(role)) {
          setAutorizado(true);
        } else {
          setAutorizado(false);
        }
      })
      .catch(() => setAutorizado(false));
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (autorizado === false) {
      router.replace('/portal');
    }
  }, [autorizado, router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setNotaLider('');
    const novos: BlocoFilial[] = UNIDADES_CADASTRO.map((u) => ({
      slug: u.slug,
      label: u.label,
      diarias: [],
      lideranca: [],
    }));

    try {
      await Promise.all(
        novos.map(async (b, i) => {
          const qD = new URLSearchParams({ inicio, fim, limite: '2000', unidade_slug: b.slug });
          const qL = new URLSearchParams({ unidade_slug: b.slug, inicio, fim });

          const [resD, resL] = await Promise.all([
            fetch(`/api/portal/relatorios-avaliacoes-diarias?${qD}`, {
              credentials: 'include',
              cache: 'no-store',
            }),
            fetch(`/api/portal/avaliacao-lideranca/relatorio?${qL}`, {
              credentials: 'include',
              cache: 'no-store',
            }),
          ]);

          const dataD = await resD.json();
          const dataL = await resL.json();

          if (dataD.ok && Array.isArray(dataD.linhas)) {
            novos[i].diarias = dataD.linhas as LinhaDiariaRelatorio[];
          } else {
            novos[i].erro = dataD.erro || 'Erro nas avaliações da equipe.';
          }
          if (dataL.ok && Array.isArray(dataL.itens)) {
            novos[i].lideranca = dataL.itens as LinhaLiderRelatorio[];
            if (dataL.nota && i === 0) setNotaLider(String(dataL.nota));
          } else if (!dataL.ok) {
            novos[i].erro = (novos[i].erro ? novos[i].erro + ' ' : '') + (dataL.erro || 'Erro na liderança.');
          }
        })
      );
      setBlocos([...novos]);
    } catch {
      setBlocos(
        UNIDADES_CADASTRO.map((u) => ({
          slug: u.slug,
          label: u.label,
          diarias: [],
          lideranca: [],
          erro: 'Erro de conexão.',
        }))
      );
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim]);

  useEffect(() => {
    if (autorizado !== true) return;
    void carregar();
  }, [autorizado, inicio, fim, carregar]);

  if (autorizado === null) {
    return (
      <div className="flex justify-center py-16">
        <XicaraCarregando size="lg" label="Verificando acesso…" />
      </div>
    );
  }

  if (!autorizado) {
    return null;
  }

  return (
    <main className="max-w-6xl space-y-8 pb-24">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Relatórios de avaliações por filial
        </h1>
        <p className="text-cafeteria-600 mt-2 text-sm max-w-3xl">
          Visão para <strong>sócio e administrativo</strong>: em cada filial, por <strong>setor</strong> e{' '}
          <strong>nome do colaborador</strong>, as avaliações semanais da equipe e o feedback sobre a
          liderança.
        </p>
        <p className="text-xs text-cafeteria-500 mt-1 max-w-3xl">
          No bloco de liderança, o campo &quot;Quem avaliou&quot; mostra o nome real apenas para o perfil de
          sócio e administrador; para os demais perfis autorizados continua anônimo.
        </p>
        <p className="text-xs text-cafeteria-500 mt-2">
          O painel <Link href="/admin" className="underline hover:text-cafeteria-700">/admin</Link> continua
          disponível para operação diária e ações administrativas.
        </p>
      </div>

      <div className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-cafeteria-800 mb-1">Início</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm text-cafeteria-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cafeteria-800 mb-1">Fim</label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm text-cafeteria-900"
          />
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
        >
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
        <Link
          href="/admin/avaliacoes-diarias"
          className="text-sm text-dourado-base hover:underline ml-auto"
        >
          Abrir também no painel admin →
        </Link>
      </div>

      {notaLider && <p className="text-sm text-cafeteria-600 max-w-3xl">{notaLider}</p>}

      <div className="space-y-4">
        {blocos.map((b) => (
          <details
            key={b.slug}
            className="group rounded-xl border border-cafeteria-200 bg-white shadow-sm open:shadow-md"
            open
          >
            <summary className="cursor-pointer list-none px-4 py-3 font-display text-lg font-semibold text-cafeteria-900 border-b border-cafeteria-100 flex items-center justify-between">
              <span>{b.label}</span>
              <span className="text-xs font-normal text-cafeteria-500">
                {b.diarias.length} semanais · {b.lideranca.length} liderança
              </span>
            </summary>
            <div className="p-4 space-y-8">
              {b.erro && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{b.erro}</p>}

              <section>
                <h3 className="text-sm font-semibold text-dourado-700 uppercase tracking-wide mb-4">
                  Avaliações da equipe (semanais)
                </h3>
                <RelatorioDiariasPorSetor linhas={b.diarias} />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-dourado-700 uppercase tracking-wide mb-4">
                  Avaliação da liderança
                </h3>
                <p className="text-xs text-cafeteria-500 mb-3">
                  Agrupado pelo setor de quem foi avaliado (gerência, administrativo, RH).
                </p>
                <RelatorioLiderancaPorSetor linhas={b.lideranca} />
              </section>
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
