'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Linha = {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  role: string;
  unidade_nome: string;
  unidade_slug: string;
  ultimo_acesso_at: string | null;
  dias_sem_acesso: number | null;
  sem_registro: boolean;
};

export default function RelatoriosPresencaPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [dias, setDias] = useState(7);
  const [unidade, setUnidade] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [inativos, setInativos] = useState<Linha[]>([]);
  const [totalCadastros, setTotalCadastros] = useState(0);

  useEffect(() => {
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { role?: string | null } }) => {
        const role = data.colaborador?.role ?? '';
        setAutorizado(!!(data.ok && podeVerRelatoriosAvaliacoesCompletos(role)));
      })
      .catch(() => setAutorizado(false));
  }, []);

  useEffect(() => {
    if (autorizado === false) router.replace('/portal');
  }, [autorizado, router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ dias: String(dias) });
      if (unidade) params.set('unidade', unidade);
      const res = await fetch(`/api/portal/relatorios-presenca?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setInativos(Array.isArray(data.inativos) ? data.inativos : []);
        setTotalCadastros(Number(data.total_cadastros ?? 0));
      } else {
        setInativos([]);
      }
    } finally {
      setCarregando(false);
    }
  }, [dias, unidade]);

  useEffect(() => {
    if (autorizado) void carregar();
  }, [autorizado, carregar]);

  if (autorizado === null) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando…" />
      </div>
    );
  }

  return (
    <main className="space-y-6 max-w-5xl">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl font-display font-semibold text-cafeteria-900 mt-2">
          Uso do portal (inatividade)
        </h1>
        <p className="text-sm text-cafeteria-600 mt-1">
          Colaboradores sem registro de uso do portal há {dias} dias ou mais (login + navegação com app aberto).
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end bg-white border border-cafeteria-200 rounded-xl p-4">
        <div>
          <label className="block text-sm font-medium text-cafeteria-800 mb-1">Dias sem acesso</label>
          <input
            type="number"
            min={1}
            max={90}
            value={dias}
            onChange={(e) => setDias(Math.max(1, parseInt(e.target.value, 10) || 7))}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 w-24"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-cafeteria-800 mb-1">Unidade</label>
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="rounded-lg border border-cafeteria-200 px-3 py-2 text-sm min-w-[160px]"
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
          onClick={() => void carregar()}
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 text-sm font-medium hover:bg-dourado-400"
        >
          Atualizar
        </button>
      </div>

      <p className="text-sm text-cafeteria-700">
        Base: <strong>{totalCadastros}</strong> cadastros com onboarding completo ·{' '}
        <strong>{inativos.length}</strong> inativo(s) no critério
      </p>

      {carregando ? (
        <XicaraCarregando size="md" label="Carregando relatório…" />
      ) : inativos.length === 0 ? (
        <p className="text-cafeteria-600 text-sm">Ninguém fora do critério no filtro atual.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cafeteria-200">
          <table className="w-full text-sm">
            <thead className="bg-cafeteria-50 text-left">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Último uso</th>
                <th className="p-3">Dias</th>
              </tr>
            </thead>
            <tbody>
              {inativos.map((l) => (
                <tr key={l.id} className="border-t border-cafeteria-100">
                  <td className="p-3 font-medium">{l.nome}</td>
                  <td className="p-3">{l.unidade_nome}</td>
                  <td className="p-3">{l.setor ?? '—'}</td>
                  <td className="p-3">
                    {l.sem_registro
                      ? 'Nunca registrado'
                      : l.ultimo_acesso_at
                        ? new Date(l.ultimo_acesso_at).toLocaleString('pt-BR')
                        : '—'}
                  </td>
                  <td className="p-3">{l.sem_registro ? '—' : (l.dias_sem_acesso ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
