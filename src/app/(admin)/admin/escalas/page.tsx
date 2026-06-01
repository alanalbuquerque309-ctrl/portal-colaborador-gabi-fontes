'use client';

import { useMemo, useState, useEffect } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { SETORES_PREDEFINIDOS, UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';

interface Colaborador {
  id: string;
  nome: string;
  setor: string | null;
  unidade_nome?: string;
  unidade_slug?: string;
}

interface EscalaLinha {
  id: string;
  data: string;
  colaborador_nome: string;
  setor: string | null;
  unidade_nome: string;
  situacao: 'folga' | 'trabalho';
}

function mesAtualInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  if (!y || !m) return mes;
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function EscalasPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [escalas, setEscalas] = useState<EscalaLinha[]>([]);
  const [form, setForm] = useState({
    colaborador_id: '',
    data: '',
    hora_entrada: '08:00',
    hora_saida: '14:00',
    observacao: '',
  });
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [erroBusca, setErroBusca] = useState('');
  const [pesquisou, setPesquisou] = useState(false);
  const [total, setTotal] = useState(0);
  const [avisoBusca, setAvisoBusca] = useState('');
  const [aplicandoJunho, setAplicandoJunho] = useState(false);
  const [msgJunho, setMsgJunho] = useState('');

  const [filtroMes, setFiltroMes] = useState(mesAtualInput);
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroColaborador, setFiltroColaborador] = useState('');

  useEffect(() => {
    fetch('/api/admin/colaboradores-para-escala', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.colaboradores)) {
          setColaboradores(data.colaboradores);
        }
      });
  }, []);

  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter((c) => {
      if (filtroUnidade && c.unidade_slug !== filtroUnidade) return false;
      if (filtroSetor && (c.setor ?? '') !== filtroSetor) return false;
      return true;
    });
  }, [colaboradores, filtroUnidade, filtroSetor]);

  const aplicarJunho2026 = async () => {
    if (
      !window.confirm(
        'Gerar escalas de junho/2026 para os colaboradores do documento «Folgas de domingo» (Mesquita, Barra, Nova Iguaçu)? Isso grava no banco e atualiza tipo_escala.'
      )
    ) {
      return;
    }
    setAplicandoJunho(true);
    setMsgJunho('');
    setErroBusca('');
    try {
      const res = await fetch('/api/admin/escalas/aplicar-junho-2026', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const extra = Array.isArray(data.erros) && data.erros.length ? `\n${data.erros.join('\n')}` : '';
        const nao = Array.isArray(data.nao_encontrados) && data.nao_encontrados.length
          ? `\nNomes não encontrados: ${data.nao_encontrados.join('; ')}`
          : '';
        setErroBusca((data.erro ?? `Erro ${res.status}: não foi possível gerar junho/2026.`) + extra + nao);
        return;
      }
      const nao = (data.nao_encontrados ?? []) as string[];
      setMsgJunho(
        `Pronto: ${data.aplicados ?? 0} colaborador(es), ${data.dias_gravados ?? 0} dias gravados.` +
          (nao.length ? ` Não encontrados: ${nao.join('; ')}` : '')
      );
      if (filtroMes === '2026-06') pesquisar();
    } catch {
      setErroBusca('Falha de conexão ao gerar escalas de junho.');
    } finally {
      setAplicandoJunho(false);
    }
  };

  const pesquisar = () => {
    setErroBusca('');
    setAvisoBusca('');
    setLoading(true);
    setPesquisou(true);
    const params = new URLSearchParams();
    params.set('mes', filtroMes);
    if (filtroUnidade) params.set('unidade_slug', filtroUnidade);
    if (filtroSetor) params.set('setor', filtroSetor);
    if (filtroColaborador) params.set('colaborador_id', filtroColaborador);
    params.set('incluir_geradas', '1');

    fetch(`/api/admin/escalas?${params}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErroBusca(data.erro ?? 'Erro ao buscar escalas.');
          setEscalas([]);
          setTotal(0);
          return;
        }
        setEscalas(Array.isArray(data.escalas) ? data.escalas : []);
        setTotal(Number(data.total ?? 0));
        setAvisoBusca(typeof data.aviso === 'string' ? data.aviso : '');
      })
      .catch(() => {
        setErroBusca('Falha de conexão ao buscar escalas.');
        setEscalas([]);
      })
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.colaborador_id || !form.data || !form.hora_entrada || !form.hora_saida) {
      setErro('Preencha colaborador, data, entrada e saída.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/escalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          colaborador_id: form.colaborador_id,
          data: form.data,
          hora_entrada: form.hora_entrada,
          hora_saida: form.hora_saida,
          observacao: form.observacao.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setForm((f) => ({ ...f, data: '', observacao: '' }));
        if (pesquisou) pesquisar();
      } else {
        setErro(data.erro || 'Erro ao cadastrar escala.');
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-coffee-base mb-6">Escalas</h1>

      <section className="mb-8 rounded-xl border border-cream-300 bg-cream-50/50 p-5">
        <h2 className="text-lg font-medium text-coffee-base mb-4">Cadastrar turno avulso</h2>
        <p className="text-xs text-coffee-100 mb-4">
          Use só para ajuste pontual. O calendário do mês vem do regime no cadastro ou do script de junho.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end max-w-3xl">
          <div className="min-w-[200px]">
            <label htmlFor="colaborador" className="block text-xs font-medium text-coffee-100 mb-1">
              Colaborador *
            </label>
            <select
              id="colaborador"
              required
              value={form.colaborador_id}
              onChange={(e) => setForm((f) => ({ ...f, colaborador_id: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.unidade_nome ? `(${c.unidade_nome})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="data" className="block text-xs font-medium text-coffee-100 mb-1">
              Data *
            </label>
            <input
              id="data"
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="hora_entrada" className="block text-xs font-medium text-coffee-100 mb-1">
              Entrada *
            </label>
            <input
              id="hora_entrada"
              type="time"
              required
              value={form.hora_entrada}
              onChange={(e) => setForm((f) => ({ ...f, hora_entrada: e.target.value }))}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="hora_saida" className="block text-xs font-medium text-coffee-100 mb-1">
              Saída *
            </label>
            <input
              id="hora_saida"
              type="time"
              required
              value={form.hora_saida}
              onChange={(e) => setForm((f) => ({ ...f, hora_saida: e.target.value }))}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[120px]">
            <label htmlFor="observacao" className="block text-xs font-medium text-coffee-100 mb-1">
              Observação
            </label>
            <input
              id="observacao"
              type="text"
              placeholder="Ex: Folga"
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {enviando ? 'Salvando…' : 'Adicionar'}
          </button>
        </form>
        {erro && <p className="text-red-600 text-sm mt-2">{erro}</p>}
      </section>

      <section className="rounded-xl border border-cream-300 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-medium text-coffee-base mb-1">Consultar escalas do mês</h2>
            <p className="text-xs text-coffee-100">
              Filtre por unidade, setor ou colaborador. A lista mostra o mês inteiro (folga ou trabalho).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void aplicarJunho2026()}
            disabled={aplicandoJunho}
            className="shrink-0 rounded-lg border border-dourado-400 bg-cream-50 text-coffee-base px-4 py-2 text-sm font-medium hover:bg-cream-100 disabled:opacity-50"
          >
            {aplicandoJunho ? 'Gerando junho/2026…' : 'Gerar escalas junho/2026'}
          </button>
        </div>
        {msgJunho && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
            {msgJunho}
          </p>
        )}

        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label htmlFor="filtro-mes" className="block text-xs font-medium text-coffee-100 mb-1">
              Mês
            </label>
            <input
              id="filtro-mes"
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="rounded-lg border border-cream-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[140px]">
            <label htmlFor="filtro-unidade" className="block text-xs font-medium text-coffee-100 mb-1">
              Unidade
            </label>
            <select
              id="filtro-unidade"
              value={filtroUnidade}
              onChange={(e) => {
                setFiltroUnidade(e.target.value);
                setFiltroColaborador('');
              }}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="filtro-setor" className="block text-xs font-medium text-coffee-100 mb-1">
              Setor
            </label>
            <select
              id="filtro-setor"
              value={filtroSetor}
              onChange={(e) => {
                setFiltroSetor(e.target.value);
                setFiltroColaborador('');
              }}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {SETORES_PREDEFINIDOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label htmlFor="filtro-colab" className="block text-xs font-medium text-coffee-100 mb-1">
              Colaborador
            </label>
            <select
              id="filtro-colab"
              value={filtroColaborador}
              onChange={(e) => setFiltroColaborador(e.target.value)}
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {colaboradoresFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={pesquisar}
            disabled={loading}
            className="rounded-lg bg-dourado-base px-5 py-2.5 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50 min-h-[42px]"
          >
            {loading ? 'Buscando…' : 'Pesquisar'}
          </button>
        </div>

        {erroBusca && <p className="text-red-600 text-sm mb-3">{erroBusca}</p>}

        {!pesquisou ? (
          <div className="rounded-lg border border-dashed border-cream-300 bg-cream-50 p-6 text-sm text-coffee-base">
            Escolha o mês e os filtros, depois clique em <strong>Pesquisar</strong>.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <XicaraCarregando size="md" label="Carregando escalas…" />
          </div>
        ) : escalas.length === 0 ? (
          <div className="rounded-lg border border-cream-300 bg-cream-50 p-6 space-y-3">
            <p className="text-coffee-base">
              Nenhum dia encontrado em {labelMes(filtroMes)} com esses filtros.
            </p>
            {avisoBusca ? (
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {avisoBusca}
              </p>
            ) : (
              <p className="text-sm text-coffee-100">
                Para junho/2026, use <strong>Gerar escalas junho/2026</strong> acima (documento Folgas de
                domingo). Demais meses exigem regime 5x2 ou 6x1 no cadastro ou lançamento manual.
              </p>
            )}
            {filtroMes === '2026-06' && (
              <button
                type="button"
                onClick={() => void aplicarJunho2026()}
                disabled={aplicandoJunho}
                className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 text-sm font-medium hover:bg-dourado-400 disabled:opacity-50"
              >
                {aplicandoJunho ? 'Gerando…' : 'Gerar escalas junho/2026 agora'}
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-coffee-100 mb-2">
              {labelMes(filtroMes)} · {total} registro{total === 1 ? '' : 's'}
            </p>
            <div className="rounded-xl border border-cream-300 overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-cream-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-coffee-base font-medium">Colaborador</th>
                    <th className="text-left px-4 py-3 text-coffee-base font-medium">Unidade</th>
                    <th className="text-left px-4 py-3 text-coffee-base font-medium">Setor</th>
                    <th className="text-left px-4 py-3 text-coffee-base font-medium">Data</th>
                    <th className="text-left px-4 py-3 text-coffee-base font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {escalas.map((e) => (
                    <tr
                      key={e.id}
                      className={`border-t border-cream-300 ${
                        e.situacao === 'folga' ? 'bg-cafeteria-50/70' : 'hover:bg-cream-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-coffee-base font-medium">{e.colaborador_nome}</td>
                      <td className="px-4 py-3 text-coffee-100">{e.unidade_nome || '—'}</td>
                      <td className="px-4 py-3 text-coffee-100">{e.setor || '—'}</td>
                      <td className="px-4 py-3 text-coffee-100 whitespace-nowrap">
                        {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {e.situacao === 'folga' ? (
                          <span className="font-medium text-cafeteria-700">Folga</span>
                        ) : (
                          <span className="text-coffee-base">Trabalho</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
