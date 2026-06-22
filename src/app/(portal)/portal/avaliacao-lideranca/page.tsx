'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { normalizePortalRole } from '@/lib/roles';
import { AvaliacaoSemanalChecklist } from '@/components/portal/AvaliacaoSemanalChecklist';
import { TrofeusParesPanel } from '@/components/portal/TrofeusParesPanel';

type Avaliado = {
  id: string;
  nome: string;
  role: string;
  role_label?: string;
  papel?: string;
  papel_label?: string;
  ja_avaliado_esta_semana: boolean;
};

const KEYS = ['n_exemplo', 'n_comunicacao', 'n_suporte', 'n_justica', 'n_clima'] as const;

export default function AvaliacaoLiderancaPage() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [avaliados, setAvaliados] = useState<Avaliado[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [semanaInicio, setSemanaInicio] = useState('');
  const [semanaFim, setSemanaFim] = useState('');
  const [help, setHelp] = useState('');
  const [avaliacaoOpcional, setAvaliacaoOpcional] = useState(false);
  const [alertaUltimoDia, setAlertaUltimoDia] = useState(false);
  const [pendentesNoUltimoDia, setPendentesNoUltimoDia] = useState(0);
  const [aba, setAba] = useState<'lideranca' | 'pares'>('lideranca');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, number>>({
    n_exemplo: 3,
    n_comunicacao: 3,
    n_suporte: 3,
    n_justica: 3,
    n_clima: 3,
  });
  const [enviando, setEnviando] = useState(false);
  const [perfilRole, setPerfilRole] = useState<string>('colaborador');
  const [justificativaNotaBaixa, setJustificativaNotaBaixa] = useState('');
  const [anonimo, setAnonimo] = useState(true);
  const [bloqueadoFerias, setBloqueadoFerias] = useState(false);
  const [motivoBloqueioFerias, setMotivoBloqueioFerias] = useState('');
  const [filtroPendentes, setFiltroPendentes] = useState(false);
  const [tipoEscala, setTipoEscala] = useState<string | null>(null);
  const [liderPlantaoEscolhido, setLiderPlantaoEscolhido] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pendentes') === '1') setFiltroPendentes(true);
    const abaParam = params.get('aba');
    if (abaParam === 'pares' || abaParam === 'lideranca') setAba(abaParam);
  }, []);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { role?: string | null } }) => {
        const role = normalizePortalRole(data?.colaborador?.role ?? s.role ?? '');
        if (data.ok && (role === 'colaborador' || role === 'admin')) {
          setPerfilRole(role);
          setSessionOk(true);
          return;
        }
        router.replace('/portal');
      })
      .catch(() => {
        router.replace('/portal');
      });
  }, [router]);

  useEffect(() => {
    if (!sessionOk) return;
    setCarregando(true);
    fetch('/api/portal/avaliacao-lideranca', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAvaliados(data.avaliados ?? []);
          setLabels(data.labels ?? {});
          setSemanaInicio(data.semana_inicio ?? '');
          setSemanaFim(data.semana_fim ?? '');
          setHelp(data.help ?? '');
          setAvaliacaoOpcional(data.avaliacao_opcional === true);
          setAlertaUltimoDia(data.alerta_ultimo_dia === true);
          setPendentesNoUltimoDia(Number(data.pendentes_no_ultimo_dia ?? 0));
          setBloqueadoFerias(data.bloqueado_ferias === true);
          setMotivoBloqueioFerias(String(data.bloqueado_ferias_motivo ?? ''));
          setTipoEscala(data.tipo_escala ?? null);
        } else {
          setErro(data.erro || 'Não foi possível carregar.');
        }
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [sessionOk]);

  const enviar = async () => {
    if (!selecionado) return;
    const temNotaBaixa = Object.values(notas).some((nota) => nota <= 3);
    if (temNotaBaixa && justificativaNotaBaixa.trim().length < 10) {
      setErro('Explique em poucas palavras o motivo da nota 3 ou menor.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/portal/avaliacao-lideranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          avaliado_id: selecionado,
          ...notas,
          anonimo,
          justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa.trim() : '',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAvaliados((prev) =>
          prev.map((a) => (a.id === selecionado ? { ...a, ja_avaliado_esta_semana: true } : a))
        );
        setSelecionado(null);
        setJustificativaNotaBaixa('');
        return;
      }
      setErro(data.erro || 'Erro ao enviar.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  const plantaoLeaders = avaliados.filter((a) => a.papel === 'lider_direto');
  const precisaEscolherPlantao = tipoEscala === '12x36' && plantaoLeaders.length >= 2;
  const plantaoJaAvaliado = plantaoLeaders.find((a) => a.ja_avaliado_esta_semana) ?? null;
  const plantaoEscolhidoId = liderPlantaoEscolhido ?? plantaoJaAvaliado?.id ?? null;

  const avaliadosVisiveis = !precisaEscolherPlantao
    ? avaliados
    : plantaoEscolhidoId
      ? avaliados.filter((a) => a.papel !== 'lider_direto' || a.id === plantaoEscolhidoId)
      : avaliados.filter((a) => a.papel !== 'lider_direto');

  const totalLista = avaliadosVisiveis.length;
  const jaAvaliados = avaliadosVisiveis.filter((a) => a.ja_avaliado_esta_semana).length;
  const pendentesLista = totalLista - jaAvaliados;

  if (!sessionOk) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando..." />
      </div>
    );
  }

  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Avaliar liderança
        </h1>
        <p className="text-cafeteria-600 mt-1 text-sm md:text-base">
          {perfilRole === 'admin'
            ? 'Como administrador, aqui você avalia subordinados diretos (CD, Motorista e Aux. administrativo). Notas de 1 a 5.'
            : 'Avalie, se desejar, seus perfis de referência da semana (chefe direto, RH e administrador). Notas de 1 a 5.'}
        </p>
        {perfilRole === 'admin' && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm md:text-base text-sky-950 space-y-1">
            <p>
              <strong>Avaliação semanal da equipe</strong> (assiduidade, vestimenta, estrelas): use{' '}
              <Link href="/portal/avaliacao-master" className="text-dourado-base font-medium underline">
                Avaliação da equipe
              </Link>{' '}
              no menu.
            </p>
            <p>
              <strong>Quem te avaliou?</strong> Abra{' '}
              <Link href="/portal/minha-lideranca" className="text-dourado-base font-medium underline">
                Minha liderança
              </Link>{' '}
              para ver médias anônimas.
            </p>
            <p className="text-sky-900/90">
              Nesta tela você dá feedback de liderança (1 a 5) aos subordinados do mapa. Quem já foi avaliado continua visível com a
              etiqueta <strong>Avaliado</strong> (desabilitado). Se faltar alguém, toque em{' '}
              <strong>Mostrar todos</strong> no checklist.
            </p>
          </div>
        )}
        {totalLista > 0 && (
          <p className="text-sm text-cafeteria-700 mt-2">
            Semana: <strong>{jaAvaliados}</strong> avaliado{jaAvaliados === 1 ? '' : 's'},{' '}
            <strong>{pendentesLista}</strong> pendente{pendentesLista === 1 ? '' : 's'} (total{' '}
            <strong>{totalLista}</strong> na sua lista).
          </p>
        )}
        {avaliacaoOpcional && (
          <p className="mt-2 text-xs rounded-md bg-cafeteria-100 px-3 py-2 text-cafeteria-700">
            Esta avaliação é opcional para colaboradores.
          </p>
        )}
        {semanaInicio && (
          <p className="text-xs text-cafeteria-500 mt-2">
            Semana atual: <strong>{semanaInicio}</strong>
            {semanaFim ? ` até ${semanaFim}` : ''}
          </p>
        )}
        {help && !bloqueadoFerias && <p className="text-sm text-cafeteria-600 mt-2">{help}</p>}
        {bloqueadoFerias && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950">
            {motivoBloqueioFerias ||
              'Você está registrado(a) de férias nesta semana — avaliação de liderança não se aplica.'}
          </div>
        )}
        {alertaUltimoDia && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Último dia da semana: você ainda tem {pendentesNoUltimoDia} liderança
            {pendentesNoUltimoDia === 1 ? '' : 's'} pendente
            {pendentesNoUltimoDia === 1 ? '' : 's'} para avaliar.
          </div>
        )}
      </div>

      {carregando ? (
        <XicaraCarregando size="md" label="Carregando..." />
      ) : (
        <>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <div className="rounded-xl border border-cafeteria-200 bg-white p-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAba('lideranca')}
              className={`rounded-lg px-3 py-2 text-sm ${
                aba === 'lideranca'
                  ? 'bg-dourado-50 border border-dourado-base text-cafeteria-900'
                  : 'text-cafeteria-700 hover:bg-cafeteria-50'
              }`}
            >
              Líderes que vou avaliar
            </button>
            <button
              type="button"
              onClick={() => setAba('pares')}
              className={`rounded-lg px-3 py-2 text-sm ${
                aba === 'pares'
                  ? 'bg-dourado-50 border border-dourado-base text-cafeteria-900'
                  : 'text-cafeteria-700 hover:bg-cafeteria-50'
              }`}
            >
              Reconhecimento entre pares
            </button>
          </div>

          {aba === 'lideranca' ? (
            bloqueadoFerias ? (
              <p className="text-sm text-cafeteria-600 rounded-xl border border-cafeteria-200 bg-white p-4">
                Sem checklist nesta semana: férias registradas pela gestão.
              </p>
            ) : avaliados.length > 0 ? (
              <>
                {precisaEscolherPlantao && (
                  <section className="rounded-xl border border-uva-200 bg-gradient-to-br from-uva-50/70 via-white to-cream-50 p-4 shadow-sm">
                    <h2 className="text-base font-display font-semibold text-cafeteria-900">
                      Com qual líder você trabalhou na semana passada?
                    </h2>
                    <p className="text-sm text-cafeteria-600 mt-0.5">
                      Você é 12x36: avalie apenas o líder do seu plantão na semana avaliada.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {plantaoLeaders.map((l) => {
                        const ativo = plantaoEscolhidoId === l.id;
                        const bloqueadoAuto = !!plantaoJaAvaliado && plantaoJaAvaliado.id !== l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            disabled={bloqueadoAuto}
                            onClick={() => setLiderPlantaoEscolhido(l.id)}
                            className={`text-left rounded-xl border px-4 py-3 min-h-[56px] transition-colors ${
                              ativo
                                ? 'border-uva-400 bg-uva-100/70 text-cafeteria-900'
                                : 'border-cafeteria-200 bg-white text-cafeteria-700 hover:border-uva-300'
                            } disabled:opacity-40`}
                          >
                            <span className="block font-semibold leading-tight">{l.nome}</span>
                            <span className="block text-xs text-cafeteria-600 mt-0.5">
                              {l.role_label ?? l.role}
                              {l.ja_avaliado_esta_semana ? ' · já avaliado' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {plantaoEscolhidoId && !plantaoJaAvaliado && (
                      <button
                        type="button"
                        onClick={() => {
                          setLiderPlantaoEscolhido(null);
                          setSelecionado(null);
                        }}
                        className="mt-3 text-sm font-medium text-uva-600 hover:underline"
                      >
                        Trocar líder
                      </button>
                    )}
                  </section>
                )}

                {precisaEscolherPlantao && !plantaoEscolhidoId ? (
                  <p className="text-sm text-cafeteria-600 rounded-xl border border-cafeteria-200 bg-white p-4">
                    Escolha acima o líder do seu plantão para liberar a avaliação. Keila (RH) e demais referências
                    continuam na lista.
                  </p>
                ) : null}

                {avaliadosVisiveis.length > 0 && (
                  <AvaliacaoSemanalChecklist
                    titulo="Quem avaliar esta semana"
                    itens={avaliadosVisiveis.map((a) => ({
                      id: a.id,
                      nome: a.nome,
                      concluido: a.ja_avaliado_esta_semana,
                      subtitulo: `${a.papel_label ?? 'Referência'} · ${a.role_label ?? a.role}`,
                    }))}
                    filtroPendentes={filtroPendentes}
                    onToggleFiltro={() => setFiltroPendentes((v) => !v)}
                    selecionadoId={selecionado}
                    onIrPara={(id) => {
                      setSelecionado(id);
                      setNotas({
                        n_exemplo: 3,
                        n_comunicacao: 3,
                        n_suporte: 3,
                        n_justica: 3,
                        n_clima: 3,
                      });
                      setJustificativaNotaBaixa('');
                      setAnonimo(true);
                    }}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-cafeteria-600 rounded-xl border border-cafeteria-200 bg-white p-4">
                Sua lista de avaliação está vazia. Verifique com o administrativo se o líder direto está definido.
              </p>
            )
          ) : (
            <section className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm">
              <h2 className="font-display text-lg text-cafeteria-900 mb-2">Reconhecimento entre pares</h2>
              <TrofeusParesPanel />
            </section>
          )}

          {selecionado && aba === 'lideranca' && (
            <section className="rounded-xl border border-dourado-base/40 bg-cream-50/80 p-5 space-y-4">
              <div>
                <h2 className="font-display text-lg text-cafeteria-900">Notas</h2>
                <p className="text-sm text-cafeteria-600 mt-1">
                  Avaliando:{' '}
                  <strong className="text-cafeteria-900 break-words">
                    {avaliados.find((a) => a.id === selecionado)?.nome ?? '—'}
                  </strong>
                </p>
              </div>
              {KEYS.map((k) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-cafeteria-800 mb-1">
                    {labels[k] ?? k}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={notas[k]}
                    onChange={(e) => setNotas((prev) => ({ ...prev, [k]: parseInt(e.target.value, 10) }))}
                    className="w-full accent-dourado-base"
                  />
                  <div className="flex justify-between text-sm text-cafeteria-500 mb-1">
                    <span>1 precisa melhorar</span>
                    <span className="font-semibold text-cafeteria-800">{notas[k]}</span>
                    <span>5 excelente</span>
                  </div>
                </div>
              ))}

              {Object.values(notas).some((nota) => nota <= 3) && (
                <div>
                  <label className="block text-sm font-medium text-cafeteria-800 mb-1">
                    Justificativa da nota baixa
                  </label>
                  <textarea
                    value={justificativaNotaBaixa}
                    onChange={(e) => setJustificativaNotaBaixa(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full rounded-lg border border-cafeteria-200 px-3 py-2.5 text-sm text-cafeteria-900 whitespace-pre-wrap break-words leading-relaxed"
                    placeholder="Explique o motivo para orientar o acompanhamento."
                  />
                  <p className="mt-1 text-sm text-cafeteria-600">
                    Obrigatório quando houver nota 3 ou menor.
                  </p>
                </div>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-cafeteria-200 bg-white px-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={anonimo}
                  onChange={(e) => setAnonimo(e.target.checked)}
                  className="mt-1 accent-dourado-base"
                />
                <span className="text-sm text-cafeteria-800 leading-relaxed">
                  <strong>Avaliar de forma anônima</strong>
                  <span className="block text-cafeteria-600 mt-0.5">
                    {anonimo
                      ? 'Seu líder não vê seu nome nesta avaliação.'
                      : 'Você será identificado para o seu líder nesta avaliação.'}
                  </span>
                </span>
              </label>
              <p className="text-xs text-cafeteria-500 leading-relaxed">
                Anônimo significa que seu nome não aparece <strong>para o líder nem para os colegas</strong>.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void enviar()}
                  className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Enviar avaliação'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelecionado(null)}
                  className="rounded-lg border border-cafeteria-300 px-4 py-2 text-sm text-cafeteria-800"
                >
                  Cancelar
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
