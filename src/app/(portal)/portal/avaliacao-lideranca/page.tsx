'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Avaliado = {
  id: string;
  nome: string;
  role: string;
  ja_avaliado_esta_semana: boolean;
};

const KEYS = ['n_fala_escuta', 'n_apoio', 'n_ambiente', 'n_organizacao'] as const;

export default function AvaliacaoLiderancaPage() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [avaliados, setAvaliados] = useState<Avaliado[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [semanaInicio, setSemanaInicio] = useState('');
  const [help, setHelp] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [anonimo, setAnonimo] = useState(false);
  const [notas, setNotas] = useState<Record<string, number>>({
    n_fala_escuta: 3,
    n_apoio: 3,
    n_ambiente: 3,
    n_organizacao: 3,
  });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
      return;
    }
    if ((s.role || '').toLowerCase() !== 'colaborador') {
      router.replace('/portal');
      return;
    }
    setSessionOk(true);
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
          setHelp(data.help ?? '');
        } else {
          setErro(data.erro || 'Não foi possível carregar.');
        }
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [sessionOk]);

  const enviar = async () => {
    if (!selecionado) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/portal/avaliacao-lideranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          avaliado_id: selecionado,
          anonimo,
          ...notas,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAvaliados((prev) =>
          prev.map((a) =>
            a.id === selecionado ? { ...a, ja_avaliado_esta_semana: true } : a
          )
        );
        setSelecionado(null);
        return;
      }
      setErro(data.erro || 'Erro ao enviar.');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  if (!sessionOk) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando…" />
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
        <p className="text-cafeteria-600 mt-1 text-sm">
          Uma vez por semana para cada gerente ou pessoa da administração da sua unidade. Sócios não entram nesta
          lista. Notas de 1 a 5.
        </p>
        {semanaInicio && (
          <p className="text-xs text-cafeteria-500 mt-2">
            Semana (início segunda): <strong>{semanaInicio}</strong>
          </p>
        )}
        {help && <p className="text-sm text-cafeteria-600 mt-2">{help}</p>}
      </div>

      {carregando ? (
        <XicaraCarregando size="md" label="Carregando…" />
      ) : (
        <>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <section className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg text-cafeteria-900 mb-3">Quem avaliar</h2>
            {avaliados.length === 0 ? (
              <p className="text-sm text-cafeteria-600">
                Não há líderes ou gestão cadastrados na sua unidade para avaliar neste momento.
              </p>
            ) : (
              <ul className="space-y-2">
                {avaliados.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={a.ja_avaliado_esta_semana}
                      onClick={() => {
                        setSelecionado(a.id);
                        setNotas({
                          n_fala_escuta: 3,
                          n_apoio: 3,
                          n_ambiente: 3,
                          n_organizacao: 3,
                        });
                        setAnonimo(false);
                      }}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                        a.ja_avaliado_esta_semana
                          ? 'border-cafeteria-100 bg-cafeteria-50 text-cafeteria-400 cursor-not-allowed'
                          : selecionado === a.id
                            ? 'border-dourado-base bg-dourado-50 text-cafeteria-900'
                            : 'border-cafeteria-200 hover:border-dourado-base/50'
                      }`}
                    >
                      <span className="font-medium">{a.nome}</span>
                      {a.ja_avaliado_esta_semana && (
                        <span className="block text-xs text-green-700 mt-1">Já avaliado esta semana</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selecionado && (
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
                    onChange={(e) =>
                      setNotas((prev) => ({ ...prev, [k]: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-dourado-base"
                  />
                  <div className="flex justify-between text-xs text-cafeteria-500 mb-1">
                    <span>1 precisa melhorar</span>
                    <span className="font-semibold text-cafeteria-800">{notas[k]}</span>
                    <span>5 excelente</span>
                  </div>
                </div>
              ))}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={anonimo}
                  onChange={(e) => setAnonimo(e.target.checked)}
                  className="rounded border-cafeteria-300 text-dourado-base"
                />
                <span className="text-sm text-cafeteria-800">Enviar de forma anônima</span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void enviar()}
                  className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
                >
                  {enviando ? 'Enviando…' : 'Enviar avaliação'}
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
