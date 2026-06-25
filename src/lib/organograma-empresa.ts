import {
  type NoOrganogramaConfig,
  PILARES_ORGANOGRAMA_EMPRESA,
} from '@/lib/config-organograma-empresa';

export type ColaboradorOrganograma = {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
};

export type NoOrganogramaEmpresa = Omit<NoOrganogramaConfig, 'filhos'> & {
  ocupantes: string[];
  filhos?: NoOrganogramaEmpresa[];
};

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function colaboradorCasaNo(no: NoOrganogramaConfig, c: ColaboradorOrganograma): boolean {
  const match = no.match;
  if (!match) return false;
  const cargo = norm(c.cargo);
  const setor = norm(c.setor);
  const cargosOk =
    !match.cargos?.length ||
    match.cargos.some((k) => cargo.includes(norm(k)) || norm(k).includes(cargo));
  const setoresOk =
    !match.setores?.length ||
    match.setores.some((k) => setor.includes(norm(k)) || norm(k).includes(setor));
  if (match.cargos?.length && match.setores?.length) return cargosOk && setoresOk;
  if (match.cargos?.length) return cargosOk;
  if (match.setores?.length) return setoresOk;
  return false;
}

function preencherNo(no: NoOrganogramaConfig, colaboradores: ColaboradorOrganograma[]): NoOrganogramaEmpresa {
  const ocupantes = colaboradores
    .filter((c) => colaboradorCasaNo(no, c))
    .map((c) => c.nome)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return {
    ...no,
    ocupantes,
    filhos: no.filhos?.map((f) => preencherNo(f, colaboradores)),
  };
}

export function montarOrganogramaEmpresa(colaboradores: ColaboradorOrganograma[]) {
  return PILARES_ORGANOGRAMA_EMPRESA.map((p) => ({
    ...p,
    raiz: preencherNo(p.raiz, colaboradores),
  }));
}
