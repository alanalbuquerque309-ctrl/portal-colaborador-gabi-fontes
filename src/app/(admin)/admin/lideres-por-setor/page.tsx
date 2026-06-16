'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO, SETORES_PREDEFINIDOS } from '@/lib/constants/colaborador-org';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import {
  agruparLinhasPorSetorExibicao,
  descricaoGerenciaUnidade,
  descricaoSetorAdmin,
  ehUnidadeFabrica,
  rotuloGerenciaUnidade,
  setoresExibicaoPorUnidade,
} from '@/lib/lideranca-org';
import { paridadeNoMes, rotuloParidade } from '@/lib/plantao-12x36';

type Linha = {
  id: string;
  unidade_id: string;
  unidade_nome: string;
  unidade_slug: string;
  setor: string;
  lider_id: string;
  lider_nome: string;
  ativo: boolean;
  plantao_paridade?: string | null;
  plantao_paridade_mes_ref?: string | null;
};

type UnidadeResumo = {
  slug: string;
  nome: string;
  unidade_id: string | null;
  total_lideres: number;
};

type Candidato = { id: string; nome: string; role: string; cargo: string | null; setor: string | null };

export default function LideresPorSetorPage() {
  const [podeEditarMapa, setPodeEditarMapa] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [unidadeSlug, setUnidadeSlug] = useState(UNIDADES_CADASTRO[0]?.slug ?? '');
  const [unidadesResumo, setUnidadesResumo] = useState<UnidadeResumo[]>([]);
  const [todasLinhas, setTodasLinhas] = useState<Linha[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [setorNovo, setSetorNovo] = useState<string>(SETORES_PREDEFINIDOS[0] ?? '');
  const [liderNovo, setLiderNovo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aplicandoPadrao, setAplicandoPadrao] = useState(false);
  const [resultadoPadrao, setResultadoPadrao] = useState<string | null>(null);
  const [tabelaExiste, setTabelaExiste] = useState<boolean | null>(null);
  const [sqlMigration, setSqlMigration] = useState<string | null>(null);
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [copiado042, setCopiado042] = useState(false);
  const [linhaSalvando, setLinhaSalvando] = useState<string | null>(null);

  const copiarSql042 = async () => {
    setCopiado042(false);
    try {
      const res = await fetch('/api/admin/lideres-por-setor/migration-sql?arquivo=042', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok || !data.sql) {
        setErro(data.erro || 'Não foi possível carregar o SQL da migration 042.');
        return;
      }
      await navigator.clipboard.writeText(String(data.sql));
      setCopiado042(true);
      setTimeout(() => setCopiado042(false), 4000);
    } catch {
      setErro('Não foi possível copiar. Abra supabase/migrations/042_plantao_12x36_paridade.sql.');
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/auth', { credentials: 'include' });
        const data = await res.json();
        if (data.ok) setPodeEditarMapa(data.pode_editar_lideranca_mapa === true);
      } catch {
        setPodeEditarMapa(false);
      }
    })();
  }, []);

  const unidadeAtiva = useMemo(
    () => unidadesResumo.find((u) => u.slug === unidadeSlug) ?? null,
    [unidadesResumo, unidadeSlug]
  );

  const linhas = useMemo(
    () => todasLinhas.filter((l) => l.unidade_slug === unidadeSlug || (!l.unidade_slug && l.ativo)),
    [todasLinhas, unidadeSlug]
  );

  const unidadeId = unidadeAtiva?.unidade_id ?? linhas[0]?.unidade_id ?? '';

  const verificarTabela = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/lideres-por-setor/status', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setTabelaExiste(data.tabela_existe === true);
      else setTabelaExiste(false);
    } catch {
      setTabelaExiste(false);
    }
  }, []);

  useEffect(() => {
    void verificarTabela();
  }, [verificarTabela]);

  const copiarSqlMigration = async () => {
    setCopiadoSql(false);
    try {
      let sql = sqlMigration;
      if (!sql) {
        const res = await fetch('/api/admin/lideres-por-setor/migration-sql', { credentials: 'include' });
        const data = await res.json();
        if (!data.ok || !data.sql) {
          setErro(data.erro || 'Não foi possível carregar o SQL da migration.');
          return;
        }
        sql = String(data.sql);
        setSqlMigration(sql);
      }
      await navigator.clipboard.writeText(sql);
      setCopiadoSql(true);
      setTimeout(() => setCopiadoSql(false), 4000);
    } catch {
      setErro('Não foi possível copiar. Abre supabase/migrations/032_lideres_por_setor.sql no projeto.');
    }
  };

  const carregarTodas = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setAviso(null);
    try {
      const res = await fetch('/api/admin/lideres-por-setor?todas=1', { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao listar.');
        setTodasLinhas([]);
        return;
      }
      const ativas = (data.linhas ?? []).filter((l: Linha) => l.ativo);
      setTodasLinhas(ativas);
      const resumo: UnidadeResumo[] = (data.unidades ?? []).map((u: UnidadeResumo) => ({
        slug: u.slug,
        nome: u.nome,
        unidade_id: u.unidade_id,
        total_lideres: u.total_lideres ?? 0,
      }));
      setUnidadesResumo(resumo);
      if (data.aviso) {
        setAviso(String(data.aviso));
        if (String(data.aviso).includes('032_lideres_por_setor')) setTabelaExiste(false);
      }
      if (!unidadeSlug && resumo[0]?.slug) setUnidadeSlug(resumo[0].slug);
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarTodas();
  }, [carregarTodas]);

  const carregarCandidatos = useCallback(async () => {
    if (!unidadeSlug) return;
    try {
      const q = new URLSearchParams({ unidade_slug: unidadeSlug });
      const res = await fetch(`/api/admin/lideres-por-setor/candidatos?${q}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setCandidatos(data.candidatos ?? []);
    } catch {
      /* mantém lista anterior */
    }
  }, [unidadeSlug]);

  useEffect(() => {
    if (modoEditar && podeEditarMapa) void carregarCandidatos();
  }, [modoEditar, podeEditarMapa, carregarCandidatos]);

  const adicionar = async () => {
    if (!liderNovo || !setorNovo || !unidadeSlug) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch('/api/admin/lideres-por-setor', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidade_slug: unidadeSlug,
          unidade_id: unidadeId || undefined,
          setor: setorNovo,
          lider_id: liderNovo,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível adicionar.');
        return;
      }
      setLiderNovo('');
      await carregarTodas();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const patchLinha = async (
    id: string,
    patch: { lider_id?: string; setor?: string; plantao_paridade?: string | null }
  ) => {
    setLinhaSalvando(id);
    setErro(null);
    try {
      const res = await fetch('/api/admin/lideres-por-setor', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível salvar.');
        return;
      }
      await carregarTodas();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLinhaSalvando(null);
    }
  };

  const remover = async (id: string) => {
    if (!window.confirm('Remover este líder do mapa? Os colaboradores do setor serão revinculados.')) return;
    setErro(null);
    try {
      const res = await fetch('/api/admin/lideres-por-setor', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível remover.');
        return;
      }
      await carregarTodas();
    } catch {
      setErro('Erro de conexão.');
    }
  };

  const aplicarPadraoOperacional = async () => {
    if (
      !window.confirm(
        'Aplicar o mapa de liderança (gerentes por unidade, Daniel em CD/Motorista/Administração/RH, etc.), desativar vínculos antigos fora do mapa e revincular colaboradores?'
      )
    ) {
      return;
    }
    setAplicandoPadrao(true);
    setErro(null);
    setResultadoPadrao(null);
    try {
      const res = await fetch('/api/admin/lideres-por-setor/aplicar-padrao', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível aplicar o padrão.');
        return;
      }
      const cfg = data.config ?? {};
      const vin = data.vinculos ?? {};
      const nao = (cfg.lideres_nao_encontrados ?? []) as string[];
      setResultadoPadrao(
        `Config: ${cfg.inseridos ?? 0} vínculos de setor; ${cfg.desativados_fora_mapa ?? 0} desativados fora do mapa. Colaboradores: ${vin.com_lider ?? 0} com líder(es) (${vin.processados ?? 0} processados).` +
          (nao.length ? ` Não encontrados: ${nao.join('; ')}` : '')
      );
      setTabelaExiste(true);
      await carregarTodas();
      await verificarTabela();
    } catch {
      setErro('Erro de conexão ao aplicar padrão.');
    } finally {
      setAplicandoPadrao(false);
    }
  };

  const lideresUnidadeToda = linhas.filter((l) => l.setor === SETOR_TODOS_NA_UNIDADE);
  const porSetorMap = useMemo(
    () => agruparLinhasPorSetorExibicao(linhas, unidadeSlug),
    [linhas, unidadeSlug]
  );
  const setoresFormulario = useMemo(
    () => setoresExibicaoPorUnidade(unidadeSlug),
    [unidadeSlug]
  );

  const editando = modoEditar && podeEditarMapa;
  const nomeUnidade =
    unidadeAtiva?.nome ??
    UNIDADES_CADASTRO.find((u) => u.slug === unidadeSlug)?.label ??
    unidadeSlug;

  const renderLinha = (l: Linha) => {
    const ehUnidadeToda = l.setor === SETOR_TODOS_NA_UNIDADE;
    const paridadeMes = paridadeNoMes(l.plantao_paridade, l.plantao_paridade_mes_ref);
    return (
      <li
        key={l.id}
        className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-cream-100 pb-2 last:border-0"
      >
        {editando ? (
          <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[200px]">
            <select
              value={l.lider_id}
              disabled={linhaSalvando === l.id}
              onChange={(e) => void patchLinha(l.id, { lider_id: e.target.value })}
              className="rounded-lg border border-cream-300 px-2 py-1 text-sm flex-1 min-w-[180px]"
            >
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.setor ? ` (${c.setor})` : ''}
                </option>
              ))}
              {!candidatos.some((c) => c.id === l.lider_id) && (
                <option value={l.lider_id}>{l.lider_nome || l.lider_id}</option>
              )}
            </select>
            {ehUnidadeToda && (
              <select
                value={l.plantao_paridade ?? ''}
                disabled={linhaSalvando === l.id}
                onChange={(e) => void patchLinha(l.id, { plantao_paridade: e.target.value })}
                className="rounded-lg border border-cream-300 px-2 py-1 text-sm"
                title="Plantão 12x36 desta função no mês base; inverte sozinho a cada mês"
              >
                <option value="">Plantão: —</option>
                <option value="impar">Plantão: dias ímpares</option>
                <option value="par">Plantão: dias pares</option>
              </select>
            )}
            {linhaSalvando === l.id && <span className="text-xs text-coffee-100">Salvando…</span>}
          </div>
        ) : (
          <span className="text-coffee-base font-medium">
            {l.lider_nome || l.lider_id}
            {ehUnidadeToda && paridadeMes && (
              <span className="ml-2 rounded-full bg-dourado-50 border border-dourado-200 px-2 py-0.5 text-xs font-medium text-coffee-base">
                Este mês: {rotuloParidade(paridadeMes)}
              </span>
            )}
          </span>
        )}
        {editando && (
          <button
            type="button"
            onClick={() => void remover(l.id)}
            className="text-red-600 hover:underline text-xs shrink-0"
          >
            Remover
          </button>
        )}
      </li>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-display font-semibold text-coffee-base">
              Liderança por setor
            </h1>
            <p className="text-sm text-coffee-100 mt-1">
              Mapa por filial e setor. «Gerência da loja» = responsáveis pela operação da filial (cozinha,
              atendimento, copa, caixa, ASG). CD substitui o antigo Estoque. Aplique o mapa operacional após
              alterações grandes.
            </p>
          </div>
          {podeEditarMapa && (
            <button
              type="button"
              onClick={() => setModoEditar((v) => !v)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium border ${
                editando
                  ? 'bg-dourado-base text-cream-100 border-dourado-base'
                  : 'border-dourado-400 text-coffee-base hover:bg-cream-50'
              }`}
            >
              {editando ? 'Concluir edição' : 'Editar mapa'}
            </button>
          )}
        </div>

        {tabelaExiste === false && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 max-w-2xl">
            <p className="font-medium">Falta a tabela no Supabase (migration 032)</p>
            <p className="mt-1">
              Supabase → SQL Editor →{' '}
              <code className="text-xs bg-white/80 px-1 rounded">032_lideres_por_setor.sql</code> → Run.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copiarSqlMigration()}
                className="rounded-lg bg-amber-800 text-cream-100 px-3 py-1.5 text-xs font-medium hover:bg-amber-900"
              >
                {copiadoSql ? 'SQL copiado' : 'Copiar SQL da migration 032'}
              </button>
              <button
                type="button"
                onClick={() => void verificarTabela()}
                className="rounded-lg border border-amber-600 text-amber-950 px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
              >
                Verificar de novo
              </button>
            </div>
          </div>
        )}

        {tabelaExiste === true && (
          <p className="mt-3 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block">
            Supabase: tabela lideres_por_setor OK.
          </p>
        )}

        {podeEditarMapa && (
          <button
            type="button"
            onClick={() => void aplicarPadraoOperacional()}
            disabled={aplicandoPadrao || tabelaExiste === false}
            className="mt-4 rounded-lg border border-dourado-400 bg-cream-50 text-coffee-base px-4 py-2 text-sm font-medium hover:bg-cream-100 disabled:opacity-50"
          >
            {aplicandoPadrao ? 'Aplicando mapa operacional…' : 'Aplicar mapa operacional e vincular todos'}
          </button>
        )}
        {resultadoPadrao && (
          <p className="mt-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-w-2xl">
            {resultadoPadrao}
          </p>
        )}
      </div>

      {aviso && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {aviso}
        </p>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-medium text-coffee-base mb-3">Unidades</h2>
        {carregando && unidadesResumo.length === 0 ? (
          <p className="text-sm text-coffee-100">Carregando unidades…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(unidadesResumo.length > 0
              ? unidadesResumo
              : UNIDADES_CADASTRO.map((u) => ({
                  slug: u.slug,
                  nome: u.label,
                  unidade_id: null,
                  total_lideres: 0,
                }))
            ).map((u) => {
              const ativa = u.slug === unidadeSlug;
              return (
                <button
                  key={u.slug}
                  type="button"
                  onClick={() => setUnidadeSlug(u.slug)}
                  className={`text-left rounded-xl border p-4 shadow-sm transition-colors ${
                    ativa
                      ? 'border-dourado-500 bg-dourado-50/40 ring-1 ring-dourado-400'
                      : 'border-dourado-200 bg-white hover:bg-cream-50'
                  }`}
                >
                  <p className="font-display font-semibold text-coffee-base">{u.nome}</p>
                  <p className="text-xs text-coffee-100 mt-1">
                    {u.total_lideres === 0
                      ? 'Nenhum líder configurado'
                      : `${u.total_lideres} vínculo(s) de liderança`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-xl border border-dourado-300 bg-white p-4 shadow-sm mb-6">
        <h2 className="font-display font-semibold text-lg text-coffee-base">{nomeUnidade}</h2>
        <p className="text-xs text-coffee-100 mt-0.5">
          {editando
            ? 'Modo edição: troque o líder no select; a alteração grava e sincroniza os colaboradores.'
            : 'Visualização do mapa desta unidade.'}
        </p>

        {editando && (
          <div className="mt-4 pt-4 border-t border-cream-200">
            <p className="text-xs font-medium text-coffee-base mb-2">Adicionar líder ao setor</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-coffee-100 mb-1">Setor</label>
                <select
                  value={setorNovo}
                  onChange={(e) => setSetorNovo(e.target.value)}
                  className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
                >
                  <option value={SETOR_TODOS_NA_UNIDADE}>
                    {rotuloGerenciaUnidade(unidadeSlug)} (*)
                  </option>
                  {setoresFormulario.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-coffee-100 mb-1">Líder</label>
                <select
                  value={liderNovo}
                  onChange={(e) => setLiderNovo(e.target.value)}
                  className="rounded-lg border border-cream-300 px-3 py-2 text-sm min-w-[220px]"
                >
                  <option value="">Selecione…</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                      {c.setor ? ` (${c.setor})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void adicionar()}
                disabled={salvando || !liderNovo}
                className="rounded-lg bg-dourado-base text-cream-100 px-4 py-2 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
              >
                {salvando ? 'Salvando…' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {carregando ? (
        <p className="text-coffee-100">Carregando mapa…</p>
      ) : (
        <div className="space-y-4">
          {lideresUnidadeToda.length > 0 && !ehUnidadeFabrica(unidadeSlug) && (
            <section className="rounded-xl border border-dourado-300 bg-dourado-50/30 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-coffee-base">
                  {rotuloGerenciaUnidade(unidadeSlug)}
                </h3>
                {editando && (
                  <button
                    type="button"
                    onClick={() => void copiarSql042()}
                    className="rounded-lg border border-dourado-400 text-coffee-base px-2.5 py-1 text-xs font-medium hover:bg-cream-50"
                    title="Aplique no Supabase para guardar o plantão por função (migration 042)"
                  >
                    {copiado042 ? 'SQL 042 copiado' : 'Copiar SQL plantão (042)'}
                  </button>
                )}
              </div>
              {descricaoGerenciaUnidade(unidadeSlug) && (
                <p className="text-xs text-coffee-100 mt-1 leading-relaxed">
                  {descricaoGerenciaUnidade(unidadeSlug)}
                </p>
              )}
              {editando && (
                <p className="text-xs text-coffee-100 mt-1">
                  Plantão 12x36: marque a paridade da <strong>função</strong> (dias pares/ímpares) deste mês.
                  O sistema inverte sozinho a cada mês; ao trocar o líder, a configuração permanece.
                </p>
              )}
              <ul className="mt-2 space-y-2">{lideresUnidadeToda.map(renderLinha)}</ul>
            </section>
          )}
          {Array.from(porSetorMap.entries()).map(([setor, lideres]) => (
            <section
              key={setor}
              className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm"
            >
              <h3 className="font-display font-semibold text-coffee-base">{setor}</h3>
              {descricaoSetorAdmin(setor) && (
                <p className="text-xs text-coffee-100 mt-1 leading-relaxed">{descricaoSetorAdmin(setor)}</p>
              )}
              {lideres.length === 0 ? (
                <p className="text-sm text-coffee-100 mt-2">Nenhum líder configurado.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {(lideres as Linha[]).map(renderLinha)}
                </ul>
              )}
            </section>
          ))}
          {linhas.length === 0 && !carregando && (
            <p className="text-sm text-coffee-100">
              Nenhum líder nesta unidade.
              {editando ? ' Use o formulário acima para adicionar.' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
