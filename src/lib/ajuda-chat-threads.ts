/** Separador entre blocos quando várias mensagens ficam na mesma linha do chat. */
export const AJUDA_CHAT_MSG_SEP = '\n\n———\n\n';

export type AjudaChatLinha = {
  id: string;
  colaborador_id?: string | null;
  colaborador_nome?: string | null;
  colaborador_telefone?: string | null;
  unidade_nome?: string | null;
  mensagem: string;
  resposta: string | null;
  respondido_por_nome?: string | null;
  created_at: string;
  respondido_em: string | null;
  lido_admin_em?: string | null;
};

export type AjudaChatTopico = {
  /** ID da primeira mensagem do tópico (usado na API de resposta). */
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_telefone: string | null;
  unidade_nome: string;
  mensagens: AjudaChatLinha[];
  /** Todas as linhas do tópico, em ordem cronológica. */
  blocos_mensagem: string[];
  resposta: string | null;
  respondido_por_nome: string | null;
  respondido_em: string | null;
  created_at: string;
  /** Data da última mensagem do tópico. */
  ultima_atividade: string;
  pendente: boolean;
};

function linhaPendente(row: AjudaChatLinha): boolean {
  if (row.respondido_em != null && String(row.respondido_em).trim() !== '') return false;
  if (row.resposta != null && String(row.resposta).trim() !== '') return false;
  return true;
}

export function parseBlocosMensagem(texto: string): string[] {
  if (!texto.trim()) return [];
  return texto
    .split(AJUDA_CHAT_MSG_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function appendAjudaMensagem(anterior: string, nova: string): string {
  const limpa = nova.trim();
  if (!limpa) return anterior.trim();
  if (!anterior.trim()) return limpa;
  const stamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${anterior.trim()}${AJUDA_CHAT_MSG_SEP}[${stamp}] ${limpa}`;
}

/** Agrupa linhas do mesmo colaborador: mensagens pendentes consecutivas viram um tópico. */
export function agruparAjudaChatEmTopicos(rows: AjudaChatLinha[]): AjudaChatTopico[] {
  const porColab = new Map<string, AjudaChatLinha[]>();
  for (const row of rows) {
    const cid = String(row.colaborador_id ?? '').trim() || `anon-${row.id}`;
    const list = porColab.get(cid) ?? [];
    list.push(row);
    porColab.set(cid, list);
  }

  const topicos: AjudaChatTopico[] = [];

  for (const linhas of Array.from(porColab.values())) {
    const sorted = [...linhas].sort((a, b) => a.created_at.localeCompare(b.created_at));
    let batch: AjudaChatLinha[] = [];

    const flush = () => {
      if (batch.length === 0) return;
      const first = batch[0];
      const last = batch[batch.length - 1];
      const pendente = batch.some(linhaPendente);
      const blocos = batch.flatMap((m) => parseBlocosMensagem(m.mensagem));
      topicos.push({
        id: first.id,
        colaborador_id: String(first.colaborador_id ?? ''),
        colaborador_nome: first.colaborador_nome?.trim() || 'Colaborador',
        colaborador_telefone: first.colaborador_telefone ?? null,
        unidade_nome: first.unidade_nome?.trim() || '-',
        mensagens: [...batch],
        blocos_mensagem: blocos,
        resposta: pendente ? null : last.resposta,
        respondido_por_nome: pendente ? null : (last.respondido_por_nome ?? null),
        respondido_em: pendente ? null : last.respondido_em,
        created_at: first.created_at,
        ultima_atividade: last.created_at,
        pendente,
      });
      batch = [];
    };

    for (const row of sorted) {
      const pending = linhaPendente(row);
      if (batch.length === 0) {
        batch.push(row);
        continue;
      }
      const batchAllPending = batch.every(linhaPendente);
      if (batchAllPending && pending) {
        batch.push(row);
      } else {
        flush();
        batch.push(row);
      }
    }
    flush();
  }

  return topicos.sort((a, b) => b.ultima_atividade.localeCompare(a.ultima_atividade));
}

/** IDs das linhas pendentes do mesmo tópico que contém `id`. */
export function idsPendentesDoTopico(rows: AjudaChatLinha[], id: string): string[] {
  const topicos = agruparAjudaChatEmTopicos(rows);
  const topico = topicos.find((t) => t.mensagens.some((m) => m.id === id));
  if (!topico) return [id];
  return topico.mensagens.filter(linhaPendente).map((m) => m.id);
}

export function contarTopicosPendentes(rows: AjudaChatLinha[]): number {
  return agruparAjudaChatEmTopicos(rows).filter((t) => t.pendente).length;
}
