'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarSetoresCadastro } from '@/lib/tenant/org-catalog';
import { useUnidadesCadastro } from '@/lib/tenant/use-unidades-cadastro';

const OPCOES_ROLE = [
  { value: 'colaborador', label: 'Colaborador', desc: 'Equipe — apenas portal' },
  { value: 'gerente', label: 'Gerente (líder)', desc: 'Portal + avaliação da equipe' },
  { value: 'rh', label: 'RH', desc: 'Portal + cadastros e redefinições de senha' },
  { value: 'admin', label: 'Administrador', desc: 'Portal + painel (sócios costumam usar este perfil)' },
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
  const unidadesCadastro = useUnidadesCadastro();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [podeEditarCadastro, setPodeEditarCadastro] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPodeEditarCadastro(d?.pode_editar_cadastro === true))
      .catch(() => setPodeEditarCadastro(false));
  }, []);
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    dataAdmissao: '',
    dataNascimento: '',
    cargo: '',
    setor: '',
    role: 'colaborador',
    unidade: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const valorSelecionado = form.unidade;
    if (!valorSelecionado) {
      setErro('Selecione a unidade.');
      return;
    }
    if (!form.dataAdmissao) {
      setErro('Informe a data de admissão (contratação).');
      return;
    }
    if (!form.setor.trim()) {
      setErro('Selecione o setor.');
      return;
    }
    setEnviando(true);
    const body: Record<string, unknown> = {
      nome: form.nome.trim(),
      cpf: form.cpf.replace(/\D/g, ''),
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      endereco: form.endereco.trim() || undefined,
      data_admissao: formatDateForInput(form.dataAdmissao),
      data_nascimento: form.dataNascimento ? formatDateForInput(form.dataNascimento) : undefined,
      cargo: form.cargo.trim() || undefined,
      setor: form.setor.trim(),
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
        const n = (data.lideres_vinculados as string[] | undefined)?.length ?? 0;
        if (form.role === 'colaborador' && form.setor.trim() && n === 0) {
          setErro(
            'Colaborador salvo, mas nenhum líder foi vinculado. Aplique o mapa em Admin → Liderança por setor.'
          );
          return;
        }
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
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-2">
        Cadastrar colaborador
      </h1>
      <p className="text-sm text-coffee-100 mb-6 max-w-md">
        Novo cadastro = <strong className="text-coffee-base">contratação</strong>. Data de admissão, setor e unidade
        são obrigatórios.
      </p>

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
          <label htmlFor="cpf" className="block text-sm font-medium text-coffee-base mb-1">
            CPF (opcional — pode preencher no portal)
          </label>
          <input
            id="cpf"
            name="cpf"
            type="text"
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
          <label htmlFor="telefone" className="block text-sm font-medium text-coffee-base mb-1">
            Celular * (login no portal)
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            required
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
          <label htmlFor="dataNascimento" className="block text-sm font-medium text-coffee-base mb-1">
            Data de nascimento (aniversário)
          </label>
          <input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            value={form.dataNascimento}
            onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
          <p className="text-xs text-coffee-100 mt-1">
            Alimenta o mural de aniversariantes. Não use a data de admissão aqui.
          </p>
        </div>
        <div>
          <label htmlFor="dataAdmissao" className="block text-sm font-medium text-coffee-base mb-1">
            Data de admissão * (contratação)
          </label>
          <input
            id="dataAdmissao"
            name="dataAdmissao"
            type="date"
            required
            value={form.dataAdmissao}
            onChange={(e) => setForm((f) => ({ ...f, dataAdmissao: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          />
          <p className="text-xs text-coffee-100 mt-1">
            Obrigatório. Usada para acompanhar contratações e rotatividade.
          </p>
        </div>
        <div>
          <label htmlFor="setor" className="block text-sm font-medium text-coffee-base mb-1">Setor *</label>
          <select
            id="setor"
            required
            value={form.setor}
            onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-coffee-base focus:border-dourado-base focus:outline-none"
          >
            <option value="">Selecione o setor</option>
            {listarSetoresCadastro().map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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
          <span className="block text-sm font-medium text-coffee-base mb-2">Acesso</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Selecione o acesso">
            {OPCOES_ROLE.map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col items-center justify-center min-h-[56px] rounded-lg border-2 px-2 py-3 text-center text-sm font-medium transition-colors cursor-pointer touch-manipulation ${
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
                <span className="block font-semibold">{opt.label}</span>
                <span className="block text-xs text-coffee-100 mt-0.5">{opt.desc}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-coffee-100 mt-2">
            Administrador: portal + painel. Colaborador: apenas portal.
          </p>
        </div>
        <div>
          <span className="block text-sm font-medium text-coffee-base mb-2">Unidade *</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Selecione a unidade">
            {unidadesCadastro.map((opt) => (
              <label
                key={opt.slug}
                className={`flex items-center min-h-[48px] rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer touch-manipulation ${
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
        <div className="flex gap-3">
          {podeEditarCadastro === false ? (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Somente admin, RH ou sócios podem cadastrar colaboradores.
            </p>
          ) : (
            <button
              type="submit"
              disabled={enviando || podeEditarCadastro === null}
              className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 transition-colors disabled:opacity-50"
            >
              {enviando ? 'Cadastrando…' : 'Cadastrar'}
            </button>
          )}
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
