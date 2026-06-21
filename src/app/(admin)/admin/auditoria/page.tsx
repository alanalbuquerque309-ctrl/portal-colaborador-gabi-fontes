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

type Evento = {
  id: string;
  criado_em: string;
  acao: string;
  ator_tipo: string;
  ator_nome: string | null;
  alvo_tipo: string | null;
  alvo_nome: string | null;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
};

const ACAO_LABEL: Record<string, string> = {
  'login.admin_senha.sucesso': 'Login admin (senha)',
  'colaborador.role.alterar': 'Alterou acesso',
  'colaborador.excluir': 'Excluiu colaborador',
  'colaborador.reset_cadastro': 'Resetou cadastro',
  'colaborador.senha.redefinir': 'Redefiniu senha',
  'redefinicao_senha.atender': 'Atendeu pedido de senha',
  'redefinicao_senha.rejeitar': 'Descartou pedido de senha',
  'banco.migration.aplicar': 'Aplicou migration',
};

const ATOR_LABEL: Record<string, string> = {
  portal: 'Portal',
  senha_admin: 'Admin (senha)',
  sistema: 'Sistema',
};

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return iso;
  }
}

function resumoDetalhes(d: Record<string, unknown> | null): string {
  if (!d || Object.keys(d).length === 0) return '';
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    fetch('/api/admin/auditoria?limite=200', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; erro?: string; eventos?: Evento[] }) => {
        if (!d.ok) {
          setErro(d.erro || 'Não foi possível carregar a auditoria.');
          setEventos([]);
          return;
        }
        setEventos(Array.isArray(d.eventos) ? d.eventos : []);
      })
      .catch(() => {
        setErro('Falha de rede ao carregar a auditoria.');
        setEventos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Auditoria"
        description="Trilha das ações sensíveis (acesso, senha, exclusão, migrations). Somente leitura — para rastreabilidade e resposta a incidentes."
      />

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</div>
      )}

      <AdminSection
        title="Eventos recentes"
        description="Até 200 eventos mais recentes."
        action={
          <button type="button" onClick={recarregar} className="text-sm font-medium text-dourado-base hover:underline">
            Atualizar
          </button>
        }
      >
        {loading ? (
          <div className="py-8 flex justify-center">
            <XicaraCarregando size="md" label="Carregando auditoria…" />
          </div>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-cafeteria-600">Nenhum evento registrado ainda.</p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableTh>Quando</AdminTableTh>
              <AdminTableTh>Ação</AdminTableTh>
              <AdminTableTh>Quem</AdminTableTh>
              <AdminTableTh className="hidden sm:table-cell">Alvo</AdminTableTh>
              <AdminTableTh className="hidden md:table-cell">Detalhes</AdminTableTh>
              <AdminTableTh className="hidden lg:table-cell">IP</AdminTableTh>
            </AdminTableHead>
            <AdminTableBody>
              {eventos.map((e) => (
                <AdminTableRow key={e.id}>
                  <AdminTableTd className="text-xs text-cafeteria-600 whitespace-nowrap">
                    {formatarData(e.criado_em)}
                  </AdminTableTd>
                  <AdminTableTd className="font-medium">{ACAO_LABEL[e.acao] ?? e.acao}</AdminTableTd>
                  <AdminTableTd className="text-cafeteria-700">
                    {e.ator_nome ?? ATOR_LABEL[e.ator_tipo] ?? e.ator_tipo}
                  </AdminTableTd>
                  <AdminTableTd className="hidden sm:table-cell text-cafeteria-600">
                    {e.alvo_nome ?? '—'}
                  </AdminTableTd>
                  <AdminTableTd className="hidden md:table-cell text-cafeteria-500 text-xs">
                    {resumoDetalhes(e.detalhes) || '—'}
                  </AdminTableTd>
                  <AdminTableTd className="hidden lg:table-cell text-cafeteria-400 text-xs">
                    {e.ip ?? '—'}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminSection>

      <p className="text-xs text-cafeteria-500">
        Acesso restrito a sócios e administradores. A trilha não guarda CPF/senha; nomes são resolvidos só na
        exibição.
      </p>
    </div>
  );
}
