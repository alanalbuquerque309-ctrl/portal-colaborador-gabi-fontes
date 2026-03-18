'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OPCOES_ROLE = [
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'admin', label: 'Administrador' },
  { value: 'socio', label: 'Sócio' },
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

function formatDateForInput(d: string): string {
  if (!d) return '';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : d;
}

export default function NovoColaboradorPage() {
  const router = useRouter();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const valorSelecionado = form.unidade;
    if (!valorSelecionado) {
      setErro('Selecione uma unidade.');
      return;
    }
    setEnviando(true);
    const body: Record<string, unknown> = {
      nome: form.nome.trim(),
      cpf: form.cpf.replace(/\D/g, ''),
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      endereco: form.endereco.trim() || undefined,
      data_admissao: form.dataAdmissao ? formatDateForInput(form.dataAdmissao) : undefined,
      cargo: form.cargo.trim() || undefined,
      role: form.role,
    };
    if (isUuid(valorSelecionado)) {
      body.unidade_id = valorSelecionado;
    } else {
      body.unidade_slug = valorSelecionado;
    }
    try {
      const res = await fetch('/api/admin/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/admin/colaboradores');
      } else {
        setErro(data.erro || 'Erro ao cadastrar.');
      }
    } catch {
      setErro('Erro ao cadastrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">
        Cadastrar colaborador
      </h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-coffee-base mb-1">Nome *</label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-coffee-base mb-1">CPF * (login)</label>
          <input
            id="cpf"
            name="cpf"
            type="text"
            required
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-coffee-base mb-1">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="telefone" className="block text-sm font-medium text-coffee-base mb-1">Telefone</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            placeholder="(21) 99999-9999"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="endereco" className="block text-sm font-medium text-coffee-base mb-1">Endereço</label>
          <input
            id="endereco"
            name="endereco"
            type="text"
            placeholder="Rua, número, bairro, cidade"
            value={form.endereco}
            onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="dataAdmissao" className="block text-sm font-medium text-coffee-base mb-1">Data de Admissão</label>
          <input
            id="dataAdmissao"
            name="dataAdmissao"
            type="date"
            value={form.dataAdmissao}
            onChange={(e) => setForm((f) => ({ ...f, dataAdmissao: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="cargo" className="block text-sm font-medium text-coffee-base mb-1">Cargo</label>
          <input
            id="cargo"
            name="cargo"
            type="text"
            placeholder="Ex: Barista, Gerente de loja"
            value={form.cargo}
            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Função</span>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Selecione a função">
            {OPCOES_ROLE.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                className={`min-h-[48px] rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-colors ${
                  form.role === opt.value
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-coffee-100 mt-1">Sócios e administradores têm acesso às unidades.</p>
        </div>
        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Unidade *</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Selecione a unidade">
            {OPCOES_UNIDADE.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, unidade: opt.value }))}
                className={`min-h-[48px] rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  form.unidade === opt.value
                    ? 'border-dourado-base bg-dourado-50 text-coffee-base'
                    : 'border-cream-300 bg-cream-50 text-coffee-base hover:border-cream-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
          >
            {enviando ? 'Cadastrando…' : 'Cadastrar'}
          </button>
          <a
            href="/admin/colaboradores"
            className="rounded-lg border border-cream-300 px-4 py-2 text-coffee-base font-medium hover:bg-cream-100 transition-colors"
          >
            Voltar
          </a>
        </div>
      </form>
    </div>
  );
}
