'use client';

import type { ReactNode } from 'react';
import { agruparPorSetorEColaborador } from '@/lib/relatorio-avaliacoes-agrupar';

export type LinhaDiariaRelatorio = {
  id: string;
  data_referencia: string;
  assiduidade: string;
  nota_vestimenta: number | null;
  nota_pontualidade: number | null;
  nota_trabalho_equipe: number | null;
  nota_desempenho_tarefas: number | null;
  media_dia: number | null;
  justificativa_nota_baixa: string | null;
  colaborador_nome: string | null;
  colaborador_setor?: string | null;
  avaliador_nome: string | null;
  avaliador_rotulo?: string | null;
  origem_visita_rh?: boolean;
};

export type LinhaLiderRelatorio = {
  id: string;
  semana_inicio: string;
  avaliado_nome: string;
  avaliado_setor?: string | null;
  filial_nome?: string;
  avaliador_label: string;
  n_exemplo: number;
  n_comunicacao: number;
  n_suporte: number;
  n_justica: number;
  n_clima: number;
  justificativa_nota_baixa: string | null;
  media: number;
};

function TabelaDiariasColaborador({ linhas }: { linhas: LinhaDiariaRelatorio[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cafeteria-100 bg-cream-50/50">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-cafeteria-50 text-cafeteria-800 text-xs">
          <tr>
            <th className="px-2 py-2">Semana (seg.)</th>
            <th className="px-2 py-2">Avaliador</th>
            <th className="px-2 py-2">Assiduidade</th>
            <th className="px-2 py-2 text-center">Vestim.</th>
            <th className="px-2 py-2 text-center">Pontual.</th>
            <th className="px-2 py-2 text-center">Trabalho eq.</th>
            <th className="px-2 py-2 text-center">Desempenho</th>
            <th className="px-2 py-2">Média</th>
            <th className="px-2 py-2">Justificativa</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-t border-cafeteria-100">
              <td className="px-2 py-2 whitespace-nowrap">{l.data_referencia}</td>
              <td className="px-2 py-2">
                {l.avaliador_rotulo ?? l.avaliador_nome ?? '—'}
                {l.origem_visita_rh && (
                  <span className="ml-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                    RH
                  </span>
                )}
              </td>
              <td className="px-2 py-2 text-cafeteria-600">{l.assiduidade}</td>
              <td className="px-2 py-2 text-center">{l.nota_vestimenta ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_pontualidade ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_trabalho_equipe ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_desempenho_tarefas ?? '—'}</td>
              <td className="px-2 py-2">{l.media_dia != null ? Number(l.media_dia).toFixed(2) : '—'}</td>
              <td className="px-2 py-2 text-cafeteria-600 max-w-xs">{l.justificativa_nota_baixa || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaLiderancaColaborador({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cafeteria-100 bg-cream-50/50">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-cafeteria-50 text-cafeteria-800 text-xs">
          <tr>
            <th className="px-2 py-2">Semana</th>
            <th className="px-2 py-2">Quem avaliou</th>
            <th className="px-2 py-2 text-center">Média</th>
            <th className="px-2 py-2 text-center">Exemplo</th>
            <th className="px-2 py-2 text-center">Comunic.</th>
            <th className="px-2 py-2 text-center">Suporte</th>
            <th className="px-2 py-2 text-center">Justiça</th>
            <th className="px-2 py-2 text-center">Clima</th>
            <th className="px-2 py-2">Justificativa</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((row) => (
            <tr key={row.id} className="border-t border-cafeteria-100">
              <td className="px-2 py-2 whitespace-nowrap">{row.semana_inicio}</td>
              <td className="px-2 py-2 text-cafeteria-600">{row.avaliador_label}</td>
              <td className="px-2 py-2 text-center font-medium">{row.media.toFixed(2)}</td>
              <td className="px-2 py-2 text-center">{row.n_exemplo}</td>
              <td className="px-2 py-2 text-center">{row.n_comunicacao}</td>
              <td className="px-2 py-2 text-center">{row.n_suporte}</td>
              <td className="px-2 py-2 text-center">{row.n_justica}</td>
              <td className="px-2 py-2 text-center">{row.n_clima}</td>
              <td className="px-2 py-2 text-cafeteria-600 max-w-xs">{row.justificativa_nota_baixa || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlocoSetorColaboradores<T>({
  grupos,
  vazio,
  renderColaborador,
}: {
  grupos: ReturnType<typeof agruparPorSetorEColaborador<T>>;
  vazio: string;
  renderColaborador: (nome: string, linhas: T[]) => ReactNode;
}) {
  if (grupos.length === 0) {
    return <p className="text-sm text-cafeteria-500 py-4 text-center">{vazio}</p>;
  }

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.setor} className="rounded-lg border border-cafeteria-200 bg-cream-50/30 p-4">
          <h4 className="text-base font-semibold text-cafeteria-900 border-b border-dourado-200/60 pb-2 mb-4">
            {g.setor}
          </h4>
          {g.colaboradores.length === 0 ? (
            <p className="text-sm text-cafeteria-500">Nenhum colaborador neste setor no período.</p>
          ) : (
            <ul className="space-y-5">
              {g.colaboradores.map((c) => (
                <li key={`${g.setor}-${c.nome}`}>
                  <p className="text-sm font-medium text-dourado-800 mb-2 pl-1">{c.nome}</p>
                  {renderColaborador(c.nome, c.linhas)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function RelatorioDiariasPorSetor({ linhas }: { linhas: LinhaDiariaRelatorio[] }) {
  const grupos = agruparPorSetorEColaborador(
    linhas,
    (l) => l.colaborador_setor,
    (l) => l.colaborador_nome
  );

  return (
    <BlocoSetorColaboradores
      grupos={grupos}
      vazio="Nenhum registro no período."
      renderColaborador={(_nome, regs) => (
        <TabelaDiariasColaborador linhas={regs as LinhaDiariaRelatorio[]} />
      )}
    />
  );
}

export function RelatorioLiderancaPorSetor({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  const grupos = agruparPorSetorEColaborador(
    linhas,
    (l) => l.avaliado_setor,
    (l) => l.avaliado_nome
  );

  return (
    <BlocoSetorColaboradores
      grupos={grupos}
      vazio="Nenhum registro no período."
      renderColaborador={(_nome, regs) => (
        <TabelaLiderancaColaborador linhas={regs as LinhaLiderRelatorio[]} />
      )}
    />
  );
}

/** Agrupa pelo líder avaliado (nome), com setor e filial no cabeçalho. */
export function RelatorioLiderancaPorLider({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  if (linhas.length === 0) {
    return <p className="text-sm text-cafeteria-500 py-4 text-center">Nenhum registro no período.</p>;
  }

  const porLider = new Map<string, LinhaLiderRelatorio[]>();
  for (const l of linhas) {
    const nome = String(l.avaliado_nome ?? '').trim() || '—';
    if (!porLider.has(nome)) porLider.set(nome, []);
    porLider.get(nome)!.push(l);
  }

  const lideres = Array.from(porLider.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

  return (
    <div className="space-y-6">
      {lideres.map(([nome, regs]) => {
        const setor = regs[0]?.avaliado_setor?.trim() || 'Sem setor definido';
        const filiais = Array.from(
          new Set(regs.map((r) => r.filial_nome?.trim()).filter(Boolean) as string[])
        );
        const mediaGeral =
          regs.reduce((s, r) => s + r.media, 0) / Math.max(1, regs.length);
        return (
          <div
            key={nome}
            className="rounded-lg border border-cafeteria-200 bg-cream-50/30 p-4"
          >
            <div className="border-b border-dourado-200/60 pb-2 mb-4">
              <h4 className="text-base font-semibold text-cafeteria-900">{nome}</h4>
              <p className="text-xs text-cafeteria-500 mt-1">
                Setor: {setor}
                {filiais.length > 0 ? ` · Filial: ${filiais.join(', ')}` : ''}
                {' · '}
                {regs.length} avaliação(ões) · média {mediaGeral.toFixed(2)}
              </p>
            </div>
            <TabelaLiderancaColaborador linhas={regs} />
          </div>
        );
      })}
    </div>
  );
}
