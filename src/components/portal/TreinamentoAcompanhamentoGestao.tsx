'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ItemAcompanhamentoTreinamento } from '@/lib/treinamento-acompanhamento';
import type { PessoaAudiencia } from '@/lib/audiencia-comunicacao';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

function ListaNomes({
  titulo,
  corTitulo,
  pessoas,
  vazio,
}: {
  titulo: string;
  corTitulo: string;
  pessoas: PessoaAudiencia[];
  vazio: string;
}) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${corTitulo}`}>
        {titulo} ({pessoas.length})
      </p>
      {pessoas.length === 0 ? (
        <p className="text-xs text-cafeteria-600 mt-1">{vazio}</p>
      ) : (
        <ul className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-cafeteria-200 divide-y divide-cafeteria-100">
          {pessoas.map((p) => (
            <li key={p.id} className="px-3 py-2 text-sm">
              <span className="font-medium text-coffee-base">{p.nome}</span>
              {(p.setor || p.unidade_nome) && (
                <span className="text-xs text-cafeteria-600">
                  {' '}
                  · {[p.setor, p.unidade_nome].filter(Boolean).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CardTreinamento({ item }: { item: ItemAcompanhamentoTreinamento }) {
  const pct =
    item.total_esperado > 0
      ? Math.round((item.assistiram.length / item.total_esperado) * 100)
      : 0;

  return (
    <details className="rounded-xl border border-cafeteria-200 bg-white overflow-hidden group">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 hover:bg-cream-50 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="font-semibold text-coffee-base leading-snug">{item.titulo}</p>
          <p className="text-xs text-cafeteria-600 mt-0.5">
            {item.publico_label}
            {' · '}
            {item.formato === 'texto' ? 'Texto' : 'Vídeo'}
            {item.origem === 'automatico' ? ' · automático' : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-dourado-base">{pct}%</p>
          <p className="text-xs text-cafeteria-600">
            {item.assistiram.length}/{item.total_esperado}
          </p>
        </div>
      </summary>
      <div className="border-t border-cafeteria-100 px-4 py-4 grid gap-4 sm:grid-cols-2">
        <ListaNomes
          titulo="Assistiram"
          corTitulo="text-emerald-700"
          pessoas={item.assistiram}
          vazio="Ninguém concluiu ainda."
        />
        {item.visualizou_sem_confirmar.length > 0 ? (
          <ListaNomes
            titulo="Visualizou, não confirmou"
            corTitulo="text-sky-700"
            pessoas={item.visualizou_sem_confirmar}
            vazio=""
          />
        ) : null}
        <ListaNomes
          titulo="Não assistiram"
          corTitulo="text-amber-800"
          pessoas={item.nao_assistiram}
          vazio="Todos já assistiram."
        />
      </div>
    </details>
  );
}

/**
 * Painel no final da aba Treinamento para admin, RH e sócios.
 * Atualiza conforme novos materiais entram no cadastro ou nas variáveis da Quinta.
 */
export function TreinamentoAcompanhamentoGestao() {
  const [visivel, setVisivel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemAcompanhamentoTreinamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [migracao064Pendente, setMigracao064Pendente] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    fetch('/api/portal/treinamentos/acompanhamento', { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          setVisivel(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.ok) {
          setVisivel(false);
          setErro(String(data.erro ?? 'Não foi possível carregar o acompanhamento.'));
          return;
        }
        setVisivel(true);
        setErro(null);
        setMigracao064Pendente(data.migracao_064_pendente === true);
        setItens(Array.isArray(data.itens) ? data.itens : []);
      })
      .catch(() => {
        setVisivel(false);
        setErro('Falha de conexão ao carregar acompanhamento.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!visivel && !loading) return null;

  if (loading) {
    return (
      <section className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm">
        <div className="flex justify-center py-4">
          <XicaraCarregando size="sm" label="Carregando acompanhamento…" />
        </div>
      </section>
    );
  }

  if (!visivel) return null;

  return (
    <section className="rounded-2xl border border-dourado-base/30 bg-gradient-to-br from-dourado-50/50 via-white to-cream-50 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-coffee-base">Quem assistiu</h2>
          <p className="text-sm text-cafeteria-700 mt-1 leading-relaxed">
            Visível para administração, RH e sócios. A lista inclui treinamentos cadastrados e os vídeos
            automáticos da Quinta; atualiza quando entram materiais novos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => carregar()}
          className="text-sm font-medium text-dourado-base hover:underline min-h-[44px] px-2"
        >
          Atualizar
        </button>
      </div>

      {migracao064Pendente ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Migration <strong>064</strong> ainda não aplicada. O acompanhamento da Quinta colaborador e materiais em
          texto dependem dela. Rode <code className="text-xs">npm run db:apply-064</code> ou o SQL em{' '}
          <code className="text-xs">supabase/migrations/064_treinamento_automatico_registros.sql</code>.
        </div>
      ) : null}

      {erro ? <p className="text-sm text-red-700">{erro}</p> : null}

      {itens.length === 0 ? (
        <p className="text-sm text-cafeteria-600">Nenhum treinamento ativo para acompanhar no momento.</p>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <CardTreinamento key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
