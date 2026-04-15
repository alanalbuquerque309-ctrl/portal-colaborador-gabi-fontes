'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type LinhaDiaria = {
  id: string;
  data_referencia: string;
  assiduidade: string;
  media_dia: number | null;
  colaborador_nome: string | null;
  avaliador_nome: string | null;
};

type LinhaLider = {
  id: string;
  filial_nome: string;
  semana_inicio: string;
  created_at: string;
  avaliado_nome: string;
  avaliador_label: string;
  n_fala_escuta: number;
  n_apoio: number;
  n_ambiente: number;
  n_organizacao: number;
  media: number;
};

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
  diarias: LinhaDiaria[];
  lideranca: LinhaLider[];
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
    fetch('/api/portal/perfil', { credentials: 'include' })
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
            fetch(`/api/admin/avaliacoes-diarias?${qD}`, { credentials: 'include' }),
            fetch(`/api/portal/avaliacao-lideranca/relatorio?${qL}`, { credentials: 'include' }),
          ]);

          const dataD = await resD.json();
          const dataL = await resL.json();

          if (dataD.ok && Array.isArray(dataD.linhas)) {
            novos[i].diarias = dataD.linhas as LinhaDiaria[];
          } else {
            novos[i].erro = dataD.erro || 'Erro nas avaliações diárias.';
          }
          if (dataL.ok && Array.isArray(dataL.itens)) {
            novos[i].lideranca = dataL.itens as LinhaLider[];
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
          Visão exclusiva para <strong>sócios</strong>: em cada filial, <strong>o que os gerentes registram
          sobre a equipe</strong> (avaliações diárias dos comandados) e{' '}
          <strong>o que os colaboradores avaliam da liderança</strong> (gerência, administrativo e RH), na
          seção de liderança.
        </p>
        <p className="text-xs text-cafeteria-500 mt-2">
          Administradores continuam com o painel <Link href="/admin" className="underline hover:text-cafeteria-700">/admin</Link>{' '}
          (avaliações diárias e demais ferramentas); este consolidado no portal é só para perfil de sócio.
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
                {b.diarias.length} diárias · {b.lideranca.length} liderança
              </span>
            </summary>
            <div className="p-4 space-y-8">
              {b.erro && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{b.erro}</p>}

              <section>
                <h3 className="text-sm font-semibold text-dourado-700 uppercase tracking-wide mb-2">
                  Avaliações da equipe (diárias)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-cafeteria-100">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-cafeteria-50 text-cafeteria-800">
                      <tr>
                        <th className="px-2 py-2">Data</th>
                        <th className="px-2 py-2">Colaborador</th>
                        <th className="px-2 py-2">Avaliador</th>
                        <th className="px-2 py-2">Assiduidade</th>
                        <th className="px-2 py-2">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.diarias.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-2 py-6 text-cafeteria-500 text-center">
                            Nenhum registro no período.
                          </td>
                        </tr>
                      ) : (
                        b.diarias.map((l) => (
                          <tr key={l.id} className="border-t border-cafeteria-100">
                            <td className="px-2 py-2 whitespace-nowrap">{l.data_referencia}</td>
                            <td className="px-2 py-2">{l.colaborador_nome ?? '—'}</td>
                            <td className="px-2 py-2">{l.avaliador_nome ?? '—'}</td>
                            <td className="px-2 py-2 text-cafeteria-600">{l.assiduidade}</td>
                            <td className="px-2 py-2">
                              {l.media_dia != null ? Number(l.media_dia).toFixed(2) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-dourado-700 uppercase tracking-wide mb-2">
                  Avaliação da liderança
                </h3>
                <div className="overflow-x-auto rounded-lg border border-cafeteria-100">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-cafeteria-50 text-cafeteria-800">
                      <tr>
                        <th className="px-2 py-2">Semana</th>
                        <th className="px-2 py-2">Avaliado</th>
                        <th className="px-2 py-2">Quem avaliou</th>
                        <th className="px-2 py-2 text-center">Média</th>
                        <th className="px-2 py-2 text-center">Fala</th>
                        <th className="px-2 py-2 text-center">Apoio</th>
                        <th className="px-2 py-2 text-center">Ambiente</th>
                        <th className="px-2 py-2 text-center">Organiz.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.lideranca.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-2 py-6 text-cafeteria-500 text-center">
                            Nenhum registro no período.
                          </td>
                        </tr>
                      ) : (
                        b.lideranca.map((row) => (
                          <tr key={row.id} className="border-t border-cafeteria-100">
                            <td className="px-2 py-2 whitespace-nowrap">{row.semana_inicio}</td>
                            <td className="px-2 py-2">{row.avaliado_nome}</td>
                            <td className="px-2 py-2 text-cafeteria-600">{row.avaliador_label}</td>
                            <td className="px-2 py-2 text-center font-medium">{row.media.toFixed(2)}</td>
                            <td className="px-2 py-2 text-center">{row.n_fala_escuta}</td>
                            <td className="px-2 py-2 text-center">{row.n_apoio}</td>
                            <td className="px-2 py-2 text-center">{row.n_ambiente}</td>
                            <td className="px-2 py-2 text-center">{row.n_organizacao}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
