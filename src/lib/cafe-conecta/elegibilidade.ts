import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePortalRole, podeParticiparGraosCafe } from '@/lib/roles';
import { isSocioNegocioColaborador } from '@/lib/socios-negocio';
import { podeSerLider } from '@/lib/pode-ser-lider';
import { listarIdsLideresAtivos } from '@/lib/lider-inspirador';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import { idsColaboradoresDeFeriasNaSemana } from '@/lib/avaliacao-ferias-semana';
import { idsComAcessoPortalSemanaGraos } from '@/lib/cafe-conecta/acesso-portal';
import type { CafeConectaColaboradorBase, CafeConectaElegibilidadeLinha, CafeConectaMotivoInelegivel } from '@/lib/cafe-conecta/types';
import { resolverUnidadeIdsGrupoMesquita } from '@/lib/setores-fabrica-lideranca';
import type { CafeConectaGrupoConfig } from '@/lib/cafe-conecta/config';
import { gerarMes, parseFolgaDiasTexto, type ConfigEscala, type TipoEscala } from '@/lib/escala-calendario';

function normJust(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAfastadoJustificativa(j: string | null | undefined): boolean {
  const t = normJust(j);
  return t.includes('licenca') || t.includes('afastamento');
}

function isTipoEscala(v: string | null | undefined): v is TipoEscala {
  return v === '5x2' || v === '6x1' || v === '12x36';
}

function colaboradorEmFolgaNaData(
  tipoEscala: string | null,
  escalaFolgaDias: string | null,
  dataIso: string
): boolean {
  if (!isTipoEscala(tipoEscala) || tipoEscala === '12x36') return false;
  const { folgaDiasSemana, folgaDomingoSemanal } = parseFolgaDiasTexto(escalaFolgaDias);
  const config: ConfigEscala = { tipo: tipoEscala, folgaDiasSemana, folgaDomingoSemanal };
  const [y, m] = dataIso.split('-').map((x) => parseInt(x, 10));
  const dias = gerarMes(config, y, m || 1);
  const dia = dias.find((d) => d.data === dataIso);
  return dia?.folga === true;
}

async function resolverUnidadeIdsDoGrupo(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig
): Promise<string[]> {
  if (grupo.slug === 'mesquita') {
    return resolverUnidadeIdsGrupoMesquita(supabase);
  }
  const { data, error } = await supabase.from('unidades').select('id').in('slug', [...grupo.unidade_slugs]);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.id)).filter(Boolean);
}

export function colaboradorPodeEntrarPoolCafeConecta(opts: {
  role: string;
  cargo: string | null;
  nome: string;
  onboarding_completo: boolean;
  id: string;
  liderIds: Set<string>;
}): boolean {
  if (!opts.onboarding_completo) return false;
  if (!podeParticiparGraosCafe(opts.role)) return false;
  if (isSocioNegocioColaborador({ nome: opts.nome, role: opts.role })) return false;
  if (opts.liderIds.has(opts.id)) return false;
  if (podeSerLider(opts.role, opts.cargo, opts.nome)) return false;
  return true;
}

export async function listarBaseOperacionalGrupo(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig
): Promise<CafeConectaColaboradorBase[]> {
  const unidadeIds = await resolverUnidadeIdsDoGrupo(supabase, grupo);
  if (unidadeIds.length === 0) return [];

  const liderIds = new Set(await listarIdsLideresAtivos(supabase));

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, setor, cargo, role, unidade_id, onboarding_completo, unidades(nome, slug)')
    .in('unidade_id', unidadeIds)
    .eq('onboarding_completo', true)
    .order('nome', { ascending: true })
    .limit(3000);

  if (error) throw new Error(error.message);

  const out: CafeConectaColaboradorBase[] = [];
  for (const raw of data ?? []) {
    const id = String(raw.id);
    const role = normalizePortalRole((raw as { role?: string }).role);
    const nome = String(raw.nome ?? '');
    const cargo = (raw as { cargo?: string | null }).cargo ?? null;
    if (
      !colaboradorPodeEntrarPoolCafeConecta({
        id,
        role,
        cargo,
        nome,
        onboarding_completo: (raw as { onboarding_completo?: boolean }).onboarding_completo === true,
        liderIds,
      })
    ) {
      continue;
    }
    const u = Array.isArray(raw.unidades) ? raw.unidades[0] : raw.unidades;
    out.push({
      id,
      nome,
      setor: (raw as { setor?: string | null }).setor ?? null,
      cargo,
      unidade_id: String(raw.unidade_id),
      unidade_nome: u?.nome ? String(u.nome) : '',
      unidade_slug: u?.slug ? String(u.slug) : '',
      role,
    });
  }
  return out;
}

export async function avaliarElegibilidadeSemanaCafeConecta(
  supabase: SupabaseClient,
  base: CafeConectaColaboradorBase[],
  semanaInicio: string,
  dataQuarta: string
): Promise<CafeConectaElegibilidadeLinha[]> {
  if (base.length === 0) return [];

  const ids = base.map((c) => c.id);
  const [feriasIds, acessoIds, avalRows, escalaRows] = await Promise.all([
    idsColaboradoresDeFeriasNaSemana(supabase, ids, semanaInicio),
    idsComAcessoPortalSemanaGraos(supabase, ids, semanaInicio),
    supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, assiduidade, justificativa_nota_baixa, ignorada')
      .eq('data_referencia', semanaInicio)
      .in('colaborador_id', ids),
    supabase
      .from('colaboradores')
      .select('id, tipo_escala, escala_folga_dias')
      .in('id', ids),
  ]);

  if (avalRows.error && !/ignorada/i.test(avalRows.error.message)) {
    throw new Error(avalRows.error.message);
  }
  if (escalaRows.error) throw new Error(escalaRows.error.message);

  const avalPorColab = new Map<string, Array<{ assiduidade?: string | null; justificativa_nota_baixa?: string | null; ignorada?: boolean | null }>>();
  for (const row of avalRows.data ?? []) {
    const cid = String(row.colaborador_id);
    const list = avalPorColab.get(cid) ?? [];
    list.push(row as { assiduidade?: string | null; justificativa_nota_baixa?: string | null; ignorada?: boolean | null });
    avalPorColab.set(cid, list);
  }

  const escalaPorId = new Map<string, { tipo_escala: string | null; escala_folga_dias: string | null }>();
  for (const row of escalaRows.data ?? []) {
    escalaPorId.set(String(row.id), {
      tipo_escala: (row as { tipo_escala?: string | null }).tipo_escala ?? null,
      escala_folga_dias: (row as { escala_folga_dias?: string | null }).escala_folga_dias ?? null,
    });
  }

  return base.map((c) => {
    let motivo: CafeConectaMotivoInelegivel | null = null;

    if (feriasIds.has(c.id)) {
      motivo = 'ferias';
    } else {
      const linhas = avalPorColab.get(c.id) ?? [];
      const afastado = linhas.some((r) => {
        if (r.ignorada === true) return false;
        const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
        if (a === 'ferias') return true;
        if (a === 'folga' || a === 'outra_escala') return false;
        if (a === 'falta_justificada' && isAfastadoJustificativa(r.justificativa_nota_baixa)) return true;
        return false;
      });
      if (afastado) {
        motivo = 'afastado';
      } else {
        const folgaSemana = linhas.some((r) => {
          if (r.ignorada === true) return false;
          const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
          return a === 'folga' || a === 'outra_escala';
        });
        const esc = escalaPorId.get(c.id);
        const folgaQuarta =
          folgaSemana ||
          (esc
            ? colaboradorEmFolgaNaData(esc.tipo_escala, esc.escala_folga_dias, dataQuarta)
            : false);
        if (folgaQuarta) {
          motivo = 'folga_quarta';
        } else if (!acessoIds.has(c.id)) {
          motivo = 'sem_acesso_portal';
        }
      }
    }

    return { ...c, elegivel: motivo === null, motivo };
  });
}

export function contagemMotivosElegibilidade(lista: CafeConectaElegibilidadeLinha[]) {
  let elegiveis = 0;
  let ferias = 0;
  let afastados = 0;
  let folga = 0;
  let sem_acesso = 0;
  for (const l of lista) {
    if (l.elegivel) {
      elegiveis++;
      continue;
    }
    switch (l.motivo) {
      case 'ferias':
        ferias++;
        break;
      case 'afastado':
        afastados++;
        break;
      case 'folga_quarta':
        folga++;
        break;
      case 'sem_acesso_portal':
        sem_acesso++;
        break;
      default:
        break;
    }
  }
  return {
    elegiveis,
    nao_elegiveis: lista.length - elegiveis,
    ferias,
    afastados,
    folga,
    sem_acesso,
  };
}
