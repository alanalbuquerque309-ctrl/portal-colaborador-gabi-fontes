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
  data_saida: string;
  nome: string | null;
  setor: string | null;
  unidade_nome: string | null;
  data_admissao: string | null;
  motivo_rotulo: string;
  tempo_casa_rotulo: string;
};

type Agregado = {
  chave: string;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

type MotivoAgg = { motivo: string; rotulo: string; total: number };

type Payload = {
  periodo: { ano: number; mes: number; rotulo: string };
  contratacoes: { total: number; itens: Contratacao[] };
  demissoes: {
    total: number;
    itens: Demissao[];
    tempo_medio_casa_dias: number | null;
    tempo_medio_casa_rotulo: string;
  };
  agregados: {
    por_unidade: Agregado[];
    por_setor: Agregado[];
    por_motivo: MotivoAgg[];
    destaque: {
      mais_saidas_unidade: { label: string; saidas: number } | null;
      mais_entradas_unidade: { label: string; entradas: number } | null;
      mais_saidas_setor: { label: string; saidas: number } | null;
    };
  };
  sem_admissao: { total: number; itens: { id: string; nome: string; setor: string | null; unidade_nome: string | null }[]; oculto?: boolean };
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
        description="Contratações e saídas do mês por unidade e setor. Acesso: Admin, RH e sócios."
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              label={`Contratações · ${payload.periodo.rotulo}`}
              valor={payload.contratacoes.total}
              sub="Pela data de admissão"
              tom="verde"
            />
            <AdminStatCard
              label={`Saídas · ${payload.periodo.rotulo}`}
              valor={payload.demissoes.total}
              sub="Exclusões com motivo"
              tom={payload.demissoes.total > 0 ? 'ambar' : 'neutro'}
            />
            <AdminStatCard
              label="Tempo médio de casa (saídas)"
              valor={payload.demissoes.tempo_medio_casa_rotulo || '—'}
              sub={
                payload.demissoes.tempo_medio_casa_dias != null
                  ? `${payload.demissoes.tempo_medio_casa_dias} dias`
                  : 'Sem snapshot de admissão'
              }
              tom="neutro"
            />
            {payload.pode_ver_aviso_admissao && (
              <AdminStatCard
                label="Sem data de admissão"
                valor={payload.sem_admissao.total}
                sub="Pendentes de preenchimento"
                tom={payload.sem_admissao.total > 0 ? 'ambar' : 'verde'}
              />
            )}
          </div>

          {(payload.agregados.destaque.mais_saidas_unidade ||
            payload.agregados.destaque.mais_entradas_unidade ||
            payload.agregados.destaque.mais_saidas_setor) && (
            <div className="rounded-2xl border border-cafeteria-200 bg-cream-50/80 px-4 py-3 text-sm text-cafeteria-800 space-y-1">
              <p className="font-semibold text-coffee-base">Destaques do mês</p>
              {payload.agregados.destaque.mais_saidas_unidade &&
                payload.agregados.destaque.mais_saidas_unidade.saidas > 0 && (
                  <p>
                    Mais saídas (unidade):{' '}
                    <strong>{payload.agregados.destaque.mais_saidas_unidade.label}</strong> (
                    {payload.agregados.destaque.mais_saidas_unidade.saidas})
                  </p>
                )}
              {payload.agregados.destaque.mais_entradas_unidade &&
                payload.agregados.destaque.mais_entradas_unidade.entradas > 0 && (
                  <p>
                    Mais contratações (unidade):{' '}
                    <strong>{payload.agregados.destaque.mais_entradas_unidade.label}</strong> (
                    {payload.agregados.destaque.mais_entradas_unidade.entradas})
                  </p>
                )}
              {payload.agregados.destaque.mais_saidas_setor &&
                payload.agregados.destaque.mais_saidas_setor.saidas > 0 && (
                  <p>
                    Mais saídas (setor):{' '}
                    <strong>{payload.agregados.destaque.mais_saidas_setor.label}</strong> (
                    {payload.agregados.destaque.mais_saidas_setor.saidas})
                  </p>
                )}
            </div>
          )}

          <AdminSection title="Por unidade" description="Entradas, saídas e saldo líquido no mês">
            {payload.agregados.por_unidade.length === 0 ? (
              <p className="text-sm text-cafeteria-600">Sem movimento no período.</p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Unidade</AdminTableTh>
                  <AdminTableTh>Entradas</AdminTableTh>
                  <AdminTableTh>Saídas</AdminTableTh>
                  <AdminTableTh>Saldo</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.agregados.por_unidade.map((u) => (
                    <AdminTableRow key={u.chave}>
                      <AdminTableTd className="font-medium text-coffee-base">{u.label}</AdminTableTd>
                      <AdminTableTd>{u.entradas}</AdminTableTd>
                      <AdminTableTd>{u.saidas}</AdminTableTd>
                      <AdminTableTd className={u.saldo < 0 ? 'text-red-700 font-semibold' : ''}>
                        {u.saldo > 0 ? `+${u.saldo}` : u.saldo}
                      </AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminSection>

          <AdminSection title="Por setor" description="Mesmo mês, agrupado por setor">
            {payload.agregados.por_setor.length === 0 ? (
              <p className="text-sm text-cafeteria-600">Sem movimento no período.</p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Setor</AdminTableTh>
                  <AdminTableTh>Entradas</AdminTableTh>
                  <AdminTableTh>Saídas</AdminTableTh>
                  <AdminTableTh>Saldo</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.agregados.por_setor.map((s) => (
                    <AdminTableRow key={s.chave}>
                      <AdminTableTd className="font-medium text-coffee-base">{s.label}</AdminTableTd>
                      <AdminTableTd>{s.entradas}</AdminTableTd>
                      <AdminTableTd>{s.saidas}</AdminTableTd>
                      <AdminTableTd className={s.saldo < 0 ? 'text-red-700 font-semibold' : ''}>
                        {s.saldo > 0 ? `+${s.saldo}` : s.saldo}
                      </AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminSection>

          <AdminSection title="Saídas por motivo" description="Contagem no mês">
            {payload.agregados.por_motivo.length === 0 ? (
              <p className="text-sm text-cafeteria-600">Nenhuma saída no período.</p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Motivo</AdminTableTh>
                  <AdminTableTh>Total</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.agregados.por_motivo.map((m) => (
                    <AdminTableRow key={m.motivo}>
                      <AdminTableTd>{m.rotulo}</AdminTableTd>
                      <AdminTableTd className="font-semibold">{m.total}</AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminSection>

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
                        <Link
                          href={`/admin/colaboradores/${c.id}/editar`}
                          className="font-medium text-dourado-base hover:underline"
                        >
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

          <AdminSection
            title="Saídas no mês"
            description="Nome, motivo e tempo de casa (snapshot no desligamento). Eventos antigos podem vir incompletos."
          >
            {payload.demissoes.itens.length === 0 ? (
              <p className="text-sm text-cafeteria-600 px-1">Nenhuma saída registrada neste mês.</p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Quando</AdminTableTh>
                  <AdminTableTh>Nome</AdminTableTh>
                  <AdminTableTh>Unidade</AdminTableTh>
                  <AdminTableTh>Setor</AdminTableTh>
                  <AdminTableTh>Motivo</AdminTableTh>
                  <AdminTableTh>Tempo de casa</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {payload.demissoes.itens.map((d) => (
                    <AdminTableRow key={d.id}>
                      <AdminTableTd className="text-xs whitespace-nowrap">{formatarQuando(d.criado_em)}</AdminTableTd>
                      <AdminTableTd className="font-medium text-coffee-base">{d.nome ?? '(sem nome)'}</AdminTableTd>
                      <AdminTableTd>{d.unidade_nome ?? '—'}</AdminTableTd>
                      <AdminTableTd>{d.setor ?? '—'}</AdminTableTd>
                      <AdminTableTd>{d.motivo_rotulo}</AdminTableTd>
                      <AdminTableTd>{d.tempo_casa_rotulo}</AdminTableTd>
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
