'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TrofeuParTipo } from '@/lib/trofeus-pares';

type Colega = { id: string; nome: string; cargo: string | null; setor: string | null };
type Tipo = { id: TrofeuParTipo; titulo: string; emoji: string; descricao: string };
type Enviado = { id: string; destinatario_id: string; destinatario_nome: string; tipo: string; titulo: string; emoji: string };

function normalizarBusca(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function TrofeusParesPanel() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [creditosRestantes, setCreditosRestantes] = useState(0);
  const [enviados, setEnviados] = useState<Enviado[]>([]);
  const [mural, setMural] = useState<Enviado[]>([]);
  const [busca, setBusca] = useState('');
  const [colegasUnidade, setColegasUnidade] = useState<Colega[]>([]);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [tipo, setTipo] = useState<TrofeuParTipo>('braco_direito');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro('');
    fetch('/api/portal/trofeus-pares', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErro(data.erro || 'Não foi possível carregar troféus.');
          return;
        }
        setTipos(Array.isArray(data.tipos) ? data.tipos : []);
        setCreditosRestantes(Number(data.creditos_restantes ?? 0));
        setEnviados(Array.isArray(data.enviados) ? data.enviados : []);
        setMural(Array.isArray(data.mural_unidade) ? data.mural_unidade : []);
        setColegasUnidade(Array.isArray(data.colegas_elegiveis) ? data.colegas_elegiveis : []);
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const colegasVisiveis = useMemo(() => {
    const q = normalizarBusca(busca);
    if (!q) return colegasUnidade;
    return colegasUnidade.filter((c) => normalizarBusca(c.nome).includes(q));
  }, [busca, colegasUnidade]);

  const enviar = async () => {
    if (!destinatarioId) {
      setErro('Selecione um colega.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/portal/trofeus-pares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destinatario_id: destinatarioId, tipo }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.erro || 'Erro ao enviar.');
        return;
      }
      setBusca('');
      setDestinatarioId('');
      carregar();
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) return <p className="text-sm text-cafeteria-600">Carregando troféus…</p>;

  return (
    <section className="space-y-5">
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      <p className="text-sm text-cafeteria-700">
        Você pode enviar até <strong>3 troféus por semana</strong> (pessoas diferentes). Créditos restantes esta
        semana: <strong>{creditosRestantes}</strong> de 3. Os rankings na home e no mural somam os troféus{' '}
        <strong>do mês inteiro</strong>.
      </p>

      {creditosRestantes > 0 && (
        <div className="rounded-xl border border-cafeteria-200 bg-cream-50/80 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-cafeteria-800 mb-1">Escolher colega</label>
            <input
              type="search"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setDestinatarioId('');
              }}
              placeholder="Filtrar por nome (opcional)"
              className="w-full rounded-lg border border-cafeteria-200 px-3 py-2 text-sm"
            />
            {colegasUnidade.length === 0 ? (
              <p className="mt-2 text-sm text-cafeteria-600">Nenhum colega elegível na sua unidade.</p>
            ) : colegasVisiveis.length === 0 ? (
              <p className="mt-2 text-sm text-cafeteria-600">Nenhum nome corresponde ao filtro.</p>
            ) : (
              <ul className="mt-2 border border-cafeteria-200 rounded-lg bg-white max-h-56 overflow-y-auto">
                {colegasVisiveis.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDestinatarioId(c.id);
                        setBusca(c.nome);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-dourado-50 ${
                        destinatarioId === c.id ? 'bg-dourado-50 font-medium' : ''
                      }`}
                    >
                      {c.nome}
                      {(c.cargo || c.setor) && (
                        <span className="block text-xs text-cafeteria-500">
                          {[c.cargo, c.setor].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {tipos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id)}
                className={`rounded-xl border p-3 text-left text-sm ${
                  tipo === t.id ? 'border-dourado-base bg-dourado-50' : 'border-dourado-200 bg-white'
                }`}
              >
                <span className="text-2xl">{t.emoji}</span>
                <p className="font-semibold text-cafeteria-900 mt-1">{t.titulo}</p>
                <p className="text-xs text-cafeteria-600 mt-1">{t.descricao}</p>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={enviando || !destinatarioId}
            onClick={() => void enviar()}
            className="rounded-lg bg-dourado-base px-4 py-2 text-cream-100 font-medium hover:bg-dourado-400 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar troféu'}
          </button>
        </div>
      )}

      {enviados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-cafeteria-800 mb-2">Seus envios esta semana</h3>
          <ul className="space-y-1 text-sm">
            {enviados.map((e) => (
              <li key={e.id}>
                {e.emoji} {e.destinatario_nome} — {e.titulo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mural.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-cafeteria-800 mb-2">Mural da unidade</h3>
          <ul className="space-y-2">
            {mural.map((t) => (
              <li key={t.id} className="rounded-lg border border-dourado-200 bg-dourado-50/50 px-3 py-2 text-sm">
                {t.emoji} <strong>{t.destinatario_nome}</strong> — {t.titulo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
