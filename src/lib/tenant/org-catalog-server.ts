import 'server-only';

import {
  listarSetoresCadastroServer,
  listarUnidadesCadastroServer,
  listarUnidadesRelatorioFiliaisServer,
} from '@/lib/tenant/settings-server';
import type { UnidadeCadastro } from '@/lib/tenant/org-catalog';

/** Servidor: setores do espelho DB quando USE_TENANT_DB=true, senão constantes. */
export async function listarSetoresCadastroResolvido(): Promise<string[]> {
  return listarSetoresCadastroServer();
}

/** Servidor: unidades da tabela `unidades` (Supabase), com fallback à constante. */
export async function listarUnidadesCadastroResolvido(): Promise<UnidadeCadastro[]> {
  return listarUnidadesCadastroServer();
}

/** Servidor: unidades de relatório por filial (sem Administrativo). */
export async function listarUnidadesRelatorioFiliaisResolvido(): Promise<UnidadeCadastro[]> {
  return listarUnidadesRelatorioFiliaisServer();
}
