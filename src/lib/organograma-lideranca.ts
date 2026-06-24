import { UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import {
  ehUnidadeFabrica,
  normalizarSetorOrganizacional,
  rotuloGerenciaUnidade,
  setoresExibicaoPorUnidade,
} from '@/lib/lideranca-org';
import { paridadeNoMes, rotuloParidade } from '@/lib/plantao-12x36';

export type LiderOrganograma = {
  id: string;
  nome: string;
  paridadeMes?: string | null;
};

export type NoOrganogramaLideranca = {
  id: string;
  titulo: string;
  descricao?: string;
  lideres: LiderOrganograma[];
  filhos: NoOrganogramaLideranca[];
  /** Setor com os mesmos líderes da gerência (evita repetir nomes). */
  compacto?: boolean;
};

export type LinhaOrganograma = {
  unidade_slug: string;
  setor: string;
  lider_id: string;
  lider_nome: string;
  plantao_paridade?: string | null;
  plantao_paridade_mes_ref?: string | null;
};

function extrairLideres(linhas: LinhaOrganograma[], incluirParidade: boolean): LiderOrganograma[] {
  const map = new Map<string, LiderOrganograma>();
  for (const l of linhas) {
    if (!l.lider_id) continue;
    if (map.has(l.lider_id)) continue;
    const par = incluirParidade
      ? paridadeNoMes(l.plantao_paridade, l.plantao_paridade_mes_ref)
      : null;
    map.set(l.lider_id, {
      id: l.lider_id,
      nome: l.lider_nome || l.lider_id,
      paridadeMes: par ? rotuloParidade(par) : null,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function mesmosLideres(a: LinhaOrganograma[], b: LinhaOrganograma[]): boolean {
  const sa = new Set(a.map((l) => l.lider_id).filter(Boolean));
  const sb = new Set(b.map((l) => l.lider_id).filter(Boolean));
  if (sa.size !== sb.size) return false;
  for (const id of sa) if (!sb.has(id)) return false;
  return sa.size > 0;
}

function montarNoUnidade(
  slug: string,
  nome: string,
  linhasUnidade: LinhaOrganograma[]
): NoOrganogramaLideranca {
  const gerenciaLinhas = linhasUnidade.filter((l) => l.setor === SETOR_TODOS_NA_UNIDADE);
  const gerenciaLideres = extrairLideres(gerenciaLinhas, true);
  const filhos: NoOrganogramaLideranca[] = [];

  if (gerenciaLideres.length > 0 && !ehUnidadeFabrica(slug)) {
    filhos.push({
      id: `${slug}-gerencia`,
      titulo: rotuloGerenciaUnidade(slug),
      lideres: gerenciaLideres,
      filhos: [],
    });
  }

  for (const setor of setoresExibicaoPorUnidade(slug)) {
    const setorLinhas = linhasUnidade.filter(
      (l) => normalizarSetorOrganizacional(l.setor) === setor
    );
    if (setorLinhas.length === 0) continue;

    const compacto = gerenciaLinhas.length > 0 && mesmosLideres(setorLinhas, gerenciaLinhas);
    const no: NoOrganogramaLideranca = {
      id: `${slug}-${setor}`,
      titulo: setor,
      lideres: compacto ? [] : extrairLideres(setorLinhas, false),
      descricao: compacto ? 'Mesma gerência' : undefined,
      compacto,
      filhos: [],
    };

    const blocoGerencia = filhos.find((f) => f.id === `${slug}-gerencia`);
    if (blocoGerencia) blocoGerencia.filhos.push(no);
    else filhos.push(no);
  }

  return {
    id: slug,
    titulo: nome,
    lideres: gerenciaLideres.length > 0 ? [] : extrairLideres(linhasUnidade, false),
    filhos,
  };
}

/** Monta árvore de liderança operacional a partir de `lideres_por_setor`. */
export function montarOrganogramaLideranca(
  linhas: LinhaOrganograma[],
  unidades: { slug: string; nome: string }[]
): NoOrganogramaLideranca {
  const filhosUnidades = UNIDADES_CADASTRO.map((u) => {
    const meta = unidades.find((x) => x.slug === u.slug);
    const nome = meta?.nome ?? u.label;
    const linhasU = linhas.filter((l) => l.unidade_slug === u.slug);
    if (linhasU.length === 0) return null;
    return montarNoUnidade(u.slug, nome, linhasU);
  }).filter((n): n is NoOrganogramaLideranca => n != null);

  return {
    id: 'rede',
    titulo: 'Rede Gabi Fontes',
    descricao: 'Liderança operacional por filial e setor (não é organograma de cargos)',
    lideres: [],
    filhos: filhosUnidades,
  };
}
