'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { IlustracaoGraos } from '@/components/portal/vivo/PortalIlustracao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';
import { QuintaTreinosPanel } from '@/components/portal/QuintaTreinosPanel';

type Missao = {
  id: string;
  label: string;
  graos: number;
  graos_max: number;
  status: string;
  href: string | null;
  detalhe: string | null;
};

type CatalogoItem = { id: string; nome: string; graos: number };

type LinhaGestao = {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  saldo_confirmado: number;
  saldo_pendente: number;
  graos_semana_ganhos: number;
  nivel: { emoji: string; label: string };
};

type ResumoGraos = {
  ok: boolean;
  erro?: string;
  modo_gestao?: boolean;
  apenas_visualizacao?: boolean;
  colaborador_id?: string;
  colaborador_nome?: string;
  colaboradores?: LinhaGestao[];
  saldo_confirmado?: number;
  saldo_pendente?: number;
  nivel?: { emoji: string; label: string };
  elegibilidade?: { estado: string; motivo: string | null; elegivel: boolean; mostrar_aviso_cobrar_lider?: boolean };
  missoes?: Missao[];
  graos_semana_possivel?: number;
  graos_semana_ganhos?: number;
  aviso_quinta?: string | null;
  eh_quinta?: boolean;
  quinta_treino?: {
    titulo: string;
    resumo: string;
    apresentador?: {
      nome: string;
      cargo: string;
      credencial: string;
    } | null;
    youtube_video_id: string | null;
    embed_url: string | null;
    formato?: 'horizontal' | 'shorts';
  };
  treinos_quinta?: {
    colaborador?: NonNullable<ResumoGraos['quinta_treino']>;
    lider?: NonNullable<ResumoGraos['quinta_treino']>;
  } | null;
  catalogo?: CatalogoItem[];
  extrato?: Array<{ descricao: string; graos: number; estado: string; created_at: string }>;
};

type CarrinhoLinha = { catalogo_id: string; nome: string; graos: number; qtd: number };

export function GraosPageClient() {
  const [data, setData] = useState<ResumoGraos | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modo, setModo] = useState<'home' | 'usar' | 'extrato' | 'codigo'>('home');
  const [carrinho, setCarrinho] = useState<CarrinhoLinha[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [codigoResgate, setCodigoResgate] = useState<string | null>(null);
  const [msgResgate, setMsgResgate] = useState<string | null>(null);
  const [quintaLoading, setQuintaLoading] = useState(false);
  const [quintaAssistido, setQuintaAssistido] = useState(false);
  const [colaboradorGestaoId, setColaboradorGestaoId] = useState<string | null>(null);
  const [buscaGestao, setBuscaGestao] = useState('');

  const carregar = useCallback(async (colaboradorId?: string | null) => {
    setCarregando(true);
    try {
      const url =
        colaboradorId != null && colaboradorId !== ''
          ? `/api/portal/graos?colaborador_id=${encodeURIComponent(colaboradorId)}`
          : '/api/portal/graos';
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const json = (await res.json()) as ResumoGraos;
      setData(json);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(colaboradorGestaoId);
  }, [carregar, colaboradorGestaoId]);

  const toggleItem = (item: CatalogoItem) => {
    setCarrinho((prev) => {
      const ix = prev.findIndex((p) => p.catalogo_id === item.id);
      if (ix >= 0) return prev.filter((p) => p.catalogo_id !== item.id);
      return [...prev, { catalogo_id: item.id, nome: item.nome, graos: item.graos, qtd: 1 }];
    });
  };

  const totalCarrinho = carrinho.reduce((s, l) => s + l.graos * l.qtd, 0);
  const saldoConfirmado = data?.saldo_confirmado ?? 0;
  const complementoGraos = Math.max(0, totalCarrinho - saldoConfirmado);

  const confirmarCompra = async () => {
    if (carrinho.length === 0) return;
    setConfirmando(true);
    setMsgResgate(null);
    try {
      const res = await fetch('/api/portal/graos/resgate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: carrinho.map((c) => ({ catalogo_id: c.catalogo_id, quantidade: c.qtd })),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMsgResgate(json.erro || 'Não foi possível confirmar.');
        return;
      }
      setCodigoResgate(json.codigo);
      setMsgResgate(json.mensagem);
      setCarrinho([]);
      setModo('codigo');
      await carregar(colaboradorGestaoId);
    } catch {
      setMsgResgate('Erro de conexão.');
    } finally {
      setConfirmando(false);
    }
  };

  const concluirQuinta = async () => {
    setQuintaLoading(true);
    try {
      const res = await fetch('/api/portal/graos/quinta', { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (!json.ok) alert(json.erro || 'Erro');
      await carregar(colaboradorGestaoId);
    } finally {
      setQuintaLoading(false);
    }
  };

  if (carregando && !data) {
    return <p className="text-cafeteria-600 p-6">Carregando Grãos…</p>;
  }

  if (!data?.ok) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-red-800">{data?.erro || 'Grãos indisponível.'}</p>
      </div>
    );
  }

  const pct = Math.min(
    100,
    Math.round(((data.graos_semana_ganhos ?? 0) / (data.graos_semana_possivel ?? 40)) * 100)
  );
  const modoVisualizacao = data.apenas_visualizacao === true;
  const listaGestao = data.modo_gestao === true && !colaboradorGestaoId && (data.colaboradores?.length ?? 0) > 0;

  if (listaGestao) {
    const termo = buscaGestao.trim().toLowerCase();
    const linhas = (data.colaboradores ?? []).filter((c) => {
      if (!termo) return true;
      return c.nome.toLowerCase().includes(termo) || (c.setor ?? '').toLowerCase().includes(termo);
    });

    return (
      <div className="max-w-lg mx-auto px-4 pb-28 pt-4 space-y-5">
        <header className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-cream-50 to-white p-5 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-amber-900">☕ Grãos de café · gestão</p>
              <h1 className="font-display text-2xl text-cafeteria-900 mt-1">Equipe da operação</h1>
              <p className="text-sm text-cafeteria-600 mt-1">
                Visão interna (sócio/admin). Colaboradores veem apenas o próprio saldo.
              </p>
            </div>
            <IlustracaoGraos className="w-24 h-16 shrink-0" />
          </div>
        </header>

        <input
          type="search"
          value={buscaGestao}
          onChange={(e) => setBuscaGestao(e.target.value)}
          placeholder="Buscar por nome ou setor"
          className="w-full rounded-xl border border-cafeteria-200 bg-white px-4 py-3 text-sm min-h-[48px] shadow-sm"
        />

        <QuintaTreinosPanel
          ehQuinta={data.eh_quinta === true}
          treinoColaborador={data.treinos_quinta?.colaborador ?? data.quinta_treino}
          treinoLider={data.treinos_quinta?.lider}
          intro="Visão gestão: acompanhe os treinos de colaboradores e de liderança."
        />

        <ul className="space-y-3">
          {linhas.map((c) => (
            <li key={c.colaborador_id}>
              <button
                type="button"
                onClick={() => {
                  setModo('home');
                  setColaboradorGestaoId(c.colaborador_id);
                }}
                className="w-full text-left rounded-2xl border border-cafeteria-200/80 bg-white px-4 py-4 min-h-[64px] hover:border-dourado-base hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-dourado-100 to-amber-100 border border-dourado-200 flex items-center justify-center font-display text-lg text-dourado-800 shrink-0">
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-cafeteria-900 leading-snug">{c.nome}</p>
                    {c.setor && <p className="text-xs text-cafeteria-500 mt-0.5">{c.setor}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-2xl font-bold text-dourado-base tabular-nums leading-none">
                      {c.saldo_confirmado}
                    </p>
                    <p className="text-xs text-cafeteria-600 mt-1">
                      {c.nivel.emoji} sem. {c.graos_semana_ganhos}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {(data.catalogo ?? []).length > 0 && (
          <section className="rounded-xl border border-cafeteria-200 bg-white p-4 space-y-2">
            <p className="font-semibold text-cafeteria-900">Catálogo de resgate</p>
            <ul className="text-sm space-y-1">
              {(data.catalogo ?? []).map((item) => (
                <li key={item.id} className="flex justify-between text-cafeteria-800">
                  <span>{item.nome}</span>
                  <span className="font-semibold text-dourado-base">{item.graos}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PortalRodapeFrase variant="graos" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 pt-4 space-y-5">
      {colaboradorGestaoId && (
        <button
          type="button"
          onClick={() => {
            setModo('home');
            setColaboradorGestaoId(null);
          }}
          className="text-sm text-cafeteria-700 underline"
        >
          ← Voltar à lista da equipe
        </button>
      )}
      {modoVisualizacao && colaboradorGestaoId && data.colaborador_nome && (
        <div className="rounded-xl border border-cafeteria-300 bg-cream-50 px-4 py-3 text-sm text-cafeteria-800">
          Visualizando: <strong>{data.colaborador_nome}</strong> (somente leitura)
        </div>
      )}
      {modoVisualizacao && !colaboradorGestaoId && (
        <div className="rounded-xl border border-cafeteria-300 bg-cream-50 px-4 py-3 text-sm text-cafeteria-800">
          Modo visualização (sócio/gestão): catálogo e regras da operação. Resgate e missões valem só para
          colaboradores da loja.
        </div>
      )}
      <header className="text-center space-y-1 relative">
        <div className="flex justify-center mb-1 opacity-80">
          <IlustracaoGraos className="w-28 h-18" />
        </div>
        <p className="text-sm text-cafeteria-600">☕ Grãos de café — nossa moeda</p>
        <p className="font-display text-5xl text-cafeteria-900 tabular-nums">{saldoConfirmado}</p>
        {(data.saldo_pendente ?? 0) > 0 && (
          <p className="text-sm text-amber-800">+{data.saldo_pendente} pendentes (aguardam avaliação ok)</p>
        )}
        <p className="text-sm text-cafeteria-700">
          {data.nivel?.emoji} {data.nivel?.label}
        </p>
        <p className="text-xs text-cafeteria-600 pt-1">
          Participe → junte → troque na cafeteria Gabi Fontes
        </p>
      </header>

      {data.elegibilidade &&
        !data.elegibilidade.elegivel &&
        data.elegibilidade.motivo &&
        (data.elegibilidade.estado !== 'aguardando_lider' || (data.saldo_pendente ?? 0) > 0) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {data.elegibilidade.motivo}
        </div>
      )}

      {data.elegibilidade?.elegivel && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          ✅ Semana liberada — Grãos confirmados quando elegível
        </div>
      )}

      {modo === 'home' && (
        <>
          {data.aviso_quinta && (
            <div className="rounded-xl border border-dourado-300 bg-dourado-50 px-4 py-3 text-sm text-cafeteria-900">
              📅 {data.aviso_quinta}
            </div>
          )}

          {data.eh_quinta && !modoVisualizacao && (
            <div className="rounded-xl border-2 border-dourado-400 bg-white p-4 space-y-3">
              <p className="font-semibold text-cafeteria-900">⭐ Quinta do café</p>

              {data.quinta_treino?.embed_url ? (
                <QuintaTreinoEmbed
                  embedUrl={data.quinta_treino.embed_url}
                  titulo={data.quinta_treino.titulo}
                  resumo={data.quinta_treino.resumo}
                  apresentador={data.quinta_treino.apresentador}
                  formato={data.quinta_treino.formato}
                />
              ) : (
                <p className="text-sm text-cafeteria-700 leading-relaxed">
                  {data.quinta_treino?.resumo ??
                    'Treino rápido: trate bem quem entra na loja e confira o cardápio do dia.'}
                </p>
              )}

              {(data.missoes ?? []).find((m) => m.id === 'quinta')?.status === 'feito_confirmado' ||
              (data.missoes ?? []).find((m) => m.id === 'quinta')?.status === 'feito_pendente' ? (
                <p className="text-sm font-medium text-emerald-800">✅ Treino desta quinta já concluído.</p>
              ) : (
                <>
                  <label className="flex items-start gap-2 text-sm text-cafeteria-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quintaAssistido}
                      onChange={(e) => setQuintaAssistido(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-cafeteria-300"
                    />
                    <span>Assisti ao treino de hoje (ou li o conteúdo acima)</span>
                  </label>
                  <button
                    type="button"
                    disabled={quintaLoading || !quintaAssistido}
                    onClick={() => void concluirQuinta()}
                    className="w-full rounded-xl bg-cafeteria-800 text-cream-50 py-3 font-semibold min-h-[48px] disabled:opacity-50"
                  >
                    {quintaLoading ? 'Salvando…' : 'Concluir treino (+5 Grãos)'}
                  </button>
                </>
              )}
            </div>
          )}

          <section className="rounded-xl border border-cafeteria-200 bg-white p-4 space-y-3">
            <div className="flex justify-between text-sm font-medium text-cafeteria-800">
              <span>Suas missões desta semana</span>
              <span>
                {data.graos_semana_ganhos}/{data.graos_semana_possivel}
              </span>
            </div>
            <div className="h-2 rounded-full bg-cafeteria-100 overflow-hidden">
              <div className="h-full bg-dourado-base transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ul className="space-y-2">
              {(data.missoes ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 text-sm border-b border-cafeteria-50 pb-2 last:border-0"
                >
                  <span className="w-6 shrink-0 text-center">
                    {m.status === 'feito_confirmado' && '✅'}
                    {m.status === 'feito_pendente' && '⏳'}
                    {m.status === 'bloqueado' && '⚠'}
                    {(m.status === 'disponivel' || m.status === 'indisponivel') && '☐'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-cafeteria-900">{m.label}</p>
                    {m.detalhe && <p className="text-xs text-cafeteria-500">{m.detalhe}</p>}
                  </div>
                  <span className="text-dourado-base font-semibold shrink-0">+{m.graos_max}</span>
                  {m.href && m.status !== 'feito_confirmado' && m.status !== 'indisponivel' && (
                    <Link
                      href={m.href}
                      className="text-cafeteria-700 font-bold px-2 py-1 hover:bg-cafeteria-50 rounded"
                      aria-label={`Ir: ${m.label}`}
                    >
                      →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {!modoVisualizacao && (
            <button
              type="button"
              disabled={saldoConfirmado <= 0}
              onClick={() => setModo('usar')}
              className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold py-4 min-h-[56px] shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Usar grãos
            </button>
          )}

          {modoVisualizacao && (data.catalogo ?? []).length > 0 && (
            <section className="rounded-xl border border-cafeteria-200 bg-white p-4 space-y-2">
              <p className="font-semibold text-cafeteria-900">Catálogo (operacao)</p>
              <ul className="text-sm space-y-1">
                {(data.catalogo ?? []).map((item) => (
                  <li key={item.id} className="flex justify-between text-cafeteria-800">
                    <span>{item.nome}</span>
                    <span className="font-semibold text-dourado-base">{item.graos}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button
            type="button"
            onClick={() => setModo('extrato')}
            className="w-full text-sm text-cafeteria-700 underline py-2"
          >
            Ver extrato
          </button>
        </>
      )}

      {modo === 'usar' && (
        <div className="space-y-4">
          <button type="button" onClick={() => setModo('home')} className="text-sm text-cafeteria-700">
            ← Voltar
          </button>
          <p className="font-semibold text-cafeteria-900">Escolha os itens</p>
          <p className="text-sm text-cafeteria-600">Saldo confirmado: {saldoConfirmado} Grãos</p>
          <ul className="space-y-2">
            {(data.catalogo ?? []).map((item) => {
              const sel = carrinho.some((c) => c.catalogo_id === item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 flex justify-between items-center min-h-[52px] ${
                      sel ? 'border-orange-400 bg-orange-50' : 'border-cafeteria-200 bg-white'
                    }`}
                  >
                    <span className="text-cafeteria-900">{item.nome}</span>
                    <span className="font-bold text-dourado-base">{item.graos}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {carrinho.length > 0 && (
            <div className="rounded-xl bg-cafeteria-50 p-4 space-y-2 text-sm">
              <p>
                Total: <strong>{totalCarrinho}</strong> Grãos
              </p>
              {complementoGraos > 0 && (
                <p className="text-amber-900">
                  Faltam {complementoGraos} Grãos — complemento em dinheiro no caixa (gerente aplica desconto).
                </p>
              )}
              <p className="text-xs text-cafeteria-600">
                Confirme na frente do gerente. Após confirmar, não há devolução.
              </p>
              <button
                type="button"
                disabled={confirmando}
                onClick={() => void confirmarCompra()}
                className="w-full rounded-xl bg-orange-500 text-white font-bold py-3 min-h-[48px] disabled:opacity-50"
              >
                {confirmando ? 'Confirmando…' : 'Confirmar compra'}
              </button>
            </div>
          )}
          {msgResgate && <p className="text-red-800 text-sm">{msgResgate}</p>}
        </div>
      )}

      {modo === 'codigo' && codigoResgate && (
        <div className="text-center space-y-4 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-6">
          <p className="font-semibold text-emerald-900">Compra confirmada</p>
          <p className="font-mono text-3xl tracking-widest text-emerald-950">{codigoResgate}</p>
          <p className="text-sm text-emerald-900">{msgResgate}</p>
          <button
            type="button"
            onClick={() => {
              setModo('home');
              setCodigoResgate(null);
            }}
            className="text-sm underline text-emerald-800"
          >
            Voltar aos Grãos
          </button>
        </div>
      )}

      {modo === 'extrato' && (
        <div className="space-y-3">
          <button type="button" onClick={() => setModo('home')} className="text-sm text-cafeteria-700">
            ← Voltar
          </button>
          <ul className="text-sm space-y-2">
            {(data.extrato ?? []).map((e, i) => (
              <li key={i} className="flex justify-between border-b border-cafeteria-100 pb-1">
                <span className="text-cafeteria-800">
                  {e.descricao}{' '}
                  {e.estado === 'pendente' && <span className="text-amber-700">(pendente)</span>}
                  {e.estado === 'cancelado' && <span className="text-red-700">(cancelado)</span>}
                </span>
                <span className={e.graos < 0 ? 'text-red-700' : 'text-emerald-800'}>
                  {e.graos > 0 ? '+' : ''}
                  {e.graos}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!colaboradorGestaoId && <PortalRodapeFrase variant="graos" />}
    </div>
  );
}
