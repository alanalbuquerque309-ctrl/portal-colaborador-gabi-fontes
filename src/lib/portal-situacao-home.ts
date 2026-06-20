import type { PortalHomeSituacao, PortalHomeTarefa } from '@/lib/portal-home-types';

/** Deriva semáforo a partir das mesmas tarefas do Faça agora. */
export function derivarSituacaoHome(tarefas: PortalHomeTarefa[]): PortalHomeSituacao {
  if (tarefas.length === 0) {
    return { nivel: 'ok', total: 0, mensagem: 'Tudo em dia' };
  }

  const idsUrgentes = new Set(['termometro', 'equipe', 'pendentes-rede']);
  const temUrgente =
    tarefas.some((t) => t.urgente === true || t.hero === true) ||
    tarefas.some((t) => idsUrgentes.has(t.id));

  if (temUrgente) {
    return {
      nivel: 'urgente',
      total: tarefas.length,
      mensagem:
        tarefas.length === 1
          ? 'Você tem 1 pendência importante'
          : `Você tem ${tarefas.length} pendências importantes`,
    };
  }

  const n = tarefas.length;
  return {
    nivel: 'atencao',
    total: n,
    mensagem: n === 1 ? 'Você tem 1 pendência' : `Você tem ${n} pendências`,
  };
}
