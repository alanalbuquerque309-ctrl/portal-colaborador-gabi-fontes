'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { SETORES_PREDEFINIDOS, UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { normalizePortalRole } from '@/lib/roles';

const OPCOES_ROLE = [
  { value: 'colaborador', label: 'Colaborador', desc: 'Equipe — portal' },
  { value: 'gerente', label: 'Gerente (líder)', desc: 'Portal + avaliação da equipe' },
  { value: 'admin', label: 'Administrador', desc: 'Portal + painel admin' },
  { value: 'socio', label: 'Sócio', desc: 'Perfil legado — acesso total' },
];

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function podeSerLider(role: string | null | undefined, cargo: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  if (r === 'socio') return false;
  if (r === 'admin' || r === 'gerente' || r === 'master') return true;
  const roleRaw = normalizeText(role);
  if (
    roleRaw.includes('gerente') ||
    roleRaw.includes('sub gerente') ||
    roleRaw.includes('subgerente') ||
    roleRaw.includes('chefe') ||
    roleRaw.includes('confeiteiro') ||
    roleRaw.includes('administrador') ||
    roleRaw.includes('adminisrtador')
  ) {
    return true;
  }
  const c = normalizeText(cargo);
  if (!c) return false;
  return (
    c.includes('gerente') ||
    c.includes('sub gerente') ||
    c.includes('subgerente') ||
    c.includes('chefe') ||
    c.includes('confeiteiro') ||
    c.includes('administrador') ||
    c.includes('adminisrtador')
  );
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function formatDateForInput(d: string | null | undefined): string {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

export default function EditarColaboradorPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    dataAdmissao: '',
    cargo: '',
    setor: '',
    role: 'colaborador',
    unidade: '',
  });
  const [unidadeLegado, setUnidadeLegado] = useState<{ slug: string; label: string } | null>(null);
  const [todosColaboradores, setTodosColaboradores] = useState<
    { id: string; nome: string; unidade_id: string | null; role: string | null; cargo: string | null }[]
  >([]);
  const [lideresIds, setLideresIds] = useState<string[]>([]);
  const [podeRedefinirSenhaPadrao, setPodeRedefinirSenhaPadrao] = useState(false);
  const [redefinindoSenha, setRedefinindoSenha] = useState(false);
  const [msgRedefinir, setMsgRedefinir] = useState('');

  const opcoesUnidade = useMemo(() => {
    const base = [...UNIDADES_CADASTRO];
    if (unidadeLegado && !base.some((u) => u.slug === unidadeLegado.slug)) {
      base.push({ slug: unidadeLegado.slug, label: unidadeLegado.label });
    }
    return base;
  }, [unidadeLegado]);

  useEffect(() => {
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const r0 = String(d?.colaborador?.role ?? '').toLowerCase();
        setPodeRedefinirSenhaPadrao(r0 === 'master');
      })
      .catch(() => setPodeRedefinirSenhaPadrao(false));
  }, []);

  useEffect(() => {
    fetch('/api/admin/colaboradores', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.colaboradores)) {
          setTodosColaboradores(
            data.colaboradores.map(
              (c: { id: string; nome: string; unidade_id?: string | null; role?: string | null; cargo?: string | null }) => ({
                id: c.id,
                nome: c.nome,
                unidade_id: c.unidade_id ?? null,
                role: c.role ?? null,
                cargo: c.cargo ?? null,
              })
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    fetch(`/api/admin/colaboradores/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok || !data.colaborador) {
          setErro(data.erro || 'Não foi possível carregar.');
          return;
        }
        const c = data.colaborador as Record<string, unknown>;
        const rawUn = c.unidades as { slug?: string; nome?: string } | { slug?: string; nome?: string }[] | null;
        const un = Array.isArray(rawUn) ? rawUn[0] : rawUn;
        const slug = un?.slug ?? '';
        if (slug && !UNIDADES_CADASTRO.some((u) => u.slug === slug)) {
          setUnidadeLegado({
            slug,
            label: `${un?.nome?.trim() || slug} (legado — troque pela unidade correta)`,
          });
        } else {
          setUnidadeLegado(null);
        }
        const lideres = Array.isArray(c.lideres_ids)
          ? c.lideres_ids.map((liderId) => String(liderId)).filter(Boolean)
          : c.lider_id != null
            ? [String(c.lider_id)]
            : [];
        setLideresIds(lideres);
        const rawRole = String(c.role || 'colaborador').toLowerCase();
        const roleNormalizado = rawRole === 'master' ? 'gerente' : rawRole;
        setForm({
          nome: String(c.nome ?? ''),
          cpf: String(c.cpf ?? ''),
          email: c.email != null ? String(c.email) : '',
          telefone: c.telefone != null ? String(c.telefone) : '',
          endereco: c.endereco != null ? String(c.endereco) : '',
          dataAdmissao: formatDateForInput(c.data_admissao as string | undefined),
          cargo: c.cargo != null ? String(c.cargo) : '',
          setor: c.setor != null ? String(c.setor) : '',
          role: roleNormalizado || 'colaborador',
          unidade: slug,
        });
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [id]);

  const opcoesLider = useMemo(() => {
    return todosColaboradores
      .filter((c) => c.id !== id && podeSerLider(c.role, c.cargo))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [todosColaboradores, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório.');
      return;
    }
    if (!form.unidade) {
      setErro('Selecione uma unidade.');
      return;
    }
    setEnviando(true);
    const body: Record<string, unknown> = {
      nome: form.nome.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      endereco: form.endereco.trim() || null,
      data_admissao: form.dataAdmissao ? form.dataAdmissao : null,
      cargo: form.cargo.trim() || null,
      setor: form.setor.trim() || null,
      role: form.role,
    };
    if (isUuid(form.unidade)) {
      body.unidade_id = form.unidade;
    } else {
      body.unidade_slug = form.unidade;
    }
    body.lideres_ids = form.role === 'colaborador' ? lideresIds : [];
    try {
      const res = await fetch(`/api/admin/colaboradores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace('/admin/colaboradores');
      } else {
        setErro(data.erro || 'Erro ao salvar.');
      }
    } catch {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleRedefinirSenhaPadrao = async () => {
    if (!podeRedefinirSenhaPadrao || !id) return;
    setMsgRedefinir('');
    setRedefinindoSenha(true);
    try {
      const res = await fetch(`/api/admin/colaboradores/${id}/redefinir-senha-padrao`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMsgRedefinir(data.mensagem || 'Senha redefinida para 123456. O colaborador deve trocar no próximo acesso.');
      } else {
        setMsgRedefinir(data.erro || 'Não foi possível redefinir.');
      }
    } catch {
      setMsgRedefinir('Erro de conexão.');
    } finally {
      setRedefinindoSenha(false);
    }
  };

  if (!id) {
    return <p className="text-coffee-base">ID inválido.</p>;
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando…" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/colaboradores"
          replace
          className="text-sm text-dourado-base hover:underline font-medium"
        >
          Voltar para colaboradores
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">Editar colaborador</h1>
        <p className="text-sm text-coffee-100 mt-1">
          Ajuste dados, setor, cargo, unidade e <strong>acesso</strong>. CPF não pode ser alterado aqui. O login no
          portal é pelo <strong>celular</strong> cadastrado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-coffee-base mb-1">
            Nome *
          </label>
          <input
            id="nome"
            type="text"
            required
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-coffee-base mb-1">
            CPF (cadastro interno)
          </label>
          <input
            id="cpf"
            type="text"
            readOnly
            value={form.cpf}
            placeholder="Pendente — colaborador informa no portal"
            className="w-full rounded-lg border border-cream-200 bg-cream-100 px-3 py-2 text-coffee-100 cursor-not-allowed placeholder:text-coffee-100/70"
          />
          {!form.cpf?.trim() && (
            <p className="text-xs text-coffee-100 mt-1">Sem CPF: o colaborador completa no primeiro acesso ao portal.</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-coffee-base mb-1">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="telefone" className="block text-sm font-medium text-coffee-base mb-1">
            Celular (login no portal)
          </label>
          <input
            id="telefone"
            type="tel"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="endereco" className="block text-sm font-medium text-coffee-base mb-1">
            Endereço
          </label>
          <input
            id="endereco"
            type="text"
            value={form.endereco}
            onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="dataAdmissao" className="block text-sm font-medium text-coffee-base mb-1">
            Data de Admissão
          </label>
          <input
            id="dataAdmissao"
            type="date"
            value={form.dataAdmissao}
            onChange={(e) => setForm((f) => ({ ...f, dataAdmissao: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="setor" className="block text-sm font-medium text-coffee-base mb-1">
            Setor
          </label>
          <select
            id="setor"
            value={form.setor}
            onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          >
            <option value="">Nenhum / definir depois</option>
            {SETORES_PREDEFINIDOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cargo" className="block text-sm font-medium text-coffee-base mb-1">
            Cargo
          </label>
          <input
            id="cargo"
            type="text"
            placeholder="Ex: Barista, coordenador"
            value={form.cargo}
            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Acesso *</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Função">
            {OPCOES_ROLE.map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col items-start justify-center min-h-[72px] rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer touch-manipulation ${
                  form.role === opt.value
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={form.role === opt.value}
                  onChange={() => setForm((f) => ({ ...f, role: opt.value }))}
                  className="sr-only"
                />
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs text-coffee-100 mt-0.5 leading-snug">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-coffee-base mb-1">
            Líderes diretos
          </span>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-cream-300 bg-white p-2 space-y-1">
            {opcoesLider.length === 0 ? (
              <p className="px-2 py-3 text-sm text-coffee-100">Nenhuma liderança disponível.</p>
            ) : (
              opcoesLider.map((c) => {
                const checked = lideresIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer ${
                      checked ? 'bg-dourado-50 text-coffee-base' : 'hover:bg-cream-50 text-coffee-base'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setLideresIds((atual) =>
                          e.target.checked
                            ? Array.from(new Set([...atual, c.id]))
                            : atual.filter((liderId) => liderId !== c.id)
                        )
                      }
                      className="h-4 w-4"
                    />
                    <span>{c.nome}</span>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-coffee-100 mt-1">
            Para a maioria dos casos, use{' '}
            <Link href="/admin/lideres-por-setor" className="text-dourado-600 underline">
              Liderança por setor
            </Link>
            : com unidade e setor corretos, os líderes do setor vinculam-se automaticamente. Use esta lista só
            para exceções (líder extra fora do setor).
          </p>
        </div>

        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Unidade *</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Unidade">
            {opcoesUnidade.map((opt) => (
              <label
                key={opt.slug}
                className={`flex items-center min-h-[48px] rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer touch-manipulation ${
                  form.unidade === opt.slug
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
                }`}
              >
                <input
                  type="radio"
                  name="unidade"
                  value={opt.slug}
                  checked={form.unidade === opt.slug}
                  onChange={() => setForm((f) => ({ ...f, unidade: opt.slug }))}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        {podeRedefinirSenhaPadrao && (
          <div className="rounded-lg border border-cream-300 bg-cream-50 p-4 space-y-2">
            <p className="text-sm text-coffee-base font-medium">Redefinir senha (master)</p>
            <p className="text-xs text-coffee-100">
              Volta a senha para o padrão <strong>123456</strong> e exige troca no próximo acesso ao portal.
            </p>
            {msgRedefinir && (
              <p className={`text-sm ${msgRedefinir.includes('Erro') || msgRedefinir.includes('Não foi') ? 'text-red-600' : 'text-green-700'}`}>
                {msgRedefinir}
              </p>
            )}
            <button
              type="button"
              disabled={redefinindoSenha}
              onClick={handleRedefinirSenhaPadrao}
              className="rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {redefinindoSenha ? 'Redefinindo…' : 'Redefinir para senha padrão (123456)'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
          >
            {enviando ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <Link
            href="/admin/colaboradores"
            replace
            className="rounded-lg border border-cream-300 px-4 py-2 text-coffee-base font-medium hover:bg-cream-100 transition-colors inline-flex items-center"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
