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
  const [filtroPendentes, setFiltroPendentes] = useState(false);

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

  const totalLista = avaliados.length;
  const jaAvaliados = avaliados.filter((a) => a.ja_avaliado_esta_semana).length;
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
            ? 'Como administrador, aqui você avalia subordinados diretos (Estoque, Motorista e Aux. administrativo). Notas de 1 a 5.'
            : 'Avalie, se desejar, seus perfis de referência da semana (chefe direto, RH e administrador). Notas de 1 a 5.'}
        </p>
        {perfilRole === 'admin' && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm md:text-base text-sky-950 space-y-1">
            <p>
              <strong>Quem te avaliou?</strong> Isso não aparece nesta tela. Abra o menu{' '}
              <Link href="/portal/minha-lideranca" className="text-dourado-base font-medium underline">
                Minha liderança
              </Link>{' '}
              para ver médias anônimas da equipe.
            </p>
            <p className="text-sky-900/90">
              Nesta lista entram só os cargos que você deve avaliar. Quem já foi avaliado continua visível com a
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
        {help && <p className="text-sm text-cafeteria-600 mt-2">{help}</p>}
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
            <>
              {avaliados.length > 0 && (
                <AvaliacaoSemanalChecklist
                  titulo="Checklist da semana"
                  itens={avaliados.map((a) => ({
                    id: a.id,
                    nome: a.nome,
                    concluido: a.ja_avaliado_esta_semana,
                    subtitulo: `${a.papel_label ?? 'Referência'} · ${a.role_label ?? a.role}`,
                  }))}
                  filtroPendentes={filtroPendentes}
                  onToggleFiltro={() => setFiltroPendentes((v) => !v)}
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
                  }}
                />
              )}
            <section className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm">
              <h2 className="font-display text-lg text-cafeteria-900 mb-3">Quem avaliar</h2>
              {avaliados.length === 0 ? (
                <p className="text-sm text-cafeteria-600">
                  Sua lista de avaliação está vazia. Verifique com o administrativo se o líder direto está definido.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(filtroPendentes ? avaliados.filter((a) => !a.ja_avaliado_esta_semana) : avaliados).map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        disabled={a.ja_avaliado_esta_semana}
                        onClick={() => {
                          setSelecionado(a.id);
                          setNotas({
                            n_exemplo: 3,
                            n_comunicacao: 3,
                            n_suporte: 3,
                            n_justica: 3,
                            n_clima: 3,
                          });
                          setJustificativaNotaBaixa('');
                        }}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                          a.ja_avaliado_esta_semana
                            ? 'border-cafeteria-100 bg-cafeteria-50 text-cafeteria-400 cursor-not-allowed'
                            : selecionado === a.id
                              ? 'border-dourado-base bg-dourado-50 text-cafeteria-900'
                              : 'border-cafeteria-200 hover:border-dourado-base/50'
                        }`}
                      >
                        <span className="font-medium flex items-center gap-2 flex-wrap">
                          {a.nome}
                          {a.ja_avaliado_esta_semana ? (
                            <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">Avaliado</span>
                          ) : (
                            <span className="text-xs rounded-full bg-amber-100 text-amber-900 px-2 py-0.5">Pendente</span>
                          )}
                        </span>
                        <span className="block text-sm text-cafeteria-600 mt-0.5">
                          {a.papel_label ?? 'Referência'} · {a.role_label ?? a.role}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            </>
          ) : (
            <section className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm">
              <h2 className="font-display text-lg text-cafeteria-900 mb-2">Reconhecimento entre pares</h2>
              <TrofeusParesPanel />
            </section>
          )}

          {selecionado && aba === 'lideranca' && (
            <section className="rounded-xl border border-dourado-base/40 bg-cream-50/80 p-5 space-y-4">
              <h2 className="font-display text-lg text-cafeteria-900">Notas</h2>
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

              <p className="text-sm rounded-md bg-cafeteria-100 px-3 py-2 text-cafeteria-700 leading-relaxed">
                Sua identidade não é exibida para o líder avaliado. Esta avaliação é sempre anônima.
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
