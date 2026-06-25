import type { PortalHomeSituacao, PortalHomeTarefa } from '@/lib/portal-home-types';

/** Tarefas opcionais que aparecem no Faça agora mas não devem acionar o semáforo. */
const IDS_IGNORADOS_SITUACAO = new Set(['trofeus', 'pendentes-rede']);

/** Deriva semáforo a partir das mesmas tarefas do Faça agora. */
export function derivarSituacaoHome(tarefas: PortalHomeTarefa[]): PortalHomeSituacao {
  const relevantes = tarefas.filter((t) => !IDS_IGNORADOS_SITUACAO.has(t.id));

  if (relevantes.length === 0) {
    return { nivel: 'ok', total: 0, mensagem: 'Tudo em dia' };
  }

  const idsUrgentes = new Set(['termometro', 'equipe', 'pendentes-rede']);
  const temUrgente =
    relevantes.some((t) => t.urgente === true || t.hero === true) ||
    relevantes.some((t) => idsUrgentes.has(t.id));

  if (temUrgente) {
    return {
      nivel: 'urgente',
      total: relevantes.length,
      mensagem:
        relevantes.length === 1
          ? 'Você tem 1 pendência importante'
          : `Você tem ${relevantes.length} pendências importantes`,
    };
  }

  const n = relevantes.length;
  return {
    nivel: 'atencao',
    total: n,
    mensagem: n === 1 ? 'Você tem 1 pendência' : `Você tem ${n} pendências`,
  };
}