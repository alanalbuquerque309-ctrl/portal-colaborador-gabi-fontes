'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AvisoAdmissaoPendenteBanner } from '@/components/admin/AvisoAdmissaoPendenteBanner';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import { AdminStatCard } from '@/components/admin/shell/AdminStatCard';
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableTd,
  AdminTableTh,
} from '@/components/admin/shell/AdminTable';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Contratacao = {
  id: string;
  nome: string;
  setor: string | null;
  data_admissao: string;
  unidade_nome: string | null;
};

type Demissao = {
  id: string;
  criado_em: string;
  alvo_id: string | null;
  unidade_nome: string | null;
};

type SemAdmissao = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_nome: string | null;
};

type Payload = {
  periodo: { ano: number; mes: number; rotulo: string };
  contratacoes: { total: number; itens: Contratacao[] };
  demissoes: { total: number; itens: Demissao[] };
  sem_admissao: { total: number; itens: SemAdmissao[]; oculto?: boolean };
  pode_ver_aviso_admissao?: boolean;
};

function formatarDia(iso: string): string {
  try {
    return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

function formatarQuando(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function RotatividadePage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/rotatividade?ano=${ano}&mes=${mes}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Não foi possível carregar.');
        setPayload(null);
        return;
      }
      setPayload(data as Payload);
    } catch {
      setErro('Erro de conexão.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Rotatividade"
        description="Contratações (pela data de admissão) e demissões (exclusões no mês)."
      />

      <AvisoAdmissaoPendenteBanner />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-cafeteria-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="font-semibold text-coffee-base block mb-1">Mês</span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-xl border border-cafeteria-200 bg-cream-50/60 px-3 py-2.5 min-h-[44px] text-coffee-base"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2026, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold text-coffee-base block mb-1">Ano</span>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value) || ano)}
            className="w-28 rounded-xl border border-cafeteria-200 bg-cream-50/60 px-3 py-2.5 min-h-[44px] text-coffee-base"
          />
        </label>
        <button
          type="button"
          onClick={() => void carregar()}
          className="rounded-xl bg-coffee-base text-cream-50 px-5 py-2.5 min-h-[44px] font-semibold"
        >
          Atualizar
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{erro}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <XicaraCarregando size="md" label="Carregando rotatividade…" />
        </div>
      ) : payload ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminStatCard
              label={`Contratações · ${payload.periodo.rotulo}`}
              valor={payload.contratacoes.total}
              sub="Pela data de admissão no cadastro"
              tom="verde"
            />
            <AdminStatCard
              label={`Demissões · ${payload.periodo.rotulo}`}
              valor={payload.demissoes.total}
              sub="Exclusões registradas na auditoria"
              tom={payload.demissoes.total > 0 ? 'ambar' : 'neutro'}
            />
            {payload.pode_ver_aviso_admissao && (
              <AdminStatCard
                label="Sem data de admissão"
                valor={payload.sem_admissao.total}
                sub="Pendentes de preenchimento pelo RH"
                tom={payload.sem_admissao.total > 0 ? 'ambar' : 'verde'}
              />
            )}
          </div>

          <AdminSection title="Contratações no mês" description="Quem tem data de admissão neste período">
            {payload.contratacoes.itens.length === 0 ? (
              <p className="text-sm text-cafeteria-600 px-1">Nenhuma contratação com data de admissão neste mês.</p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Nome</AdminTableTh>
                  <AdminTableTh>Admissão</AdminTableTh>
                  <AdminTableTh>Unidade</AdminTableTh>
                  <AdminTableTh>Setor</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.contratacoes.itens.map((c) => (
                    <AdminTableRow key={c.id}>
                      <AdminTableTd>
                        <Link href={`/admin/colaboradores/${c.id}/editar`} className="font-medium text-dourado-base hover:underline">
                          {c.nome}
                        </Link>
                      </AdminTableTd>
                      <AdminTableTd>{formatarDia(c.data_admissao)}</AdminTableTd>
                      <AdminTableTd>{c.unidade_nome ?? '—'}</AdminTableTd>
                      <AdminTableTd>{c.setor ?? '—'}</AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminSection>

          <AdminSection title="Demissões no mês" description="Exclusões de cadastro no período">
            {payload.demissoes.itens.length === 0 ? (
              <p className="text-sm text-cafeteria-600 px-1">Nenhuma demissão registrada neste mês.</p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Quando</AdminTableTh>
                  <AdminTableTh>Unidade</AdminTableTh>
                  <AdminTableTh>Registro</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.demissoes.itens.map((d) => (
                    <AdminTableRow key={d.id}>
                      <AdminTableTd>{formatarQuando(d.criado_em)}</AdminTableTd>
                      <AdminTableTd>{d.unidade_nome ?? '—'}</AdminTableTd>
                      <AdminTableTd className="text-xs text-cafeteria-500">
                        {d.alvo_id ? `${d.alvo_id.slice(0, 8)}…` : '—'}
                      </AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminSection>

          {payload.pode_ver_aviso_admissao && payload.sem_admissao.total > 0 && (
            <AdminSection
              title="Sem data de admissão"
              description="Preencha no editar colaborador. O aviso some quando a lista zerar."
            >
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Nome</AdminTableTh>
                  <AdminTableTh>Unidade</AdminTableTh>
                  <AdminTableTh>Setor</AdminTableTh>
                  <AdminTableTh>{''}</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.sem_admissao.itens.map((c) => (
                    <AdminTableRow key={c.id}>
                      <AdminTableTd className="font-medium text-coffee-base">{c.nome}</AdminTableTd>
                      <AdminTableTd>{c.unidade_nome ?? '—'}</AdminTableTd>
                      <AdminTableTd>{c.setor ?? '—'}</AdminTableTd>
                      <AdminTableTd>
                        <Link
                          href={`/admin/colaboradores/${c.id}/editar`}
                          className="text-sm font-semibold text-dourado-base hover:underline"
                        >
                          Preencher →
                        </Link>
                      </AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </AdminSection>
          )}
        </>
      ) : null}
    </div>
  );
}
