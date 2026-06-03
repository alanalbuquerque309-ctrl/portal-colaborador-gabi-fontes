import type { LinhaAvaliacaoGaveta } from '@/components/admin/AvaliacaoNotasGaveta';
import { formatarExibicaoAvaliacaoAdmin } from '@/lib/avaliacao-diaria';

export type LinhaAdminAvaliacaoEquipe = LinhaAvaliacaoGaveta & {
  colaborador_id: string;
  avaliador_id: string;
  colaborador_setor?: string | null;
  colaborador_cargo?: string | null;
  colaborador_unidade_nome?: string | null;
  avaliador_rotulo?: string | null;
  origem_visita_rh?: boolean;
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
    const exib = formatarExibicaoAvaliacaoAdmin(a);
    if (exib.isenta) continue;
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

  return grupos.sort((a, b) => {
    const d = b.data_referencia.localeCompare(a.data_referencia);
    if (d !== 0) return d;
    return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
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
