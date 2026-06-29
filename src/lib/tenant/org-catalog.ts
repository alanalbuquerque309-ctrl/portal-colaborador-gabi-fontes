/**
 * Catálogo organizacional (unidades, setores): porta única de leitura.
 * Hoje delega às constantes legadas; servidor pode ler espelho DB com USE_TENANT_DB=true.
 */

import {
  SETORES_PREDEFINIDOS,
  SETOR_ESTOQUE_LEGADO,
  SETORES_AVALIACAO_EQUIPE_BACKOFFICE,
  SLUG_UNIDADE_ADMINISTRATIVO,
  UNIDADES_CADASTRO,
} from '@/lib/constants/colaborador-org';
import { listarSetoresCadastroServer } from '@/lib/tenant/settings-server';

export type UnidadeCadastro = { slug: string; label: string };

export function listarUnidadesCadastro(): readonly UnidadeCadastro[] {
  return UNIDADES_CADASTRO;
}

export function listarUnidadesRelatorioFiliais(): readonly UnidadeCadastro[] {
  return UNIDADES_CADASTRO.filter((u) => u.slug !== SLUG_UNIDADE_ADMINISTRATIVO);
}

export function slugUnidadeAdministrativo(): string {
  return SLUG_UNIDADE_ADMINISTRATIVO;
}

export function listarSetoresCadastro(): readonly string[] {
  return SETORES_PREDEFINIDOS;
}

export function setorEstoqueLegado(): string {
  return SETOR_ESTOQUE_LEGADO;
}

export function listarSetoresAvaliacaoEquipeBackoffice(): readonly string[] {
  return SETORES_AVALIACAO_EQUIPE_BACKOFFICE;
}

export function isSetorCadastroValido(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return false;
  const t = s.trim();
  if (t === SETOR_ESTOQUE_LEGADO) return true;
  return listarSetoresCadastro().includes(t);
}

export function isUnidadeSlugCadastroValido(slug: string): boolean {
  return listarUnidadesCadastro().some((u) => u.slug === slug);
}

/** Servidor: setores do espelho DB quando USE_TENANT_DB=true, senão constantes. */
export async function listarSetoresCadastroResolvido(): Promise<string[]> {
  return listarSetoresCadastroServer();
}
