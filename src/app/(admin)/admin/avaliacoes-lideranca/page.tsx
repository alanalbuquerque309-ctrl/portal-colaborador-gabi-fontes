'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import {
  RelatorioLiderancaPorLider,
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

export default function AdminAvaliacoesLiderancaPage() {
  const [inicio, setInicio] = useState(inicioMesISO);
  const [fim, setFim] = useState(hojeISO);
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [linhas, setLinhas] = useState<LinhaLiderRelatorio[]>([]);
  const [busca, setBusca] = useState('');
  const [somenteNotaBaixa, setSomenteNotaBaixa] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = new URLSearchParams({ inicio, fim, limite: '3000' });
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      const res = await fetch(`/api/admin/avaliacoes-lideranca?${q}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao listar.');
        setLinhas([]);
        return;
      }
      setLinhas(Array.isArray(data.itens) ? (data.itens as LinhaLiderRelatorio[]) : []);
      if (data.nota) setNota(String(data.nota));
    } catch {
      setErro('Erro de conexão.');
      setLinhas([]);
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, unidadeSlug]);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-sm text-dourado-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">
          Feedback sobre a liderança
        </h1>
        <p className="text-sm text-coffee-100 mt-1">
          Todas as notas e justificativas que os colaboradores deram sobre gerentes e administrativo.
          Filtro por <strong>semana de referência</strong> (segunda-feira). Autor visível para auditoria.
        </p>
        <p className="text-sm mt-2">
          <Link href="/portal/relatorios-avaliacoes" className="text-dourado-500 hover:underline">
            Ver também no portal (equipe + liderança por filial) →
          </Link>
          {' · '}
          <Link href="/admin/avaliacoes-diarias" className="text-dourado-500 hover:underline">
            Avaliações da equipe (semanal) →
          </Link>
        </p>
      </div>

      <div className="rounded-xl border border-dourado-200 bg-white p-4 shadow-sm space-y-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Início (semana)</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Fim (semana)</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-base mb-1">Unidade (opcional)</label>
            <select
              value={unidadeSlug}
              onChange={(e) => setUnidadeSlug(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-coffee-base text-sm min-w-[180px]"
            >
              <option value="">Todas</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void buscar()}
            disabled={carregando}
            className="rounded-lg bg-dourado-base text-cream-100 px-4 py-2 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {carregando ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {nota && <p className="text-xs text-coffee-100">{nota}</p>}
        <p className="text-xs text-coffee-100">
          Total no período: <strong>{linhas.length}</strong> registro(s)
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar líder…"
            className="flex-1 min-w-[160px] rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base"
          />
          <button
            type="button"
            onClick={() => setSomenteNotaBaixa((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              somenteNotaBaixa
                ? 'border-amber-600 bg-amber-50 text-amber-950'
                : 'border-cream-300 text-coffee-base hover:bg-cream-50'
            }`}
          >
            {somenteNotaBaixa ? 'Só notas baixas ✓' : 'Só notas baixas (≤3)'}
          </button>
        </div>
      </div>

      {carregando && linhas.length === 0 ? (
        <div className="flex justify-center py-12">
          <XicaraCarregando size="md" label="Carregando feedback…" />
        </div>
      ) : (
        <RelatorioLiderancaPorLider linhas={linhas} busca={busca} somenteNotaBaixa={somenteNotaBaixa} />
      )}
    </div>
  );
}
