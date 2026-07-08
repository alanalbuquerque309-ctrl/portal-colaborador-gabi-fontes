import 'server-only';

import type { RegraAvaliacaoDireta } from '@/lib/config-avaliacao-direta';
import type { RegraLiderancaOperacional } from '@/lib/config-lideranca-operacional';
import {
  carregarRegrasAvaliacaoDiretaLegado,
  carregarRegrasLiderancaLegado,
} from '@/lib/tenant/regras-legado';
import {
  parseRegrasAvaliacaoDiretaMirror,
  parseRegrasLiderancaMirror,
} from '@/lib/tenant/regras-mirror-parse';
import { carregarTenantMirrorDb, useTenantDbMirror } from '@/lib/tenant/settings-server';

/** Servidor: legado hoje; espelho DB quando USE_TENANT_DB=true (migration 062). */
export async function carregarRegrasLiderancaLegadoResolvido(): Promise<RegraLiderancaOperacional[]> {
  if (!useTenantDbMirror()) return carregarRegrasLiderancaLegado();
  const mirror = await carregarTenantMirrorDb();
  const parsed = parseRegrasLiderancaMirror(mirror?.regrasLideranca);
  if (parsed?.length) return parsed;
  return carregarRegrasLiderancaLegado();
}

/** Servidor: legado hoje; espelho DB quando USE_TENANT_DB=true (migration 062). */
export async function carregarRegrasAvaliacaoDiretaResolvido(): Promise<RegraAvaliacaoDireta[]> {
  if (!useTenantDbMirror()) return carregarRegrasAvaliacaoDiretaLegado();
  const mirror = await carregarTenantMirrorDb();
  const parsed = parseRegrasAvaliacaoDiretaMirror(mirror?.regrasAvaliacaoDireta);
  if (parsed?.length) return parsed;
  return carregarRegrasAvaliacaoDiretaLegado();
}
