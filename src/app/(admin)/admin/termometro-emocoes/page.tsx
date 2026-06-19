'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { dataCivilBr } from '@/lib/data-civil-br';

type Registro = {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  unidade_nome: string | null;
  emocao: string;
  emocao_label: string;
  emoji: string;
  negativa: boolean;
  data: string;
  registrado_em: string | null;
};

function hojeInputValue(): string {
  return dataCivilBr();
}

export default function TermometroEmocoesAdminPage() {
  const [dataRef, setDataRef] = useState(hojeInputValue);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [resumo, setResumo] = useState({ negativas: 0, demais: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    fetch(`/api/admin/emocional/registros?data=${encodeURIComponent(dataRef)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data?.ok) {
          throw new Error(data?.erro || 'Não foi possível carregar os registros.');
        }
        setRegistros(Array.isArray(data.registros) ? data.registros : []);
        setResumo({
          negativas: Number(data.resumo?.negativas ?? 0),
          demais: Number(data.resumo?.demais ?? 0),
        });
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar.');
        setRegistros([]);
      })
      .finally(() => setLoading(false));
  }, [dataRef]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const dataFmt = dataRef
    ? new Date(`${dataRef}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const negativas = registros.filter((r) => r.negativa);
  const demais = registros.filter((r) => !r.negativa);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-coffee-base flex items-center gap-2">
            <span aria-hidden>🌡️</span>
            Termômetro de emoções
          </h1>
          <p className="text-sm text-coffee-100 mt-1">
            Respostas de todos os colaboradores. Reações que pedem atenção aparecem primeiro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-coffee-100">
            Data
            <input
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
              className="ml-2 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-coffee-base"
            />
          </label>
          <button
            type="button"
            onClick={() => carregar()}
            className="rounded-lg border border-dourado-200 bg-dourado-50 px-3 py-2 text-sm font-medium text-coffee-base hover:bg-dourado-100"
          >
            Atualizar
          </button>
        </div>
      </div>

      {!loading && !erro && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-cream-200 bg-white px-4 py-3">
            <p className="text-xs text-coffee-100 uppercase tracking-wide">Total no dia</p>
            <p className="text-2xl font-semibold text-coffee-base">{registros.length}</p>
            <p className="text-xs text-coffee-100 capitalize">{dataFmt}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-900/80 uppercase tracking-wide">Precisam de atenção</p>
            <p className="text-2xl font-semibold text-amber-950">{resumo.negativas}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-900/80 uppercase tracking-wide">Demais respostas</p>
            <p className="text-2xl font-semibold text-emerald-950">{resumo.demais}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-12 flex justify-center">
          <XicaraCarregando />
        </div>
      )}

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{erro}</div>
      )}

      {!loading && !erro && registros.length === 0 && (
        <p className="text-sm text-coffee-100 rounded-xl border border-cream-200 bg-white px-4 py-8 text-center">
          Nenhuma resposta registrada nesta data.
        </p>
      )}

      {!loading && !erro && negativas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-950 mb-2 flex items-center gap-2">
            <span aria-hidden>⚠️</span>
            Reações que pedem atenção ({negativas.length})
          </h2>
          <ListaRegistros itens={negativas} destaqueNegativo />
        </section>
      )}

      {!loading && !erro && demais.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-coffee-base mb-2">
            Demais respostas ({demais.length})
          </h2>
          <ListaRegistros itens={demais} />
        </section>
      )}

      <p className="text-xs text-coffee-100">
        <Link href="/admin/colaboradores" className="text-dourado-base hover:underline">
          ← Voltar para colaboradores
        </Link>
      </p>
    </div>
  );
}

function ListaRegistros({
  itens,
  destaqueNegativo,
}: {
  itens: Registro[];
  destaqueNegativo?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {itens.map((r) => {
        const hora = r.registrado_em
          ? new Date(r.registrado_em).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : null;
        return (
          <li
            key={`${r.colaborador_id}-${r.emocao}-${r.registrado_em ?? ''}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              destaqueNegativo
                ? 'border-amber-200 bg-amber-50/80'
                : 'border-cream-200 bg-white'
            }`}
          >
            <span className="text-2xl shrink-0" aria-hidden>
              {r.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-coffee-base">{r.nome}</p>
              <p className="text-sm text-coffee-100">
                {r.emocao_label}
                {r.unidade_nome ? ` · ${r.unidade_nome}` : ''}
                {r.setor ? ` · ${r.setor}` : ''}
                {hora ? ` · ${hora}` : ''}
              </p>
            </div>
            <Link
              href={`/admin/colaboradores?busca=${encodeURIComponent(r.nome)}`}
              className="shrink-0 text-xs font-medium text-dourado-base hover:underline"
            >
              Ver cadastro
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
