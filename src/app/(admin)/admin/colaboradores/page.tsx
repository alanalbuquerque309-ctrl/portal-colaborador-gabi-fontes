'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { SETORES_PREDEFINIDOS, UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { labelAcessoPortal } from '@/lib/colaborador-role-ui';

interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone?: string | null;
  cargo?: string | null;
  setor?: string | null;
  unidade: { nome: string; slug?: string };
  onboarding_completo: boolean;
  role?: string;
}

const OPCOES_ACESSO = [
  { value: '', label: 'Todos os acessos' },
  { value: 'socio', label: 'Sócio' },
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'master', label: 'Gerente' },
  { value: 'rh', label: 'RH' },
  { value: 'colaborador', label: 'Colaborador' },
];

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroAcesso, setFiltroAcesso] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [podeEditarCadastro, setPodeEditarCadastro] = useState<boolean | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [resetandoSenha, setResetandoSenha] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  /** Total de linhas no Supabase (mesma consulta da API), para conferir ambiente. */
  const [totalSupabase, setTotalSupabase] = useState<number | null>(null);

  const handleConcluirOnboarding = async (id: string, nome: string) => {
    if (!confirm(`Marcar onboarding de "${nome}" como concluído? Ela poderá acessar o portal sem passar pelo fluxo.`)) return;
    setConcluindo(id);
    try {
      const res = await fetch(`/api/admin/colaboradores/concluir-onboarding?id=${id}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) recarregar();
      else alert(data.erro || 'Erro ao atualizar.');
    } catch {
      alert('Erro ao atualizar.');
    } finally {
      setConcluindo(null);
    }
  };

  const recarregar = () => {
    setLoading(true);
    setErroLista(null);
    setTotalSupabase(null);
    fetch('/api/admin/colaboradores', {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (r) => {
        let res: { ok?: boolean; erro?: string; colaboradores?: unknown; total_supabase?: number };
        try {
          res = (await r.json()) as typeof res;
        } catch {
          setErroLista(`Resposta inválida (${r.status}). O servidor pode estar sem SUPABASE_SERVICE_ROLE_KEY na Vercel.`);
          setColaboradores([]);
          return;
        }
        if (!r.ok || res.ok === false) {
          setErroLista(res.erro || `Erro ${r.status}. Tente sair e entrar no admin novamente.`);
          setColaboradores([]);
          return;
        }
        if (typeof res.total_supabase === 'number') {
          setTotalSupabase(res.total_supabase);
        }
        if (Array.isArray(res.colaboradores)) {
          setColaboradores(
            res.colaboradores.map((c: Record<string, unknown>) => ({
              id: String(c.id ?? ''),
              nome: String(c.nome ?? ''),
              cpf: String(c.cpf ?? ''),
              email: c.email != null ? String(c.email) : null,
              telefone: c.telefone != null ? String(c.telefone) : null,
              cargo: c.cargo != null ? String(c.cargo) : null,
              setor: c.setor != null ? String(c.setor) : null,
              unidade: (() => {
                const u = c.unidades as { nome?: string; slug?: string } | undefined;
                return { nome: u?.nome != null ? String(u.nome) : '-', slug: u?.slug };
              })(),
              onboarding_completo: c.onboarding_completo === true,
              role: c.role ? String(c.role) : undefined,
            }))
          );
        } else {
          setErroLista('Resposta inválida da API (lista de colaboradores).');
          setColaboradores([]);
        }
      })
      .catch(() => {
        setErroLista('Falha de rede ao carregar colaboradores.');
        setColaboradores([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    recarregar();
  }, []);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPodeEditarCadastro(d?.pode_editar_cadastro === true))
      .catch(() => setPodeEditarCadastro(false));
  }, []);

  const { opcoesUnidadeDados, colaboradoresFiltrados } = useMemo(() => {
    const nomesExtras = Array.from(
      new Set(colaboradores.map((c) => c.unidade?.nome?.trim()).filter((v): v is string => !!v))
    ).sort();
    const filtrados = colaboradores.filter((c) => {
      if (filtroSetor && (c.setor?.trim() || '') !== filtroSetor) return false;
      if (filtroCargo.trim()) {
        const q = filtroCargo.trim().toLowerCase();
        if (!(c.cargo?.toLowerCase().includes(q) ?? false)) return false;
      }
      if (filtroAcesso && String(c.role || 'colaborador').toLowerCase() !== filtroAcesso) return false;
      if (filtroUnidade && (c.unidade?.nome?.trim() || '') !== filtroUnidade) return false;
      return true;
    });
    const rotulos = [...UNIDADES_CADASTRO.map((u) => u.label), ...nomesExtras.filter((n) => !UNIDADES_CADASTRO.some((u) => u.label === n))];
    const opcoesUnidadeDados = Array.from(new Set(rotulos)).sort();
    return { opcoesUnidadeDados, colaboradoresFiltrados: filtrados };
  }, [colaboradores, filtroSetor, filtroCargo, filtroAcesso, filtroUnidade]);

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

  const handleResetSenha = async (id: string, nome: string) => {
    if (
      !confirm(
        `Resetar senha de "${nome}"?\n\nA senha volta para 123456 e a pessoa será obrigada a trocar no próximo acesso. O perfil e o onboarding permanecem intactos.\n\nAvise o colaborador por um canal confiável.`
      )
    ) {
      return;
    }

    setResetandoSenha(id);
    try {
      const res = await fetch(`/api/admin/colaboradores/${id}/redefinir-senha-padrao`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.mensagem || 'Senha redefinida para 123456.');
      } else {
        alert(data.erro || 'Erro ao resetar senha.');
      }
    } catch {
      alert('Erro ao resetar senha.');
    } finally {
      setResetandoSenha(null);
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
      {erroLista && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erroLista}
        </div>
      )}

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

      {colaboradores.length === 0 && !erroLista ? (
        <div className="py-8 space-y-4 max-w-xl">
          <p className="text-coffee-base font-medium">Nenhum colaborador na lista desta tela.</p>
          {totalSupabase !== null && (
            <p className="text-sm text-coffee-100">
              Linhas na tabela <code className="text-xs bg-cream-200 px-1 rounded">colaboradores</code> neste banco:{' '}
              <strong>{totalSupabase}</strong>
            </p>
          )}
          {totalSupabase === 0 && (
            <p className="text-sm text-coffee-100">
              O banco ligado a este site está vazio: cadastre em <strong>Cadastrar</strong> ou importe no Supabase
              (Table Editor / SQL). Se você cadastrou em outro projeto Supabase, confira as variáveis de ambiente na
              Vercel: <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
              <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> devem ser do mesmo projeto.
            </p>
          )}
          <p className="text-sm text-coffee-100">
            <a
              href="/api/admin/diagnostico"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dourado-base font-medium hover:underline"
            >
              Abrir diagnóstico do banco (nova aba)
            </a>{' '}
            — mostra totais e se a chave de serviço está configurada.
          </p>
          <p className="text-sm">
            <a
              href="/admin/colaboradores/novo"
              className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 inline-block"
            >
              Cadastrar colaborador
            </a>
          </p>
        </div>
      ) : colaboradores.length === 0 ? null : (
        <>
          <div className="flex flex-wrap gap-4 mb-4 p-4 rounded-xl border border-cream-300 bg-cream-50">
            <div className="flex flex-col gap-1">
              <label htmlFor="filtro-setor" className="text-xs font-medium text-coffee-100">Setor</label>
              <select
                id="filtro-setor"
                value={filtroSetor}
                onChange={(e) => setFiltroSetor(e.target.value)}
                className="rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base bg-white min-w-[160px]"
              >
                <option value="">Todos os setores</option>
                {SETORES_PREDEFINIDOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filtro-cargo" className="text-xs font-medium text-coffee-100">Cargo (contém)</label>
              <input
                id="filtro-cargo"
                type="search"
                placeholder="Filtrar por cargo"
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base bg-white min-w-[140px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filtro-acesso" className="text-xs font-medium text-coffee-100">Acesso</label>
              <select
                id="filtro-acesso"
                value={filtroAcesso}
                onChange={(e) => setFiltroAcesso(e.target.value)}
                className="rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base bg-white min-w-[140px]"
              >
                {OPCOES_ACESSO.map((opt) => (
                  <option key={opt.value || 'todas'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filtro-unidade" className="text-xs font-medium text-coffee-100">Unidade</label>
              <select
                id="filtro-unidade"
                value={filtroUnidade}
                onChange={(e) => setFiltroUnidade(e.target.value)}
                className="rounded-lg border border-cream-300 px-3 py-2 text-sm text-coffee-base bg-white min-w-[140px]"
              >
                <option value="">Todas as unidades</option>
                {opcoesUnidadeDados.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            {(filtroSetor || filtroCargo.trim() || filtroAcesso || filtroUnidade) && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroSetor('');
                    setFiltroCargo('');
                    setFiltroAcesso('');
                    setFiltroUnidade('');
                  }}
                  className="text-sm text-dourado-base hover:text-dourado-600 font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-coffee-100 mb-2">
            {colaboradoresFiltrados.length} de {colaboradores.length} colaborador(es)
          </p>
          <p className="text-xs text-coffee-100 mb-3">
            Para alterar o acesso (ex.: administrador), use <strong>Editar perfil</strong> ao lado do nome.
          </p>
          <div className="rounded-xl border border-cream-300 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[920px] table-fixed">
            <thead className="bg-cream-200">
              <tr>
                <th className="text-left px-3 py-3 text-coffee-base font-medium w-[26%] align-bottom">
                  <span className="block leading-tight">Nome</span>
                </th>
                <th className="text-left px-3 py-3 text-coffee-base font-medium w-[14%] align-bottom">
                  <span className="block leading-tight">Setor</span>
                </th>
                <th className="text-left px-3 py-3 text-coffee-base font-medium w-[16%] align-bottom">
                  <span className="block leading-tight">Cargo</span>
                </th>
                <th className="text-left px-3 py-3 text-coffee-base font-medium w-[14%] align-bottom">
                  <span className="block leading-tight">Unidade</span>
                </th>
                <th className="text-left px-3 py-3 text-coffee-base font-medium w-[12%] align-bottom">
                  <span className="block leading-tight">Acesso</span>
                </th>
                <th className="text-left px-3 py-3 text-coffee-base font-medium w-[12%] align-bottom">
                  <span className="block leading-tight">Onboarding</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {colaboradoresFiltrados.map((c) => (
                <tr key={c.id} className="border-t border-cream-300 hover:bg-cream-50">
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="text-coffee-base font-medium break-words block">{c.nome}</span>
                        <Link
                          href={`/admin/colaboradores/${c.id}/editar`}
                          replace
                          className="text-dourado-base hover:text-dourado-600 text-xs font-semibold underline underline-offset-2 w-fit mt-1 inline-block"
                        >
                          Editar perfil
                        </Link>
                      </div>
                      {podeEditarCadastro && (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResetSenha(c.id, c.nome)}
                            disabled={resetandoSenha === c.id || excluindo === c.id}
                            className="text-amber-700 hover:text-amber-900 text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                            title="Senha padrão 123456; troca obrigatória no próximo login"
                          >
                            {resetandoSenha === c.id ? 'Resetando…' : 'Resetar senha'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluir(c.id, c.nome)}
                            disabled={excluindo === c.id || resetandoSenha === c.id}
                            className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                          >
                            {excluindo === c.id ? 'Excluindo…' : 'Excluir'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-coffee-100 align-top break-words">{c.setor || '-'}</td>
                  <td className="px-3 py-3 text-coffee-100 align-top break-words">{c.cargo || '-'}</td>
                  <td className="px-3 py-3 text-coffee-100 align-top break-words">{c.unidade.nome}</td>
                  <td className="px-3 py-3 text-coffee-100 align-top">
                    <span className="inline-block">{labelAcessoPortal(c.role)}</span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {c.onboarding_completo ? (
                      <span className="text-green-600">Concluído</span>
                    ) : (
                      <>
                        <span className="text-amber-600">Pendente</span>
                        <button
                          type="button"
                          onClick={() => handleConcluirOnboarding(c.id, c.nome)}
                          disabled={concluindo === c.id}
                          className="ml-2 text-dourado-base hover:text-dourado-600 text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                        >
                          {concluindo === c.id ? '…' : 'Concluir'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-coffee-100">
        Cadastrar, editar, resetar senha e excluir: admin, RH e sócios. Resetar senha volta para 123456 e exige troca no próximo acesso, sem apagar perfil nem onboarding.
        Pedidos feitos em «Esqueci minha senha» aparecem em{' '}
        <Link href="/admin/redefinicoes-senha" className="text-dourado-base font-medium hover:underline">
          Redefinições de senha
        </Link>
        .
      </p>
    </div>
  );
}
