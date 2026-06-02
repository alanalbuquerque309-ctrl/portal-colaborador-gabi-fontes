'use client';



import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';



type Linha = {

  colaborador_id: string;

  nome: string;

  setor: string | null;

  novato: boolean;

  media_avaliacao_mes: number | null;

  semanas_com_avaliacao: number;

  trofeus_mes: number;

  indice_merito: number;

  fator_penalidade_falta: number;

  fator_novato: number;

  indice_final: number;

  peso_sugerido_pct: number;

  desconto_fixo_reais: number;

  observacao_interna: string | null;

};



const UNIDADES = [

  { slug: '', label: 'Todas as filiais' },

  { slug: 'mesquita', label: 'Mesquita' },

  { slug: 'barra', label: 'Barra' },

  { slug: 'nova-iguacu', label: 'Nova Iguaçu' },

];



function mesAtualIso(): string {

  const d = new Date();

  const m = String(d.getMonth() + 1).padStart(2, '0');

  return `${d.getFullYear()}-${m}`;

}



export default function AdminGorjetaPage() {

  const [mes, setMes] = useState(mesAtualIso());

  const [unidadeSlug, setUnidadeSlug] = useState('');

  const [linhas, setLinhas] = useState<Linha[]>([]);

  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string } | null>(null);

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);

  const [acessoNegado, setAcessoNegado] = useState(false);

  const [aplicandoMigration, setAplicandoMigration] = useState(false);

  const [msgMigration, setMsgMigration] = useState<string | null>(null);



  const precisaMigration035 =

    !!erro && /operacao_apto|035_operacao_apto/i.test(erro);



  const aplicarMigration035 = async () => {

    setAplicandoMigration(true);

    setMsgMigration(null);

    try {

      const res = await fetch('/api/admin/aplicar-migration-035', {

        method: 'POST',

        credentials: 'include',

      });

      const data = await res.json();

      if (!data.ok) {

        setMsgMigration(data.erro || 'Falha ao aplicar migration.');

        return;

      }

      setMsgMigration(data.msg || 'Migration aplicada.');

      await carregar();

    } catch {

      setMsgMigration('Erro de conexão.');

    } finally {

      setAplicandoMigration(false);

    }

  };



  const carregar = useCallback(async () => {

    setCarregando(true);

    setErro(null);

    setAcessoNegado(false);

    try {

      const q = new URLSearchParams({ mes });

      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);

      const res = await fetch(`/api/admin/bonificacao/indice?${q}`, {

        credentials: 'include',

        cache: 'no-store',

      });

      const data = await res.json();

      if (res.status === 403) {

        setAcessoNegado(true);

        setLinhas([]);

        return;

      }

      if (!data.ok) {

        setErro(data.erro || 'Erro ao carregar índice.');

        setLinhas([]);

        return;

      }

      setPeriodo(data.periodo ?? null);

      setLinhas(data.linhas ?? []);

    } catch {

      setErro('Erro de conexão.');

      setLinhas([]);

    } finally {

      setCarregando(false);

    }

  }, [mes, unidadeSlug]);



  useEffect(() => {

    carregar();

  }, [carregar]);



  if (acessoNegado) {

    return (

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-coffee-base">

        <p className="font-medium">Acesso restrito</p>

        <p className="text-sm mt-2">Esta visão é apenas para sócios e administrador.</p>

        <Link href="/admin/dashboard" className="text-sm text-dourado-600 hover:underline mt-4 inline-block">

          Voltar ao dashboard

        </Link>

      </div>

    );

  }



  return (

    <div className="space-y-6">

      <div>

        <h1 className="font-display text-2xl text-coffee-base font-semibold">Índice interno (gorjeta)</h1>

        <p className="text-sm text-coffee-100 mt-2 max-w-3xl">

          Uso exclusivo da direção. Não aparece para colaboradores nem gerentes. O percentual sugerido divide o pote

          do setor/unidade conforme desempenho, troféus e presença, com cortes por falta e fator de adaptação

          (novato).

        </p>

      </div>



      <div className="flex flex-wrap gap-4 items-end bg-white border border-cream-300 rounded-xl p-4">

        <div>

          <label htmlFor="mes-gorjeta" className="block text-sm font-medium text-coffee-base mb-1">

            Mês

          </label>

          <input

            id="mes-gorjeta"

            type="month"

            value={mes}

            onChange={(e) => setMes(e.target.value)}

            className="rounded-lg border border-cream-300 px-3 py-2"

          />

        </div>

        <div>

          <label htmlFor="uni-gorjeta" className="block text-sm font-medium text-coffee-base mb-1">

            Filial

          </label>

          <select

            id="uni-gorjeta"

            value={unidadeSlug}

            onChange={(e) => setUnidadeSlug(e.target.value)}

            className="rounded-lg border border-cream-300 px-3 py-2 min-w-[160px]"

          >

            {UNIDADES.map((u) => (

              <option key={u.slug || 'todas'} value={u.slug}>

                {u.label}

              </option>

            ))}

          </select>

        </div>

        <button

          type="button"

          onClick={carregar}

          className="rounded-lg bg-dourado-base text-cream-100 px-4 py-2 text-sm font-medium hover:bg-dourado-400"

        >

          Atualizar

        </button>

      </div>



      {periodo && (

        <p className="text-xs text-coffee-100">

          Período: {periodo.inicio} a {periodo.fim}

        </p>

      )}



      {erro && <p className="text-red-700 text-sm">{erro}</p>}



      {precisaMigration035 && (

        <div className="rounded-xl border border-amber-400 bg-amber-50 p-4 space-y-3">

          <p className="text-sm text-amber-950">

            Falta a atualização do banco (colunas de aptidão na função). Se{' '}

            <strong>DATABASE_URL</strong> estiver na Vercel, aplique com um clique; senão use o SQL Editor no

            Supabase.

          </p>

          <button

            type="button"

            disabled={aplicandoMigration}

            onClick={aplicarMigration035}

            className="rounded-lg bg-amber-800 text-white text-sm font-medium px-4 py-2 hover:bg-amber-900 disabled:opacity-60"

          >

            {aplicandoMigration ? 'Aplicando…' : 'Aplicar atualização do banco (035)'}

          </button>

          {msgMigration && <p className="text-sm text-amber-900">{msgMigration}</p>}

        </div>

      )}



      {carregando ? (

        <p className="text-coffee-100">Carregando…</p>

      ) : (

        <div className="overflow-x-auto rounded-xl border border-cream-300 bg-white">

          <table className="min-w-full text-sm">

            <thead className="bg-cream-100 text-left text-coffee-base">

              <tr>

                <th className="px-3 py-2 font-medium">Nome</th>

                <th className="px-3 py-2 font-medium">Setor</th>

                <th className="px-3 py-2 font-medium">Adaptação</th>

                <th className="px-3 py-2 font-medium">Média líder</th>

                <th className="px-3 py-2 font-medium">Troféus</th>

                <th className="px-3 py-2 font-medium">Semanas aval.</th>

                <th className="px-3 py-2 font-medium">Índice final</th>

                <th className="px-3 py-2 font-medium">% sugerido</th>

                <th className="px-3 py-2 font-medium">Desc. fixo R$</th>

              </tr>

            </thead>

            <tbody>

              {linhas.length === 0 ? (

                <tr>

                  <td colSpan={9} className="px-3 py-8 text-center text-coffee-100">

                    Nenhum colaborador no filtro ou sem avaliações no mês.

                  </td>

                </tr>

              ) : (

                linhas.map((l) => (

                  <tr key={l.colaborador_id} className="border-t border-cream-200">

                    <td className="px-3 py-2">{l.nome}</td>

                    <td className="px-3 py-2">{l.setor ?? '—'}</td>

                    <td className="px-3 py-2">{l.novato ? 'Em adaptação' : 'Apto'}</td>

                    <td className="px-3 py-2">{l.media_avaliacao_mes ?? '—'}</td>

                    <td className="px-3 py-2">{l.trofeus_mes}</td>

                    <td className="px-3 py-2">{l.semanas_com_avaliacao}</td>

                    <td className="px-3 py-2 font-medium">{l.indice_final.toFixed(3)}</td>

                    <td className="px-3 py-2">{l.peso_sugerido_pct.toFixed(2)}%</td>

                    <td className="px-3 py-2">

                      {l.desconto_fixo_reais > 0 ? l.desconto_fixo_reais.toFixed(2) : '—'}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}

