'use client';

import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone?: string | null;
  cargo?: string | null;
  unidade: { nome: string };
  onboarding_completo: boolean;
  role?: string;
}

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);

  const handleDiagnostico = async () => {
    setDiagLoading(true);
    try {
      const res = await fetch('/api/admin/diagnostico', { credentials: 'include' });
      const d = await res.json();
      alert(JSON.stringify(d, null, 2));
    } catch {
      alert('Erro ao buscar diagnóstico.');
    } finally {
      setDiagLoading(false);
    }
  };

  const recarregar = () => {
    setLoading(true);
    fetch('/api/admin/colaboradores', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.colaboradores)) {
          setColaboradores(
            res.colaboradores.map((c: Record<string, unknown>) => ({
              id: String(c.id ?? ''),
              nome: String(c.nome ?? ''),
              cpf: String(c.cpf ?? ''),
              email: c.email != null ? String(c.email) : null,
              telefone: c.telefone != null ? String(c.telefone) : null,
              cargo: c.cargo != null ? String(c.cargo) : null,
              unidade: (c.unidades as { nome?: string }) ?? { nome: '-' },
              onboarding_completo: c.onboarding_completo === true,
              role: c.role ? String(c.role) : undefined,
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  };

  const handleBootstrap = async () => {
    setBootstrapLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap-alan', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Alan Albuquerque cadastrado com sucesso (${data.acao}). Faça login na tela de colaborador.`);
        recarregar();
      } else {
        alert(data.erro || 'Erro ao cadastrar.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setBootstrapLoading(false);
    }
  };

  useEffect(() => {
    recarregar();
  }, []);

  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir colaborador "${nome}"? Esta ação não pode ser desfeita.`)) return;

    setExcluindo(id);
    try {
      const res = await fetch(`/api/admin/colaboradores/excluir?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.ok) {
        setColaboradores((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(data.erro || 'Erro ao excluir.');
      }
    } catch {
      alert('Erro ao excluir.');
    } finally {
      setExcluindo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando colaboradores…" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-coffee-base">
          Colaboradores
        </h1>
        <a
          href="/admin/colaboradores/novo"
          className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors"
        >
          Cadastrar
        </a>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-coffee-base mb-2">
          <strong>Aparece &quot;CPF não cadastrado&quot; ao entrar como colaborador?</strong>
        </p>
        <p className="text-xs text-coffee-100 mb-3">
          Clique no botão abaixo para cadastrar Alan Albuquerque via serviço administrativo.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBootstrap}
            disabled={bootstrapLoading}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {bootstrapLoading ? 'Cadastrando…' : 'Cadastrar Alan Albuquerque'}
          </button>
          <button
            type="button"
            onClick={handleDiagnostico}
            disabled={diagLoading}
            className="rounded-lg border border-amber-600 px-4 py-2 text-amber-700 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
          >
            {diagLoading ? 'Verificando…' : 'Ver diagnóstico'}
          </button>
        </div>
      </div>

      {colaboradores.length === 0 ? (
        <p className="text-coffee-100 py-8">
          Nenhum colaborador cadastrado. Clique em Cadastrar para adicionar.
        </p>
      ) : (
        <div className="rounded-xl border border-cream-300 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-200">
              <tr>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Cargo</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Unidade</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Função</th>
                <th className="text-left px-4 py-3 text-coffee-base font-medium">Onboarding</th>
                <th className="w-24 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((c) => (
                <tr key={c.id} className="border-t border-cream-300 hover:bg-cream-50">
                  <td className="px-4 py-3 text-coffee-base">{c.nome}</td>
                  <td className="px-4 py-3 text-coffee-100">{c.cargo || '-'}</td>
                  <td className="px-4 py-3 text-coffee-100">{c.unidade.nome}</td>
                  <td className="px-4 py-3 text-coffee-100">
                    {c.role === 'socio' ? 'Sócio' : c.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </td>
                  <td className="px-4 py-3">
                    {c.onboarding_completo ? (
                      <span className="text-green-600">Concluído</span>
                    ) : (
                      <span className="text-amber-600">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleExcluir(c.id, c.nome)}
                      disabled={excluindo === c.id}
                      className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                    >
                      {excluindo === c.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-coffee-100">
        Exclusão disponível apenas para sócios e administradores.
      </p>
    </div>
  );
}
