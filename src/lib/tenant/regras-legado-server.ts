import 'server-only';

import type { RegraAvaliacaoDireta } from '@/lib/config-avaliacao-direta';
import type { RegraLiderancaOperacional } from '@/lib/config-lideranca-operacional';
import {
  carregarRegrasAvaliacaoDiretaLegado,
  carregarRegrasLiderancaLegado,
} from '@/lib/tenant/regras-legado';
import { useTenantDbMirror } from '@/lib/tenant/settings-server';

/** Servidor: legado hoje; futuro espelho DB quando USE_TENANT_DB=true. */
export async function carregarRegrasLiderancaLegadoResolvido(): Promise<RegraLiderancaOperacional[]> {
  if (!useTenantDbMirror()) return carregarRegrasLiderancaLegado();
  // Fase 2.5+: ler de tenant_settings / migration 062
  return carregarRegrasLiderancaLegado();
}

/** Servidor: legado hoje; futuro espelho DB quando USE_TENANT_DB=true. */
export async function carregarRegrasAvaliacaoDiretaResolvido(): Promise<RegraAvaliacaoDireta[]> {
  if (!useTenantDbMirror()) return carregarRegrasAvaliacaoDiretaLegado();
  return carregarRegrasAvaliacaoDiretaLegado();
}
