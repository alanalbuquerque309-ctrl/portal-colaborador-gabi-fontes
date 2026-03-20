'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

const OPCOES_ROLE = [
  { value: 'colaborador', label: 'Colaborador', desc: 'Equipe — portal' },
  { value: 'admin', label: 'Administrador', desc: 'Portal + painel admin (liberado por sócio/admin)' },
  { value: 'socio', label: 'Sócio', desc: 'Proprietários — acesso total' },
];

const OPCOES_UNIDADE = [
  { value: 'matriz', label: 'Matriz (todas as lojas)' },
  { value: 'mesquita', label: 'Mesquita' },
  { value: 'barra', label: 'Barra' },
  { value: 'nova-iguacu', label: 'Nova Iguaçu' },
];

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
    role: 'colaborador',
    unidade: '',
  });

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
        const rawUn = c.unidades as { slug?: string } | { slug?: string }[] | null;
        const un = Array.isArray(rawUn) ? rawUn[0] : rawUn;
        const slug = un?.slug ?? '';
        setForm({
          nome: String(c.nome ?? ''),
          cpf: String(c.cpf ?? ''),
          email: c.email != null ? String(c.email) : '',
          telefone: c.telefone != null ? String(c.telefone) : '',
          endereco: c.endereco != null ? String(c.endereco) : '',
          dataAdmissao: formatDateForInput(c.data_admissao as string | undefined),
          cargo: c.cargo != null ? String(c.cargo) : '',
          role: (c.role as string) || 'colaborador',
          unidade: slug,
        });
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [id]);

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
      role: form.role,
    };
    if (isUuid(form.unidade)) {
      body.unidade_id = form.unidade;
    } else {
      body.unidade_slug = form.unidade;
    }
    try {
      const res = await fetch(`/api/admin/colaboradores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/admin/colaboradores');
      } else {
        setErro(data.erro || 'Erro ao salvar.');
      }
    } catch {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setEnviando(false);
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
          className="text-sm text-dourado-base hover:underline font-medium"
        >
          Voltar para colaboradores
        </Link>
        <h1 className="text-2xl font-display font-semibold text-coffee-base mt-2">Editar colaborador</h1>
        <p className="text-sm text-coffee-100 mt-1">
          Ajuste dados e a <strong>função</strong> (ex.: tornar administrador). CPF não pode ser alterado aqui.
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
            CPF (login)
          </label>
          <input
            id="cpf"
            type="text"
            readOnly
            value={form.cpf}
            className="w-full rounded-lg border border-cream-200 bg-cream-100 px-3 py-2 text-coffee-100 cursor-not-allowed"
          />
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
            Telefone
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
          <label htmlFor="cargo" className="block text-sm font-medium text-coffee-base mb-1">
            Cargo / setor
          </label>
          <input
            id="cargo"
            type="text"
            placeholder="Ex: Barista, CD, Fábrica"
            value={form.cargo}
            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Função *</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Função">
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
          <span className="block text-sm font-medium text-coffee-base mb-2">Unidade *</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Unidade">
            {OPCOES_UNIDADE.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center min-h-[48px] rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer touch-manipulation ${
                  form.unidade === opt.value
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
                }`}
              >
                <input
                  type="radio"
                  name="unidade"
                  value={opt.value}
                  checked={form.unidade === opt.value}
                  onChange={() => setForm((f) => ({ ...f, unidade: opt.value }))}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

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
            className="rounded-lg border border-cream-300 px-4 py-2 text-coffee-base font-medium hover:bg-cream-100 transition-colors inline-flex items-center"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
