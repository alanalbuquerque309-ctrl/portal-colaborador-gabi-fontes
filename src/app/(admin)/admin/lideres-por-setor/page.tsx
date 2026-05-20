'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO, SETORES_PREDEFINIDOS } from '@/lib/constants/colaborador-org';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';

type Linha = {
  id: string;
  unidade_id: string;
  unidade_nome: string;
  setor: string;
  lider_id: string;
  lider_nome: string;
  ativo: boolean;
};

type Candidato = { id: string; nome: string; role: string; cargo: string | null; setor: string | null };

export default function LideresPorSetorPage() {
  const [unidadeSlug, setUnidadeSlug] = useState(UNIDADES_CADASTRO[0]?.slug ?? '');
  const [unidadeId, setUnidadeId] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
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
      setErro('Não foi possível copiar. Abre o ficheiro supabase/migrations/032_lideres_por_setor.sql no projeto.');
    }
  };

  const carregar = useCallback(async () => {
    if (!unidadeSlug) return;
    setCarregando(true);
    setErro(null);
    setAviso(null);
    try {
      const q = new URLSearchParams({ unidade_slug: unidadeSlug });
      const [resL, resC] = await Promise.all([
        fetch(`/api/admin/lideres-por-setor?${q}`, { credentials: 'include' }),
        fetch(`/api/admin/lideres-por-setor/candidatos?${q}`, { credentials: 'include' }),
      ]);
      const dataL = await resL.json();
      const dataC = await resC.json();
      if (!dataL.ok) {
        setErro(dataL.erro || 'Erro ao listar.');
        setLinhas([]);
        return;
      }
      const ativas = (dataL.linhas ?? []).filter((l: Linha) => l.ativo);
      setLinhas(ativas);
      if (dataL.aviso) {
        setAviso(String(dataL.aviso));
        if (String(dataL.aviso).includes('032_lideres_por_setor')) setTabelaExiste(false);
      }
      if (dataL.unidade_id) setUnidadeId(String(dataL.unidade_id));
      else if (ativas[0]?.unidade_id) setUnidadeId(String(ativas[0].unidade_id));

      if (dataC.ok) setCandidatos(dataC.candidatos ?? []);
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  }, [unidadeSlug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const adicionar = async () => {
    if (!liderNovo || !setorNovo) return;
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
      await carregar();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
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
      await carregar();
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
      await carregar();
      await verificarTabela();
    } catch {
      setErro('Erro de conexão ao aplicar padrão.');
    } finally {
      setAplicandoPadrao(false);
    }
  };

  const lideresUnidadeToda = linhas.filter((l) => l.setor === SETOR_TODOS_NA_UNIDADE);
  const porSetor = SETORES_PREDEFINIDOS.map((setor) => ({
    setor,
    lideres: linhas.filter((l) => l.setor === setor),
  }));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">
          Liderança por setor
        </h1>
        <p className="text-sm text-coffee-100 mt-1 max-w-2xl">
          Mapa acordado (Joyce/Silvia em Mesquita, Lucas/Matheus na Barra, Nathalia/Cristina em Nova Iguaçu;
          Daniel em CD, Motorista, Administração e RH). Colaboradores herdam líderes pela unidade e setor.
          Use o botão abaixo para gravar tudo de uma vez.
        </p>

        {tabelaExiste === false && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 max-w-2xl">
            <p className="font-medium">Falta a tabela no Supabase (migration 032)</p>
            <p className="mt-1">
              Abre o Supabase → SQL Editor → cola o ficheiro{' '}
              <code className="text-xs bg-white/80 px-1 rounded">032_lideres_por_setor.sql</code> → Run.
              Depois volta aqui e clica em &quot;Verificar de novo&quot;.
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
            Supabase: tabela lideres_por_setor OK — pode aplicar o mapa.
          </p>
        )}

        <button
          type="button"
          onClick={() => void aplicarPadraoOperacional()}
          disabled={aplicandoPadrao || tabelaExiste === false}
          className="mt-4 rounded-lg border border-dourado-400 bg-cream-50 text-coffee-base px-4 py-2 text-sm font-medium hover:bg-cream-100 disabled:opacity-50"
        >
          {aplicandoPadrao ? 'Aplicando mapa operacional…' : 'Aplicar mapa operacional e vincular todos'}
        </button>
        {resultadoPadrao && (
          <p className="mt-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {resultadoPadrao}
          </p>
        )}
      </div>

      {aviso && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {aviso}
        </p>
      )}

      <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm space-y-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-coffee-base mb-1">Unidade</label>
          <select
            value={unidadeSlug}
            onChange={(e) => setUnidadeSlug(e.target.value)}
            className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm min-w-[200px]"
          >
            {UNIDADES_CADASTRO.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-medium text-coffee-base mb-2">Adicionar líder ao setor</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-coffee-100 mb-1">Setor</label>
              <select
                value={setorNovo}
                onChange={(e) => setSetorNovo(e.target.value)}
                className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
              >
                <option value={SETOR_TODOS_NA_UNIDADE}>Toda a unidade (*)</option>
                {SETORES_PREDEFINIDOS.map((s) => (
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
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {carregando ? (
        <p className="text-coffee-100">Carregando…</p>
      ) : (
        <div className="space-y-4">
          {lideresUnidadeToda.length > 0 && (
            <section className="rounded-xl border border-dourado-300 bg-dourado-50/30 p-4 shadow-sm">
              <h2 className="font-display font-semibold text-coffee-base">Toda a unidade</h2>
              <ul className="mt-2 space-y-2">
                {lideresUnidadeToda.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-cream-100 pb-2 last:border-0"
                  >
                    <span className="text-coffee-base font-medium">{l.lider_nome || l.lider_id}</span>
                    <button
                      type="button"
                      onClick={() => void remover(l.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {porSetor.map(({ setor, lideres }) => (
            <section
              key={setor}
              className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm"
            >
              <h2 className="font-display font-semibold text-coffee-base">{setor}</h2>
              {lideres.length === 0 ? (
                <p className="text-sm text-coffee-100 mt-2">Nenhum líder configurado.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {lideres.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-cream-100 pb-2 last:border-0"
                    >
                      <span className="text-coffee-base font-medium">{l.lider_nome || l.lider_id}</span>
                      <button
                        type="button"
                        onClick={() => void remover(l.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
