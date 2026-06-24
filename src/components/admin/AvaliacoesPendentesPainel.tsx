'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import type { FiltroPendenciasSemana, ItemPendenciaSemana } from '@/lib/avaliacao-pendentes-semana-shared';
import { agregarLideresComPendenciaDeEnvio } from '@/lib/avaliacao-pendentes-semana-shared';
import {
  formatarIntervaloSemanaPtBR,
  semanaAvaliacaoEquipePadraoISO,
} from '@/lib/semana-referencia';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Props = {
  apiBase?: '/api/admin/avaliacoes-pendentes' | '/api/portal/avaliacoes-pendentes';
  autoRefresh?: boolean;
  intervaloMs?: number;
  compacto?: boolean;
  filtroInicial?: FiltroPendenciasSemana;
};

const FILTROS: { id: FiltroPendenciasSemana; label: string }[] = [
  { id: 'pendentes', label: 'Pendentes (líder ou RH)' },
  { id: 'gerente', label: 'Sem líder' },
  { id: 'critico_sexta', label: 'Crítico sexta' },
  { id: 'rh_complemento', label: 'RH (com gerente)' },
  { id: 'rh_rede', label: 'Sem Visita RH' },
];

function rotuloTipo(tipo: ItemPendenciaSemana['tipo']): string {
  switch (tipo) {
    case 'sem_lider':
      return 'Sem líder';
    case 'sem_rh':
      return 'Sem RH';
    case 'sem_lider_e_rh':
      return 'Líder + RH';
    case 'critico_fora_plantao':
      return 'Crítico (fora plantão)';
    case 'critico_sem_avaliacao':
      return 'Crítico sexta';
    default:
      return tipo;
  }
}

function itemCritico(item: ItemPendenciaSemana): boolean {
  return item.tipo === 'critico_fora_plantao' || item.tipo === 'critico_sem_avaliacao';
}

export function AvaliacoesPendentesPainel({
  apiBase = '/api/admin/avaliacoes-pendentes',
  autoRefresh = false,
  intervaloMs = 30000,
  compacto = false,
  filtroInicial,
}: Props) {
  const semanaPadraoInicial = semanaAvaliacaoEquipePadraoISO();
  const [dataRef, setDataRef] = useState(semanaPadraoInicial);
  const dataRefEscolhidaPeloUsuario = useRef(false);
  const [unidadeSlug, setUnidadeSlug] = useState('');
  const [filtro, setFiltro] = useState<FiltroPendenciasSemana>(filtroInicial ?? 'pendentes');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState(formatarIntervaloSemanaPtBR(semanaPadraoInicial));
  const [atualizadoEm, setAtualizadoEm] = useState('');
  const [resumo, setResumo] = useState({
    sem_lider: 0,
    sem_rh_complemento: 0,
    sem_rh_rede: 0,
    criticos: 0,
    criticos_sem_avaliacao: 0,
  });
  const [meta, setMeta] = useState({
    eh_sexta: false,
    alerta_critico_sexta: false,
    semana_padrao: semanaPadraoInicial,
    fora_semana_operacional: false,
    avaliacoes_registradas: 0,
  });
  const [itens, setItens] = useState<ItemPendenciaSemana[]>([]);
  const [filtroLider, setFiltroLider] = useState('');
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [marcandoFeriasId, setMarcandoFeriasId] = useState<string | null>(null);
  const [modalAviso, setModalAviso] = useState(false);
  const [previewAviso, setPreviewAviso] = useState<{
    titulo: string;
    conteudo: string;
    lideres: Array<{ lider_nome: string; total: number; colaboradores: Array<{ nome: string }> }>;
    total_pendentes_lider: number;
  } | null>(null);
  const [exigeConfirmacaoAviso, setExigeConfirmacaoAviso] = useState(true);
  const [gerandoAviso, setGerandoAviso] = useState(false);
  const [erroAviso, setErroAviso] = useState<string | null>(null);

  const podeGerarAviso =
    apiBase === '/api/admin/avaliacoes-pendentes' || apiBase === '/api/portal/avaliacoes-pendentes';

  const porLider = useMemo(() => agregarLideresComPendenciaDeEnvio(itens), [itens]);

  const colaboradoresUnicosSemGerente = useMemo(() => {
    const ids = new Set<string>();
    for (const item of itens) {
      if (
        item.tipo === 'sem_lider' ||
        item.tipo === 'sem_lider_e_rh' ||
        item.tipo === 'critico_fora_plantao' ||
        item.tipo === 'critico_sem_avaliacao'
      ) {
        ids.add(item.colaborador_id);
      }
    }
    return ids.size;
  }, [itens]);

  const semanaSemDados =
    meta.avaliacoes_registradas === 0 && (meta.fora_semana_operacional || colaboradoresUnicosSemGerente > 0);

  const usarSemanaPadrao = () => {
    const padrao = semanaAvaliacaoEquipePadraoISO();
    dataRefEscolhidaPeloUsuario.current = false;
    setDataRef(padrao);
    setIntervalo(formatarIntervaloSemanaPtBR(padrao));
  };

  const itensVisiveis = useMemo(() => {
    if (!filtroLider) return itens;
    return itens.filter((item) =>
      item.responsaveis_lider.some(
        (r) => r.status === 'pendente' && r.lider_nome.trim() === filtroLider
      )
    );
  }, [itens, filtroLider]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = new URLSearchParams({ filtro, _: String(Date.now()) });
      if (dataRef) q.set('data', dataRef);
      if (unidadeSlug) q.set('unidade_slug', unidadeSlug);
      if (busca.trim()) q.set('q', busca.trim());
      const res = await fetch(`${apiBase}?${q}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao carregar.');
        setItens([]);
        return;
      }
      setIntervalo(String(data.intervalo ?? ''));
      if (data.data_referencia && !dataRefEscolhidaPeloUsuario.current) {
        setDataRef(String(data.data_referencia));
      }
      setResumo(
        data.resumo ?? {
          sem_lider: 0,
          sem_rh_complemento: 0,
          sem_rh_rede: 0,
          criticos: 0,
          criticos_sem_avaliacao: 0,
        }
      );
      setMeta({
        eh_sexta: data.meta?.eh_sexta === true,
        alerta_critico_sexta: data.meta?.alerta_critico_sexta === true,
        semana_padrao: String(data.meta?.semana_padrao ?? semanaAvaliacaoEquipePadraoISO()),
        fora_semana_operacional: data.meta?.fora_semana_operacional === true,
        avaliacoes_registradas: Number(data.meta?.avaliacoes_registradas ?? 0),
      });
      setItens(Array.isArray(data.itens) ? data.itens : []);
      setAtualizadoEm(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch {
      setErro('Erro de conexão.');
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [apiBase, busca, dataRef, filtro, unidadeSlug]);

  const abrirPreviewAviso = async () => {
    setErroAviso(null);
    setGerandoAviso(true);
    try {
      const q = new URLSearchParams();
      if (dataRef) q.set('data', dataRef);
      const res = await fetch(`/api/admin/avisos/lembrete-lideres?${q}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setErroAviso(data.erro || 'Erro ao preparar aviso.');
        return;
      }
      setPreviewAviso(data.preview ?? null);
      setModalAviso(true);
    } catch {
      setErroAviso('Erro de conexão.');
    } finally {
      setGerandoAviso(false);
    }
  };

  const publicarAvisoLideres = async () => {
    if (!previewAviso) return;
    setGerandoAviso(true);
    setErroAviso(null);
    try {
      const res = await fetch('/api/admin/avisos/lembrete-lideres', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmar: true,
          data: dataRef || undefined,
          titulo: previewAviso.titulo,
          conteudo: previewAviso.conteudo,
          exige_confirmacao: exigeConfirmacaoAviso,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErroAviso(data.erro || 'Erro ao publicar aviso.');
        return;
      }
      setModalAviso(false);
      setPreviewAviso(null);
      alert(
        `Aviso publicado para liderança (${data.lideres_avisados ?? '?'} líder(es), ${data.total_pendentes ?? '?'} pendência(s)).`
      );
    } catch {
      setErroAviso('Erro de conexão.');
    } finally {
      setGerandoAviso(false);
    }
  };

  const handleExcluir = async (id: string, nome: string) => {
    if (
      !confirm(
        `Excluir colaborador "${nome}"?\n\nUse quando a pessoa já saiu da empresa. A ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    setExcluindoId(id);
    try {
      const res = await fetch(`/api/admin/colaboradores/excluir?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; erro?: string };
      if (data.ok) {
        setItens((prev) => prev.filter((i) => i.colaborador_id !== id));
      } else {
        alert(data.erro || 'Erro ao excluir.');
      }
    } catch {
      alert('Erro ao excluir.');
    } finally {
      setExcluindoId(null);
    }
  };

  const handleMarcarFerias = async (id: string, nome: string) => {
    if (!dataRef) {
      alert('Aguarde o carregamento da semana ou selecione a segunda-feira de referência.');
      return;
    }
    if (
      !confirm(
        `${nome} está de férias na semana ${intervalo || dataRef}?\n\nA semana não recebe nota, sai da lista de pendências e trava avaliação de liderança.`
      )
    ) {
      return;
    }
    setMarcandoFeriasId(id);
    try {
      const res = await fetch(`${apiBase}/ferias`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colaborador_id: id, data_referencia: dataRef }),
      });
      const data = (await res.json()) as { ok?: boolean; erro?: string; mensagem?: string };
      if (data.ok) {
        setItens((prev) => prev.filter((i) => i.colaborador_id !== id));
        if (data.mensagem) alert(data.mensagem);
      } else {
        alert(data.erro || 'Não foi possível registrar férias.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setMarcandoFeriasId(null);
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void carregar(), intervaloMs);
    const onFocus = () => void carregar();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void carregar();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoRefresh, carregar, intervaloMs]);

  const totalVisivel = itensVisiveis.length;

  return (
    <div className={compacto ? 'space-y-3' : 'space-y-4'}>
      <div className={`${compacto ? '' : 'rounded-xl border border-cream-200 bg-white p-4 shadow-sm'} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {!compacto && (
              <h2 className="text-lg font-display font-semibold text-coffee-base">Pendentes da semana</h2>
            )}
            {intervalo && <p className="text-sm text-coffee-100 mt-0.5">{intervalo}</p>}
            {autoRefresh && atualizadoEm && (
              <p className="text-[11px] text-coffee-100 mt-0.5">Atualizado às {atualizadoEm}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {podeGerarAviso && (
              <button
                type="button"
                onClick={() => void abrirPreviewAviso()}
                disabled={gerandoAviso || colaboradoresUnicosSemGerente === 0}
                className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                {gerandoAviso ? '…' : 'Gerar aviso p/ líderes'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void carregar()}
              disabled={carregando}
              className="rounded-lg border border-dourado-base px-3 py-1.5 text-sm font-medium text-coffee-base hover:bg-dourado-50 disabled:opacity-50 shrink-0"
            >
              {carregando ? '…' : 'Atualizar'}
            </button>
          </div>
        </div>

        {meta.alerta_critico_sexta && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            <p className="font-semibold">Alerta crítico — sexta-feira</p>
            <p className="mt-1 text-red-800">
              {resumo.criticos_sem_avaliacao} colaborador(es) sem avaliação de líder
              {resumo.sem_rh_rede > 0 ? ' e sem Visita RH' : ''}. Busque esclarecimentos com a liderança
              antes de fechar a semana.
            </p>
          </div>
        )}

        {(meta.fora_semana_operacional || semanaSemDados) && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-sm text-orange-950">
            <p className="font-semibold">
              {meta.fora_semana_operacional
                ? 'Semana fora do padrão operacional'
                : 'Nenhuma avaliação salva nesta semana'}
            </p>
            <p className="mt-1 text-orange-900">
              {meta.fora_semana_operacional ? (
                <>
                  Você está vendo <strong>{intervalo || dataRef}</strong>, não a semana passada (
                  {formatarIntervaloSemanaPtBR(meta.semana_padrao)}). Números altos e iguais (ex.: 58 em
                  tudo) costumam ser data antiga sem avaliações no banco.
                </>
              ) : (
                <>
                  Zero registros em avaliações para esta segunda-feira. Confira se a data está correta antes
                  de cobrar líderes.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={usarSemanaPadrao}
              className="mt-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Usar semana passada (padrão)
            </button>
          </div>
        )}

        {erroAviso && !modalAviso && <p className="text-sm text-red-600">{erroAviso}</p>}

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-dourado-base/20 text-coffee-base px-2.5 py-1 font-semibold">
            {totalVisivel} na lista
          </span>
          {colaboradoresUnicosSemGerente > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-1">
              {colaboradoresUnicosSemGerente} sem nota de gerente
            </span>
          )}
          {resumo.sem_rh_rede > 0 && (
            <span className="rounded-full bg-cream-100 text-coffee-base px-2.5 py-1">
              {resumo.sem_rh_rede} sem Visita RH
            </span>
          )}
          {resumo.sem_rh_complemento > 0 && (
            <span className="rounded-full bg-cream-100 text-coffee-base px-2.5 py-1">
              {resumo.sem_rh_complemento} RH pendente (gerente já avaliou)
            </span>
          )}
          {resumo.criticos > 0 && (
            <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-1">
              {resumo.criticos} só «fora do plantão»
            </span>
          )}
          {resumo.criticos_sem_avaliacao > 0 && (
            <span
              className={`rounded-full px-2.5 py-1 ${
                meta.eh_sexta ? 'bg-red-100 text-red-800 font-semibold' : 'bg-orange-100 text-orange-900'
              }`}
            >
              {resumo.criticos_sem_avaliacao} crítico{meta.eh_sexta ? ' · sexta' : ''}
            </span>
          )}
          {!semanaSemDados && meta.avaliacoes_registradas > 0 && (
            <span className="rounded-full bg-green-50 text-green-800 px-2.5 py-1">
              {meta.avaliacoes_registradas} avaliações salvas na semana
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-medium text-coffee-base mb-0.5">Semana (segunda)</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              <input
                type="date"
                value={dataRef}
                onChange={(e) => {
                  dataRefEscolhidaPeloUsuario.current = true;
                  setDataRef(e.target.value);
                }}
                className="rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
              />
              {dataRef !== meta.semana_padrao && (
                <button
                  type="button"
                  onClick={usarSemanaPadrao}
                  className="rounded-lg border border-dourado-base px-2 py-1.5 text-xs font-medium text-coffee-base hover:bg-dourado-50"
                >
                  Semana passada
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-coffee-base mb-0.5">Unidade</label>
            <select
              value={unidadeSlug}
              onChange={(e) => setUnidadeSlug(e.target.value)}
              className="rounded-lg border border-cream-300 px-2 py-1.5 text-sm min-w-[140px]"
            >
              <option value="">Todas</option>
              {UNIDADES_CADASTRO.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-medium text-coffee-base mb-0.5">Buscar</label>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, setor…"
              className="w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                filtro === f.id ? 'bg-dourado-base text-cream-100' : 'bg-cream-100 text-coffee-base'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {porLider.length > 0 && !semanaSemDados && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900 mb-0.5">
              Líderes com cards pendentes de envio (toque para focar)
            </p>
            <p className="text-[11px] text-amber-800 mb-1.5">
              Conta colaboradores sem nota de gerente na semana. Em loja 12×36 com dois gerentes, só quem
              está no plantão precisa enviar; «fora do plantão» não conta como fechado.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filtroLider && (
                <button
                  type="button"
                  onClick={() => setFiltroLider('')}
                  className="rounded-full px-2.5 py-1 text-xs font-medium bg-coffee-base text-cream-100"
                >
                  × Todos
                </button>
              )}
              {porLider.map((l) => (
                <button
                  key={l.lider_id}
                  type="button"
                  onClick={() => setFiltroLider((cur) => (cur === l.lider_nome ? '' : l.lider_nome))}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                    filtroLider === l.lider_nome
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {l.lider_nome.split(/\s+/)[0]} · {l.total}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={compacto ? '' : 'rounded-xl border border-cream-200 bg-white p-4 shadow-sm'}>
        {erro && <p className="text-sm text-red-600 mb-2">{erro}</p>}
        {carregando && itens.length === 0 ? (
          <div className="flex justify-center py-10">
            <XicaraCarregando size="md" label="Carregando pendências…" />
          </div>
        ) : itensVisiveis.length === 0 ? (
          <p className="text-sm text-green-700 text-center py-8">
            {semanaSemDados
              ? 'Selecione a semana passada (padrão) para ver pendências reais.'
              : 'Nenhuma pendência neste filtro.'}
          </p>
        ) : (
          <ul className="space-y-2 list-none m-0 p-0">
            {itensVisiveis.map((item) => (
              <li
                key={item.colaborador_id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  itemCritico(item)
                    ? 'border-red-200 bg-red-50/80'
                    : 'border-cream-200 bg-cream-50/50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee-base">{item.colaborador_nome}</p>
                    <p className="text-xs text-coffee-100 mt-0.5">
                      {[item.setor, item.unidade_nome].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-800">
                      {rotuloTipo(item.tipo)}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                      <button
                        type="button"
                        onClick={() => void handleMarcarFerias(item.colaborador_id, item.colaborador_nome)}
                        disabled={marcandoFeriasId === item.colaborador_id || !dataRef}
                        className="text-xs font-semibold text-sky-700 hover:text-sky-900 disabled:opacity-50 whitespace-nowrap"
                      >
                        {marcandoFeriasId === item.colaborador_id ? 'Salvando…' : 'Férias'}
                      </button>
                      <span className="text-coffee-100 text-xs" aria-hidden>
                        ·
                      </span>
                      <Link
                        href={`/admin/colaboradores/${item.colaborador_id}/editar`}
                        className="text-xs font-semibold text-dourado-base hover:text-dourado-600 underline underline-offset-2 whitespace-nowrap"
                      >
                        Editar perfil
                      </Link>
                      <span className="text-coffee-100 text-xs" aria-hidden>
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleExcluir(item.colaborador_id, item.colaborador_nome)}
                        disabled={excluindoId === item.colaborador_id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 whitespace-nowrap"
                      >
                        {excluindoId === item.colaborador_id ? 'Excluindo…' : 'Excluir perfil'}
                      </button>
                    </div>
                  </div>
                </div>
                {item.responsavel_lider_label !== '—' && (
                  <p className="text-xs mt-2 text-coffee-base">
                    <span className="font-medium">Líder:</span> {item.responsavel_lider_label}
                  </p>
                )}
                {item.responsavel_rh_label && (
                  <p className="text-xs mt-1 text-coffee-base">
                    <span className="font-medium">RH:</span> {item.responsavel_rh_label}
                    {item.tem_nota_gerente ? ' (gerente já avaliou)' : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalAviso && previewAviso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-lg w-full rounded-xl bg-white shadow-xl border border-cream-200 p-5 space-y-4">
            <h3 className="text-lg font-display font-semibold text-coffee-base">Publicar aviso para líderes</h3>
            <p className="text-sm text-coffee-100">
              Só gerentes, masters e sócios com equipe verão este aviso no portal. Daniel/administrador de rede não
              recebe.
            </p>
            <div className="rounded-lg bg-cream-50 border border-cream-200 p-3 text-sm space-y-2 max-h-48 overflow-y-auto">
              <p className="font-semibold text-coffee-base">{previewAviso.titulo}</p>
              <p className="text-coffee-base whitespace-pre-wrap text-xs">{previewAviso.conteudo}</p>
            </div>
            <p className="text-xs text-coffee-100">
              {previewAviso.lideres.length} líder(es) · {previewAviso.total_pendentes_lider} pendência(s)
            </p>
            <label className="flex items-center gap-2 text-sm text-coffee-base cursor-pointer">
              <input
                type="checkbox"
                checked={exigeConfirmacaoAviso}
                onChange={(e) => setExigeConfirmacaoAviso(e.target.checked)}
                className="rounded border-cream-300"
              />
              Exigir confirmação «Li e confirmo» no portal
            </label>
            {erroAviso && <p className="text-sm text-red-600">{erroAviso}</p>}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalAviso(false);
                  setPreviewAviso(null);
                  setErroAviso(null);
                }}
                className="rounded-lg border border-cream-300 px-4 py-2 text-sm text-coffee-base"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void publicarAvisoLideres()}
                disabled={gerandoAviso}
                className="rounded-lg bg-dourado-base px-4 py-2 text-sm font-semibold text-cream-100 disabled:opacity-50"
              >
                {gerandoAviso ? 'Publicando…' : 'Confirmar e publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-coffee-100">
        Responsável pelo mapa de liderança atual (admin → Liderança por setor).{' '}
        <strong className="font-medium">Férias</strong> registra a semana sem nota e remove da lista. Erro de cadastro:{' '}
        <strong className="font-medium">Editar perfil</strong>; quem saiu da empresa:{' '}
        <strong className="font-medium">Excluir perfil</strong> (só sócios e administrador).
        {autoRefresh
          ? ` Lista atualiza sozinha a cada ${Math.round(intervaloMs / 1000)}s quando você está nesta página.`
          : ''}
      </p>
    </div>
  );
}
