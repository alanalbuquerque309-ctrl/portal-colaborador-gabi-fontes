'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableTd,
  AdminTableTh,
} from '@/components/admin/shell/AdminTable';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { formatTelefoneBr } from '@/lib/telefone';

type Solicitacao = {
  id: string;
  colaborador_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
  unidade: string;
  status: string;
  criado_em: string;
};

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function RedefinicoesSenhaPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEm, setAcaoEm] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    fetch('/api/admin/redefinicoes-senha', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; erro?: string; solicitacoes?: Solicitacao[] }) => {
        if (!d.ok) {
          setErro(d.erro || 'Não foi possível carregar as solicitações.');
          setSolicitacoes([]);
          return;
        }
        setSolicitacoes(Array.isArray(d.solicitacoes) ? d.solicitacoes : []);
      })
      .catch(() => {
        setErro('Falha de rede ao carregar solicitações.');
        setSolicitacoes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const tratar = async (s: Solicitacao, acao: 'atender' | 'rejeitar') => {
    const confirmacao =
      acao === 'atender'
        ? `Redefinir a senha de "${s.nome}" para 123456?\n\nO colaborador deverá criar uma nova senha no próximo acesso. Avise a pessoa por um canal confiável.`
        : `Descartar a solicitação de "${s.nome}"? A senha não será alterada.`;
    if (!confirm(confirmacao)) return;

    setAcaoEm(s.id);
    setAviso(null);
    try {
      const res = await fetch(`/api/admin/redefinicoes-senha/${s.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      });
      const data = await res.json();
      if (data.ok) {
        setAviso(data.mensagem || 'Solicitação tratada.');
        setSolicitacoes((prev) => prev.filter((x) => x.id !== s.id));
      } else {
        alert(data.erro || 'Não foi possível concluir a ação.');
      }
    } catch {
      alert('Erro de conexão ao tratar a solicitação.');
    } finally {
      setAcaoEm(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Redefinições de senha"
        description="Pedidos de redefinição feitos no login. Confirme a identidade da pessoa antes de redefinir; o portal não envia e-mail/SMS automático."
      />

      {aviso && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</div>
      )}

      <AdminSection
        title="Solicitações pendentes"
        description="Redefinir volta a senha para 123456 e força a troca no próximo acesso."
        action={
          <button
            type="button"
            onClick={recarregar}
            className="text-sm font-medium text-dourado-base hover:underline"
          >
            Atualizar
          </button>
        }
      >
        {loading ? (
          <div className="py-8 flex justify-center">
            <XicaraCarregando size="md" label="Carregando solicitações…" />
          </div>
        ) : solicitacoes.length === 0 ? (
          <p className="text-sm text-emerald-800 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
            Nenhuma solicitação pendente.
          </p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableTh>Colaborador</AdminTableTh>
              <AdminTableTh className="hidden sm:table-cell">Contato informado</AdminTableTh>
              <AdminTableTh className="hidden md:table-cell">Unidade</AdminTableTh>
              <AdminTableTh className="hidden md:table-cell">Pedido em</AdminTableTh>
              <AdminTableTh className="text-right">Ações</AdminTableTh>
            </AdminTableHead>
            <AdminTableBody>
              {solicitacoes.map((s) => (
                <AdminTableRow key={s.id}>
                  <AdminTableTd className="font-medium">{s.nome}</AdminTableTd>
                  <AdminTableTd className="hidden sm:table-cell text-cafeteria-600">
                    <span className="block">{s.telefone ? formatTelefoneBr(s.telefone) : '—'}</span>
                    <span className="block text-xs">{s.email || '—'}</span>
                  </AdminTableTd>
                  <AdminTableTd className="hidden md:table-cell text-cafeteria-600">{s.unidade}</AdminTableTd>
                  <AdminTableTd className="hidden md:table-cell text-cafeteria-600 text-xs">
                    {formatarData(s.criado_em)}
                  </AdminTableTd>
                  <AdminTableTd className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => tratar(s, 'atender')}
                      disabled={acaoEm === s.id}
                      className="rounded-lg bg-dourado-base px-3 py-1.5 text-xs font-semibold text-cream-100 hover:bg-dourado-400 disabled:opacity-50"
                    >
                      {acaoEm === s.id ? '…' : 'Redefinir p/ 123456'}
                    </button>
                    <button
                      type="button"
                      onClick={() => tratar(s, 'rejeitar')}
                      disabled={acaoEm === s.id}
                      className="ml-2 text-xs font-medium text-cafeteria-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminSection>

      <p className="text-xs text-cafeteria-500">
        Acesso: sócios, administradores e RH. Confirme a identidade da pessoa por um canal confiável antes de
        redefinir — o pedido sozinho não prova quem fez.
      </p>
    </div>
  );
}
