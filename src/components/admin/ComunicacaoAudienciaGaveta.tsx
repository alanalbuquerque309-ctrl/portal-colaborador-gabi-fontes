'use client';

import type { PessoaAudiencia, ResumoAudienciaComunicacao } from '@/lib/audiencia-comunicacao';

type Props = {
  titulo: string;
  tipo: 'aviso' | 'treinamento';
  dados: ResumoAudienciaComunicacao & { publico_label?: string; exige_confirmacao?: boolean };
  onFechar: () => void;
};

function fmtData(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ListaPessoas({
  titulo,
  cor,
  pessoas,
  extra,
}: {
  titulo: string;
  cor: string;
  pessoas: PessoaAudiencia[];
  extra?: (p: PessoaAudiencia) => string | null;
}) {
  return (
    <section className="space-y-2">
      <h3 className={`text-sm font-semibold ${cor}`}>
        {titulo} ({pessoas.length})
      </h3>
      {pessoas.length === 0 ? (
        <p className="text-xs text-coffee-100">Ninguém nesta lista.</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-cream-300 divide-y divide-cream-200">
          {pessoas.map((p) => (
            <li key={p.id} className="px-3 py-2 text-sm">
              <div className="font-medium text-coffee-base">{p.nome}</div>
              <div className="text-xs text-coffee-100">
                {[p.setor, p.unidade_nome].filter(Boolean).join(' · ')}
                {extra?.(p) ? ` · ${extra(p)}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ComunicacaoAudienciaGaveta({ titulo, tipo, dados, onFechar }: Props) {
  return (
    <>
      <button
        type="button"
        aria-label="Fechar painel"
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onFechar}
      />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-cream-50 shadow-xl border-l border-cream-300 flex flex-col">
        <header className="px-4 py-4 border-b border-cream-300 bg-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-coffee-100">
                {tipo === 'aviso' ? 'Aviso' : 'Treinamento'}
              </p>
              <h2 className="text-lg font-display font-semibold text-coffee-base leading-snug">{titulo}</h2>
              <p className="text-xs text-coffee-100 mt-1">
                Público: {dados.publico_label ?? dados.publico} · {dados.total_esperado} esperado(s)
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg border border-cream-300 px-2 py-1 text-sm text-coffee-base hover:bg-cream-100"
            >
              Fechar
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <ListaPessoas
            titulo={dados.exige_confirmacao ? 'Confirmou leitura' : 'Concluiu / confirmou'}
            cor="text-emerald-700"
            pessoas={dados.confirmados}
            extra={(p) => (p.confirmado_em ? `confirmado ${fmtData(p.confirmado_em)}` : null)}
          />
          <ListaPessoas
            titulo="Abriu, mas não confirmou"
            cor="text-amber-700"
            pessoas={dados.abriu_nao_confirmou}
            extra={(p) => (p.visualizado_em ? `abriu ${fmtData(p.visualizado_em)}` : null)}
          />
          <ListaPessoas titulo="Ainda não abriu" cor="text-red-700" pessoas={dados.nao_fez} />
        </div>
      </aside>
    </>
  );
}
