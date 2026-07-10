import { dataCivilBr } from '@/lib/data-civil-br';

const KEY = 'portal_emocional_hoje_v1';

export type EmocionalCacheCliente = {
  data_ref: string;
  colaborador_id: string;
  emocao: string | null;
  motivo: string | null;
};

export function lerEmocionalCacheCliente(colaboradorId: string): EmocionalCacheCliente | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmocionalCacheCliente;
    if (!parsed || parsed.colaborador_id !== colaboradorId) return null;
    if (parsed.data_ref !== dataCivilBr()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function gravarEmocionalCacheCliente(
  colaboradorId: string,
  emocao: string | null,
  motivo: string | null = null
) {
  if (typeof window === 'undefined') return;
  try {
    const payload: EmocionalCacheCliente = {
      data_ref: dataCivilBr(),
      colaborador_id: colaboradorId,
      emocao,
      motivo,
    };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}
