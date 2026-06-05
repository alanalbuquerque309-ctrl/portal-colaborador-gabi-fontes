'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ColaboradorAvaliacaoCard,
  type AvaliacaoServidor,
} from '@/components/portal/avaliacao-master/ColaboradorAvaliacaoCard';
import { SETORES_PREDEFINIDOS, UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { formatarIntervaloSemanaPtBR, inicioSemanaSegundaFeiraLocal, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';
import { AvaliacaoSemanalChecklist } from '@/components/portal/AvaliacaoSemanalChecklist';

type MembroRede = {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  unidade_nome: string | null;
  unidade_slug: string | null;
  onboarding_completo?: boolean;
  operacao_apto?: boolean;
  avaliacao: AvaliacaoServidor;
  outras_avaliacoes_semana?: number;
};

export default function AvaliacaoRhVisitaPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [dataRef, setDataRef] = useState(semanaAvaliacaoEquipePadraoISO);
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [setor, setSetor] = useState('');
  const [busca, setBusca] = useState('');
  const [equipe, setEquipe] = useState<MembroRede[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroPendentes, setFiltroPendentes] = useState(false);

  const intervaloSemana = formatarIntervaloSemanaPtBR(dataRef);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; pode_visita_rh?: boolean }) => {
        if (cancel) return;
        setAutorizado(!!(d.ok && d.pode_visita_rh));
      })
      .catch(() => setAutorizado(false));
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (autorizado === false) router.replace('/portal');
  }, [autorizado, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pendentes') === '1') setFiltroPendentes(true);
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = new URLSearchParams({ data: dataRef });
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      if (setor) q.set('setor', setor);
      if (busca.trim()) q.set('q', busca.trim());
      const res = await fetch(`/api/portal/avaliacao-rh-visita?${q}`, { credentials: 'include' });
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
  }, [dataRef, unidadeSlug, setor, busca, router]);

  useEffect(() => {
    if (autorizado !== true) return;
    void carregar();
  }, [autorizado, carregar]);

  const pendentes = useMemo(() => equipe.filter((m) => !m.avaliacao).length, [equipe]);

  if (autorizado === null) {
    return <p className="text-cafeteria-700 text-center py-12">Verificando acesso…</p>;
  }
  if (!autorizado) return null;

  return (
    <main className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Visita RH — avaliação da rede
        </h1>
        <p className="text-cafeteria-600 mt-1 text-sm md:text-base max-w-3xl">
          Avaliação <strong>complementar</strong> à do gerente da loja/setor. Você registra sua visita
          semana a semana; a liderança local pode avaliar a mesma pessoa na mesma semana de forma
          independente. Inclui colaboradores e gerentes (exceto sócios e seu chefe direto).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label htmlFor="data-rh" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Semana
          </label>
          <input
            id="data-rh"
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(inicioSemanaSegundaFeiraLocal(e.target.value))}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-cafeteria-900"
          />
          <p className="text-xs text-cafeteria-500 mt-1">{intervaloSemana}</p>
        </div>
        <div>
          <label htmlFor="filial-rh" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Filial
          </label>
          <select
            id="filial-rh"
            value={unidadeSlug}
            onChange={(e) => setUnidadeSlug(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm min-w-[140px]"
          >
            <option value="">Todas</option>
            {UNIDADES_CADASTRO.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="setor-rh" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Setor
          </label>
          <select
            id="setor-rh"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">Todos</option>
            {SETORES_PREDEFINIDOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="busca-rh" className="block text-sm font-medium text-cafeteria-800 mb-1">
            Nome
          </label>
          <input
            id="busca-rh"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar…"
            className="w-full rounded-lg border border-cafeteria-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 text-sm font-medium hover:bg-dourado-400"
        >
          Atualizar
        </button>
      </div>

      {!carregando && equipe.length > 0 && (
        <AvaliacaoSemanalChecklist
          titulo="Suas visitas na semana"
          itens={equipe.map((m) => ({
            id: m.id,
            nome: m.nome,
            concluido: m.avaliacao != null,
            subtitulo: [m.unidade_nome, m.setor, m.cargo].filter(Boolean).join(' · ') || undefined,
          }))}
          filtroPendentes={filtroPendentes}
          onToggleFiltro={() => setFiltroPendentes((v) => !v)}
          onIrPara={(id) => {
            document.getElementById(`visita-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {pendentes > 0 && !carregando && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {pendentes} visita{pendentes === 1 ? '' : 's'} RH pendente{pendentes === 1 ? '' : 's'} nesta lista.
        </p>
      )}

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-cafeteria-600">Carregando rede…</p>
      ) : equipe.length === 0 ? (
        <div className="rounded-xl border border-cafeteria-200 bg-cream-50 p-6 text-cafeteria-800">
          Nenhuma pessoa no filtro. Ajuste filial, setor ou nome.
        </div>
      ) : (
        <ul className="space-y-6 list-none p-0 m-0">
          {(filtroPendentes ? equipe.filter((m) => !m.avaliacao) : equipe).map((m) => (
            <li key={m.id} id={`visita-${m.id}`}>
              {!!m.outras_avaliacoes_semana && m.outras_avaliacoes_semana > 0 && !m.avaliacao && (
                <p className="text-xs text-cafeteria-600 mb-2 px-1">
                  Já existe avaliação de liderança nesta semana ({m.outras_avaliacoes_semana}). Sua visita
                  RH é independente.
                </p>
              )}
              <ColaboradorAvaliacaoCard
                colaboradorId={m.id}
                nome={m.nome}
                cargo={m.cargo}
                setor={[m.unidade_nome, m.setor].filter(Boolean).join(' · ') || m.setor}
                dataReferencia={dataRef}
                avaliacaoInicial={m.avaliacao}
                onboardingCompleto={m.onboarding_completo !== false}
                operacaoApto={m.operacao_apto === true}
                onSalvo={carregar}
                postUrl="/api/portal/avaliacao-rh-visita"
                rotuloSalvar="Salvar visita RH"
                mostrarForaPlantao={false}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
