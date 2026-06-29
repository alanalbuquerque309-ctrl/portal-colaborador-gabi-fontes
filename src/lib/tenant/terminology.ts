import { DEFAULT_TERMOS } from '@/lib/tenant/defaults';

export type TenantTermoId = keyof typeof DEFAULT_TERMOS;

const ENV_POR_TERMO: Record<TenantTermoId, string> = {
  reconhecimento: 'NEXT_PUBLIC_TERMO_RECONHECIMENTO',
  cafe_conecta: 'NEXT_PUBLIC_TERMO_CAFE_CONECTA',
  quinta_treino: 'NEXT_PUBLIC_TERMO_QUINTA_TREINO',
};

/** Rótulos de cultura/módulos configuráveis por tenant (env → default legado). */
export function getTermo(id: TenantTermoId): string {
  const envKey = ENV_POR_TERMO[id];
  const custom = process.env[envKey]?.trim();
  if (custom) return custom;
  return DEFAULT_TERMOS[id];
}

export function getTermosTenant(): Record<TenantTermoId, string> {
  return {
    reconhecimento: getTermo('reconhecimento'),
    cafe_conecta: getTermo('cafe_conecta'),
    quinta_treino: getTermo('quinta_treino'),
  };
}

/** Nav compacta / unidade de contagem (primeira palavra do termo). */
export function getTermoCurto(id: TenantTermoId): string {
  const full = getTermo(id);
  const first = full.split(/\s+/)[0];
  return first || full;
}
