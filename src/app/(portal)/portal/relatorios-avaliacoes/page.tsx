'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import {
  podeVerRelatoriosAvaliacoesCompletos,
} from '@/lib/avaliacoes-relatorio-access';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import {
  RelatorioLiderancaPorLider,
  type LinhaDiariaRelatorio,
  type LinhaLiderRelatorio,
} from '@/components/portal/RelatorioAvaliacoesPorSetor';
import {
  RelatorioEquipePorPessoa,
  type FiltroOrigemEquipe,
} from '@/components/portal/RelatorioEquipePorPessoa';
import { RelatorioEquipePorSemana } from '@/components/portal/RelatorioEquipePorSemana';
import { AlertaPendenciasVisitaRh } from '@/components/portal/AlertaPendenciasVisitaRh';
import { calcularPendenciasVisitaRh } from '@/lib/relatorio-equipe-utils';
import { AvaliacoesPendentesModal } from '@/components/admin/AvaliacoesPendentesModal';

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inicioMesISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type AbaRelatorio = 'equipe' | 'lideranca';
type ModoEquipe = 'pessoa' | 'semana';

export default function RelatoriosAvaliacoesPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [aba, setAba] = useState<AbaRelatorio>('equipe');
  const [inicio, setInicio] = useState(inicioMesISO);
  const [fim, setFim] = useState(hojeISO);
  const [carregando, setCarregando] = useState(false);
  const [equipeLinhas, setEquipeLinhas] = useState<LinhaDiariaRelatorio[]>([]);
  const [equipeErro, setEquipeErro] = useState('');
  const [liderancaGlobal, setLiderancaGlobal] = useState<LinhaLiderRelatorio[]>([]);
  const [notaLider, setNotaLider] = useState('');
  const [auditoriaSocioLider, setAuditoriaSocioLider] = useState(false);
  const [viewerRoleLider, setViewerRoleLider] = useState('');
  const [erroLideranca, setErroLideranca] = useState('');
  const [filtroFilial, setFiltroFilial] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigemEquipe>('todos');
  const [busca, setBusca] = useState('');
  const [buscaLider, setBuscaLider] = useState('');
  const [somenteNotaBaixaLider, setSomenteNotaBaixaLider] = useState(false);
  const [modoEquipe, setModoEquipe] = useState<ModoEquipe>('semana');
  const [pendentesAberto, setPendentesAberto] = useState(false);

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
    setEquipeErro('');
    setErroLideranca('');
    setNotaLider('');

    try {
      const qEquipe = new URLSearchParams({ inicio, fim, limite: '3000' });
      const qLider = new URLSearchParams({ inicio, fim, limite: '3000', _: String(Date.now()) });

      const [resEquipe, resLider] = await Promise.all([
        fetch(`/api/portal/relatorios-avaliacoes-diarias?${qEquipe}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`/api/portal/avaliacao-lideranca/relatorio?${qLider}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        }),
      ]);

      const dataEquipe = await resEquipe.json();
      const dataLider = await resLider.json();

      if (dataEquipe.ok && Array.isArray(dataEquipe.linhas)) {
        setEquipeLinhas(dataEquipe.linhas as LinhaDiariaRelatorio[]);
      } else {
        setEquipeLinhas([]);
        setEquipeErro(dataEquipe.erro || 'Erro ao carregar avaliações da equipe.');
      }

      if (dataLider.ok && Array.isArray(dataLider.itens)) {
        setLiderancaGlobal(dataLider.itens as LinhaLiderRelatorio[]);
        if (dataLider.nota) setNotaLider(String(dataLider.nota));
        setAuditoriaSocioLider(dataLider.auditoria_socio === true);
        setViewerRoleLider(String(dataLider.viewer_role ?? ''));
      } else {
        setLiderancaGlobal([]);
        setAuditoriaSocioLider(false);
        setViewerRoleLider('');
        setErroLideranca(dataLider.erro || 'Erro ao carregar feedback sobre liderança.');
      }
    } catch {
      setEquipeLinhas([]);
      setEquipeErro('Erro de conexão.');
      setLiderancaGlobal([]);
      setErroLideranca('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim]);

  useEffect(() => {
    if (autorizado !== true) return;
    void carregar();
  }, [autorizado, inicio, fim, carregar]);

  const linhasEquipeFiltradas = useMemo(() => {
    if (!filtroFilial) return equipeLinhas;
    return equipeLinhas.filter((l) => l.colaborador_unidade_slug === filtroFilial);
  }, [equipeLinhas, filtroFilial]);

  const resumoEquipe = useMemo(() => {
    const rh = linhasEquipeFiltradas.filter((l) => l.origem_visita_rh).length;
    const gerente = linhasEquipeFiltradas.length - rh;
    const pessoas = new Set(linhasEquipeFiltradas.map((l) => l.colaborador_nome)).size;
    return { total: linhasEquipeFiltradas.length, gerente, rh, pessoas };
  }, [linhasEquipeFiltradas]);

  const pendenciasRh = useMemo(
    () => calcularPendenciasVisitaRh(linhasEquipeFiltradas),
    [linhasEquipeFiltradas]
  );

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
    <main className="max-w-3xl space-y-6 pb-24">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Relatórios de avaliações
        </h1>
        <p className="text-cafeteria-600 mt-2 text-sm">
          Por semana ou por pessoa: gerente e Visita RH lado a lado. Alerta quando falta visita
          complementar.
        </p>
      </div>

      <div className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
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
          <button
            type="button"
            onClick={() => setPendentesAberto(true)}
            className="rounded-lg border border-dourado-base px-4 py-2 text-sm font-medium text-cafeteria-800 hover:bg-dourado-50"
          >
            Pendentes da semana
          </button>
        </div>

        <div className="flex rounded-lg border border-cafeteria-200 text-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setAba('equipe')}
            className={`flex-1 px-4 py-2 font-medium ${
              aba === 'equipe' ? 'bg-dourado-base text-cream-100' : 'bg-white text-cafeteria-700'
            }`}
          >
            Equipe semanal
          </button>
          <button
            type="button"
            onClick={() => setAba('lideranca')}
            className={`flex-1 px-4 py-2 font-medium ${
              aba === 'lideranca' ? 'bg-dourado-base text-cream-100' : 'bg-white text-cafeteria-700'
            }`}
          >
            Liderança
          </button>
        </div>
      </div>

      {aba === 'equipe' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-lg border border-cafeteria-200 bg-cream-50/80 px-3 py-2">
              <p className="text-[10px] uppercase text-cafeteria-500">Pessoas</p>
              <p className="text-lg font-semibold text-cafeteria-900">{resumoEquipe.pessoas}</p>
            </div>
            <div className="rounded-lg border border-cafeteria-200 bg-cream-50/80 px-3 py-2">
              <p className="text-[10px] uppercase text-cafeteria-500">Registros</p>
              <p className="text-lg font-semibold text-cafeteria-900">{resumoEquipe.total}</p>
            </div>
            <div className="rounded-lg border border-dourado-200/60 bg-cream-50/80 px-3 py-2">
              <p className="text-[10px] uppercase text-dourado-700">Gerente</p>
              <p className="text-lg font-semibold text-cafeteria-900">{resumoEquipe.gerente}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2">
              <p className="text-[10px] uppercase text-sky-800">Visita RH</p>
              <p className="text-lg font-semibold text-cafeteria-900">{resumoEquipe.rh}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filtroFilial}
              onChange={(e) => setFiltroFilial(e.target.value)}
              className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">Todas filiais</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value as FiltroOrigemEquipe)}
              className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="todos">Gerente + RH</option>
              <option value="gerente">Só gerente</option>
              <option value="rh">Só Visita RH</option>
            </select>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome…"
              className="flex-1 min-w-[140px] rounded-lg border border-cafeteria-200 px-3 py-2 text-sm"
            />
            <div className="flex rounded-lg border border-cafeteria-200 text-xs overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setModoEquipe('semana')}
                className={`px-3 py-2 font-medium ${
                  modoEquipe === 'semana'
                    ? 'bg-cafeteria-800 text-cream-100'
                    : 'bg-white text-cafeteria-700'
                }`}
              >
                Por semana
              </button>
              <button
                type="button"
                onClick={() => setModoEquipe('pessoa')}
                className={`px-3 py-2 font-medium ${
                  modoEquipe === 'pessoa'
                    ? 'bg-cafeteria-800 text-cream-100'
                    : 'bg-white text-cafeteria-700'
                }`}
              >
                Por pessoa
              </button>
            </div>
          </div>

          <AlertaPendenciasVisitaRh pendencias={pendenciasRh} />

          {equipeErro && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{equipeErro}</p>
          )}

          {carregando && equipeLinhas.length === 0 ? (
            <XicaraCarregando size="md" label="Carregando equipe…" />
          ) : modoEquipe === 'semana' ? (
            <RelatorioEquipePorSemana
              linhas={linhasEquipeFiltradas}
              filtroOrigem={filtroOrigem}
              busca={busca}
            />
          ) : (
            <RelatorioEquipePorPessoa
              linhas={linhasEquipeFiltradas}
              filtroOrigem={filtroOrigem}
              busca={busca}
            />
          )}
        </>
      )}

      {aba === 'lideranca' && (
        <section className="rounded-xl border border-cafeteria-200 bg-white shadow-sm p-4 space-y-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-cafeteria-900">
              Feedback sobre liderança
            </h2>
          <p className="text-xs sm:text-sm text-cafeteria-500 mt-1">
              Toque no líder para ver cada semana. Notas ≤3 aparecem em destaque; o pilar mais fraco fica
              indicado no card.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={buscaLider}
              onChange={(e) => setBuscaLider(e.target.value)}
              placeholder="Buscar líder por nome…"
              className="flex-1 min-w-[160px] rounded-lg border border-cafeteria-200 px-3 py-2.5 text-base text-cafeteria-900"
            />
            <button
              type="button"
              onClick={() => setSomenteNotaBaixaLider((v) => !v)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium min-h-[44px] ${
                somenteNotaBaixaLider
                  ? 'border-amber-500 bg-amber-50 text-amber-950'
                  : 'border-cafeteria-200 text-cafeteria-700 hover:bg-cafeteria-50'
              }`}
            >
              {somenteNotaBaixaLider ? 'Só notas baixas ✓' : 'Só notas baixas (≤3)'}
            </button>
          </div>

          {notaLider && (
            <p
              className={`text-sm rounded-lg px-3 py-2 ${
                auditoriaSocioLider
                  ? 'text-amber-950 bg-amber-50 border border-amber-200'
                  : 'text-cafeteria-600'
              }`}
            >
              {notaLider}
            </p>
          )}
          {!auditoriaSocioLider && liderancaGlobal.length > 0 && viewerRoleLider && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Identificação dos avaliadores desligada para o perfil «{viewerRoleLider}». Só sócios veem quem
              avaliou. Se você é sócio, saia e entre de novo; se persistir, avise o suporte.
            </p>
          )}
          {erroLideranca && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{erroLideranca}</p>
          )}
          {carregando && liderancaGlobal.length === 0 ? (
            <XicaraCarregando size="md" label="Carregando…" />
          ) : (
            <RelatorioLiderancaPorLider
              linhas={liderancaGlobal}
              busca={buscaLider}
              somenteNotaBaixa={somenteNotaBaixaLider}
            />
          )}
        </section>
      )}
      <AvaliacoesPendentesModal
        aberto={pendentesAberto}
        onFechar={() => setPendentesAberto(false)}
        apiBase="/api/portal/avaliacoes-pendentes"
      />
    </main>
  );
}
