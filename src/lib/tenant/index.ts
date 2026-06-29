export { getTenantBranding, tituloPaginaTenant, type TenantBranding } from '@/lib/tenant/branding';
export { getTermo, getTermosTenant, type TenantTermoId } from '@/lib/tenant/terminology';
export { getModulosTenant, moduloTenantAtivo } from '@/lib/tenant/modulos';
export {
  listarUnidadesCadastro,
  listarUnidadesRelatorioFiliais,
  listarSetoresCadastro,
  listarSetoresAvaliacaoEquipeBackoffice,
  listarSetoresCadastroResolvido,
  listarUnidadesCadastroResolvido,
  listarUnidadesRelatorioFiliaisResolvido,
  slugUnidadeAdministrativo,
  setorEstoqueLegado,
  isSetorCadastroValido,
  isUnidadeSlugCadastroValido,
  type UnidadeCadastro,
} from '@/lib/tenant/org-catalog';
export {
  DEFAULT_TENANT_SLUG,
  DEFAULT_BRANDING,
  DEFAULT_TERMOS,
  DEFAULT_MODULOS,
} from '@/lib/tenant/defaults';
