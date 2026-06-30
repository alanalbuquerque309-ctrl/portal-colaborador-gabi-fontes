/**
 * Porta única para regras operacionais por nome (Gabi Fontes legado).
 * Funções síncronas, seguras para import em cliente. Resolução async: regras-legado-server.ts.
 */

import {
  REGRAS_AVALIACAO_DIRETA,
  type RegraAvaliacaoDireta,
} from '@/lib/config-avaliacao-direta';
import {
  REGRAS_LIDERANCA_OPERACIONAL,
  type RegraLiderancaOperacional,
} from '@/lib/config-lideranca-operacional';

export type { RegraAvaliacaoDireta, RegraLiderancaOperacional };

/** Mapa de liderança acordado (nomes → unidade/setor). Síncrono = legado em TS. */
export function carregarRegrasLiderancaLegado(): RegraLiderancaOperacional[] {
  return REGRAS_LIDERANCA_OPERACIONAL;
}

/** Avaliação direta sócia/RH por nome. Síncrono = legado em TS. */
export function carregarRegrasAvaliacaoDiretaLegado(): RegraAvaliacaoDireta[] {
  return REGRAS_AVALIACAO_DIRETA;
}
