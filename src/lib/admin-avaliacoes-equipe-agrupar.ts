import type { LinhaAvaliacaoGaveta } from '@/components/admin/AvaliacaoNotasGaveta';
import { formatarExibicaoAvaliacaoAdmin } from '@/lib/avaliacao-diaria';
import { avaliacaoContaNaMedia } from '@/lib/avaliacao-ignorada';

export type LinhaAdminAvaliacaoEquipe = LinhaAvaliacaoGaveta & {
  colaborador_id: string;
  avaliador_id: string;
  colaborador_setor?: string | null;
  colaborador_cargo?: string | null;
  colaborador_unidade_nome?: string | null;
  avaliador_rotulo?: string | null;
  origem_visita_rh?: boolean;
  ignorada?: boolean;
  ignorada_em?: string | null;
  ignorada_motivo?: string | null;
};

export type GrupoColaboradorSemana = {
  chave: string;
  data_referencia: string;
  colaborador_id: string;
  colaborador_nome: string;
  setor: string;
  cargo: string;
  unidade_nome: string;
  avaliacoes: LinhaAdminAvaliacaoEquipe[];
  media_semana: number | null;
  qtd_avaliadores: number;
  tem_multiplos_avaliadores: boolean;
};

export type GrupoColaboradorPeriodo = {
  colaborador_id: string;
  colaborador_nome: string;
  setor: string;
  cargo: string;
  unidade_nome: string;
  semanas: GrupoColaboradorSemana[];
  media_periodo: number | null;
  qtd_semanas_com_media: number;
  posicao: number;
};

export type OrdemRankingAdmin = 'desc' | 'asc';

export function formatarSemanaAdmin(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const ini = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const fim = new Date(d);
  fim.setDate(fim.getDate() + 6);
  const fimStr = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${ini} a ${fimStr}`;
}

/** Média aritmética das médias semanais registradas (admin; transparência total). */
export function mediaSemanaAdmin(avaliacoes: LinhaAdminAvaliacaoEquipe[]): number | null {
  const vals: number[] = [];
  for (const a of avaliacoes) {
    if (!avaliacaoContaNaMedia(a)) continue;
    const exib = formatarExibicaoAvaliacaoAdmin(a);
    if (exib.foraPlantao || exib.legado) continue;
    if (a.media_dia != null && !Number.isNaN(Number(a.media_dia))) {
      vals.push(Number(a.media_dia));
    }
  }
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 100) / 100;
}

export function agruparLinhasAdminPorColaboradorSemana(
  linhas: LinhaAdminAvaliacaoEquipe[]
): GrupoColaboradorSemana[] {
  const map = new Map<string, GrupoColaboradorSemana>();

  for (const l of linhas) {
    const cid = String(l.colaborador_id);
    const ref = String(l.data_referencia);
    const chave = `${ref}\0${cid}`;
    if (!map.has(chave)) {
      map.set(chave, {
        chave,
        data_referencia: ref,
        colaborador_id: cid,
        colaborador_nome: String(l.colaborador_nome ?? '').trim() || '—',
        setor: String(l.colaborador_setor ?? '').trim() || '—',
        cargo: String(l.colaborador_cargo ?? '').trim() || '—',
        unidade_nome: String(l.colaborador_unidade_nome ?? '').trim() || '—',
        avaliacoes: [],
        media_semana: null,
        qtd_avaliadores: 0,
        tem_multiplos_avaliadores: false,
      });
    }
    map.get(chave)!.avaliacoes.push(l);
  }

  const grupos = Array.from(map.values()).map((g) => {
    const ordenadas = [...g.avaliacoes].sort((a, b) => {
      if (a.origem_visita_rh === b.origem_visita_rh) {
        return String(a.avaliador_nome ?? '').localeCompare(String(b.avaliador_nome ?? ''), 'pt-BR');
      }
      return a.origem_visita_rh ? 1 : -1;
    });
    const avaliadorIds = new Set(ordenadas.map((a) => String(a.avaliador_id)));
    return {
      ...g,
      avaliacoes: ordenadas,
      media_semana: mediaSemanaAdmin(ordenadas),
      qtd_avaliadores: avaliadorIds.size,
      tem_multiplos_avaliadores: avaliadorIds.size > 1,
    };
  });

  return ordenarGruposSemana(grupos, 'data');
}

/** Ordena grupos colaborador+semana por data (recente) ou por média da semana. */
export function ordenarGruposSemana(
  grupos: GrupoColaboradorSemana[],
  criterio: 'data' | 'nota',
  direcao: OrdemRankingAdmin = 'desc'
): GrupoColaboradorSemana[] {
  const mult = direcao === 'desc' ? -1 : 1;
  return [...grupos].sort((a, b) => {
    if (criterio === 'data') {
      const d = b.data_referencia.localeCompare(a.data_referencia);
      if (d !== 0) return d;
      return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
    }
    const ma = a.media_semana;
    const mb = b.media_semana;
    if (ma == null && mb == null) {
      const d = b.data_referencia.localeCompare(a.data_referencia);
      if (d !== 0) return d;
      return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
    }
    if (ma == null) return 1;
    if (mb == null) return -1;
    if (ma !== mb) return mult * (ma - mb);
    const d = b.data_referencia.localeCompare(a.data_referencia);
    if (d !== 0) return d;
    return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
  });
}

/** Consolida várias semanas por colaborador no período filtrado. */
export function agruparLinhasAdminPorColaboradorPeriodo(
  linhas: LinhaAdminAvaliacaoEquipe[]
): GrupoColaboradorPeriodo[] {
  const semanas = agruparLinhasAdminPorColaboradorSemana(linhas);
  const map = new Map<string, GrupoColaboradorPeriodo>();

  for (const g of semanas) {
    if (!map.has(g.colaborador_id)) {
      map.set(g.colaborador_id, {
        colaborador_id: g.colaborador_id,
        colaborador_nome: g.colaborador_nome,
        setor: g.setor,
        cargo: g.cargo,
        unidade_nome: g.unidade_nome,
        semanas: [],
        media_periodo: null,
        qtd_semanas_com_media: 0,
        posicao: 0,
      });
    }
    map.get(g.colaborador_id)!.semanas.push(g);
  }

  return Array.from(map.values()).map((g) => {
    const medias = g.semanas
      .map((s) => s.media_semana)
      .filter((m): m is number => m != null && !Number.isNaN(m));
    const media_periodo =
      medias.length === 0
        ? null
        : Math.round((medias.reduce((s, n) => s + n, 0) / medias.length) * 100) / 100;
    return {
      ...g,
      semanas: ordenarGruposSemana(g.semanas, 'data'),
      media_periodo,
      qtd_semanas_com_media: medias.length,
    };
  });
}

/** Atribui posição no ranking (empate = mesma posição; sem média fica por último). */
export function rankearGruposPeriodo(
  grupos: GrupoColaboradorPeriodo[],
  direcao: OrdemRankingAdmin = 'desc'
): GrupoColaboradorPeriodo[] {
  const mult = direcao === 'desc' ? -1 : 1;
  const sorted = [...grupos].sort((a, b) => {
    const ma = a.media_periodo;
    const mb = b.media_periodo;
    if (ma == null && mb == null) return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
    if (ma == null) return 1;
    if (mb == null) return -1;
    if (ma !== mb) return mult * (ma - mb);
    return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
  });

  let pos = 0;
  let ultimaMedia: number | null | undefined;
  return sorted.map((g, i) => {
    if (g.media_periodo == null) {
      return { ...g, posicao: 0 };
    }
    if (ultimaMedia !== g.media_periodo) {
      pos = i + 1;
      ultimaMedia = g.media_periodo;
    }
    return { ...g, posicao: pos };
  });
}

function mediaLinhaOrdenacao(l: LinhaAdminAvaliacaoEquipe): number | null {
  const exib = formatarExibicaoAvaliacaoAdmin(l);
  if (exib.foraPlantao || exib.legado || exib.isenta) return null;
  if (l.media_dia == null || Number.isNaN(Number(l.media_dia))) return null;
  return Number(l.media_dia);
}

/** Ordena linhas brutas por média (ranking linha a linha). */
export function ordenarLinhasAdminPorMedia(
  linhas: LinhaAdminAvaliacaoEquipe[],
  direcao: OrdemRankingAdmin = 'desc'
): LinhaAdminAvaliacaoEquipe[] {
  const mult = direcao === 'desc' ? -1 : 1;
  return [...linhas].sort((a, b) => {
    const ma = mediaLinhaOrdenacao(a);
    const mb = mediaLinhaOrdenacao(b);
    if (ma == null && mb == null) {
      const d = b.data_referencia.localeCompare(a.data_referencia);
      if (d !== 0) return d;
      return String(a.colaborador_nome ?? '').localeCompare(String(b.colaborador_nome ?? ''), 'pt-BR');
    }
    if (ma == null) return 1;
    if (mb == null) return -1;
    if (ma !== mb) return mult * (ma - mb);
    const d = b.data_referencia.localeCompare(a.data_referencia);
    if (d !== 0) return d;
    return String(a.colaborador_nome ?? '').localeCompare(String(b.colaborador_nome ?? ''), 'pt-BR');
  });
}

export function filtrarLinhasAdminBusca(
  linhas: LinhaAdminAvaliacaoEquipe[],
  busca: string
): LinhaAdminAvaliacaoEquipe[] {
  const q = busca.trim().toLowerCase();
  if (!q) return linhas;
  return linhas.filter((l) => {
    const nome = String(l.colaborador_nome ?? '').toLowerCase();
    const setor = String(l.colaborador_setor ?? '').toLowerCase();
    const cargo = String(l.colaborador_cargo ?? '').toLowerCase();
    const aval = String(l.avaliador_nome ?? l.avaliador_rotulo ?? '').toLowerCase();
    return nome.includes(q) || setor.includes(q) || cargo.includes(q) || aval.includes(q);
  });
}
