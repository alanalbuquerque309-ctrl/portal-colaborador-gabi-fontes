import type { createAdminClient } from '@/lib/supabase/admin';
import { listarUnidadesCadastroServer } from '@/lib/tenant/settings-server';
import {
  LIDER_TRANSVERSAL_CD_NOME,
  type RegraLiderancaOperacional,
} from '@/lib/config-lideranca-operacional';
import { carregarRegrasLiderancaLegadoResolvido } from '@/lib/tenant/regras-legado-server';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { isLiderAdministradorTransversal } from '@/lib/lideranca-transversal';
import { normalizePortalRole } from '@/lib/roles';
import { podeSerLider } from '@/lib/pode-ser-lider';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type ResultadoAplicarConfig = {
  inseridos: number;
  erros: string[];
  lideres_nao_encontrados: string[];
  desativados_fora_mapa: number;
};

function normalizarNome(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nomeCoincide(cadastro: string, busca: string): boolean {
  const a = normalizarNome(cadastro);
  const b = normalizarNome(busca);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const partesB = b.split(/\s+/).filter((p) => p.length > 2);
  if (partesB.length >= 2) {
    return partesB.every((p) => a.includes(p));
  }
  return false;
}

async function resolverUnidadeId(
  supabase: SupabaseAdmin,
  slug: string,
  catalogo: { slug: string; label: string }[]
): Promise<string | null> {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  if (data?.id) return String(data.id);
  const def = catalogo.find((u) => u.slug === slug);
  if (!def) return null;
  const { data: ins } = await supabase
    .from('unidades')
    .insert({ nome: def.label, slug: def.slug })
    .select('id')
    .single();
  return ins?.id ? String(ins.id) : null;
}

async function resolverLiderId(
  supabase: SupabaseAdmin,
  nomeBusca: string,
  unidadeIdPreferida?: string | null
): Promise<string | null> {
  let query = supabase.from('colaboradores').select('id, nome, role, cargo, unidade_id');
  if (unidadeIdPreferida) query = query.eq('unidade_id', unidadeIdPreferida);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const candidatos = (data ?? []).filter(
    (c) =>
      nomeCoincide(String(c.nome ?? ''), nomeBusca) &&
      podeSerLider(
        (c as { role?: string }).role,
        (c as { cargo?: string }).cargo,
        String(c.nome ?? '')
      )
  );
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return String(candidatos[0].id);

  const exato = candidatos.find((c) => normalizarNome(String(c.nome)) === normalizarNome(nomeBusca));
  if (exato?.id) return String(exato.id);
  return String(candidatos[0].id);
}

/** Ocupante da função «administrador da empresa» (role/cargo), com fallback legado por nome. */
async function resolverLiderAdministradorEmpresa(supabase: SupabaseAdmin): Promise<string | null> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, cargo')
    .or('role.eq.admin,role.eq.administrador,role.ilike.%admin%');
  if (error) throw new Error(error.message);

  const porFuncao = (data ?? []).filter((c) =>
    isLiderAdministradorTransversal(
      (c as { role?: string }).role,
      (c as { cargo?: string }).cargo
    )
  );
  if (porFuncao.length === 1) return String(porFuncao[0].id);
  if (porFuncao.length > 1) {
    const exato = porFuncao.find(
      (c) => normalizePortalRole((c as { role?: string }).role) === 'admin'
    );
    if (exato?.id) return String(exato.id);
    return String(porFuncao[0].id);
  }

  return resolverLiderId(supabase, LIDER_TRANSVERSAL_CD_NOME, null);
}

async function upsertConfig(
  supabase: SupabaseAdmin,
  unidadeId: string,
  setor: string,
  liderId: string
): Promise<void> {
  const { error } = await supabase.from('lideres_por_setor').upsert(
    {
      unidade_id: unidadeId,
      setor,
      lider_id: liderId,
      ativo: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'unidade_id,setor,lider_id' }
  );
  if (error) throw new Error(error.message);
}

async function aplicarRegra(
  supabase: SupabaseAdmin,
  regra: RegraLiderancaOperacional,
  resultado: ResultadoAplicarConfig,
  unidadeIdsTodas: string[],
  catalogoUnidades: { slug: string; label: string }[]
): Promise<void> {
  if (regra.tipo === 'unidade_todos') {
    const uid = await resolverUnidadeId(supabase, regra.unidade_slug, catalogoUnidades);
    if (!uid) {
      resultado.erros.push(`Unidade não encontrada: ${regra.unidade_slug}`);
      return;
    }
    const nomesLider =
      regra.unidade_slug === 'administrativo'
        ? []
        : regra.lideres_nomes;
    if (regra.unidade_slug === 'administrativo') {
      const lid = await resolverLiderAdministradorEmpresa(supabase);
      if (!lid) {
        resultado.lideres_nao_encontrados.push(`Administrador (${regra.unidade_slug})`);
        return;
      }
      await upsertConfig(supabase, uid, SETOR_TODOS_NA_UNIDADE, lid);
      resultado.inseridos += 1;
      return;
    }
    for (const nome of nomesLider) {
      let lid = await resolverLiderId(supabase, nome, uid);
      if (!lid) lid = await resolverLiderId(supabase, nome, null);
      if (!lid) {
        resultado.lideres_nao_encontrados.push(`${nome} (${regra.unidade_slug})`);
        continue;
      }
      await upsertConfig(supabase, uid, SETOR_TODOS_NA_UNIDADE, lid);
      resultado.inseridos += 1;
    }
    return;
  }

  if (regra.tipo === 'unidade_setor') {
    const uid = await resolverUnidadeId(supabase, regra.unidade_slug, catalogoUnidades);
    if (!uid) {
      resultado.erros.push(`Unidade não encontrada: ${regra.unidade_slug}`);
      return;
    }
    for (const nome of regra.lideres_nomes) {
      let lid = await resolverLiderId(supabase, nome, uid);
      if (!lid) lid = await resolverLiderId(supabase, nome, null);
      if (!lid) {
        resultado.lideres_nao_encontrados.push(`${nome} (${regra.unidade_slug} / ${regra.setor})`);
        continue;
      }
      await upsertConfig(supabase, uid, regra.setor, lid);
      resultado.inseridos += 1;
    }
    return;
  }

  if (regra.tipo === 'setor_todas_unidades') {
    const lid = await resolverLiderAdministradorEmpresa(supabase);
    if (!lid) {
      resultado.lideres_nao_encontrados.push(`Administrador empresa (setor ${regra.setor})`);
      return;
    }
    for (const uid of unidadeIdsTodas) {
      await upsertConfig(supabase, uid, regra.setor, lid);
      resultado.inseridos += 1;
    }
  }
}

/** Pares (unidade_id, setor) que o mapa operacional permite para um líder pelo nome. */
async function paresPermitidosParaLider(
  supabase: SupabaseAdmin,
  nomeLider: string,
  regras: RegraLiderancaOperacional[],
  unidadeIdsTodas: string[],
  catalogoUnidades: { slug: string; label: string }[]
): Promise<Set<string>> {
  const allowed = new Set<string>();
  for (const regra of regras) {
    if (!regra.lideres_nomes.some((n) => nomeCoincide(n, nomeLider))) continue;

    if (regra.tipo === 'unidade_todos') {
      const uid = await resolverUnidadeId(supabase, regra.unidade_slug, catalogoUnidades);
      if (uid) allowed.add(`${uid}|${SETOR_TODOS_NA_UNIDADE}`);
      continue;
    }
    if (regra.tipo === 'unidade_setor') {
      const uid = await resolverUnidadeId(supabase, regra.unidade_slug, catalogoUnidades);
      if (uid) allowed.add(`${uid}|${regra.setor}`);
      continue;
    }
    if (regra.tipo === 'setor_todas_unidades') {
      for (const uid of unidadeIdsTodas) {
        allowed.add(`${uid}|${regra.setor}`);
      }
    }
  }
  return allowed;
}

/**
 * Desativa linhas em `lideres_por_setor` que não batem com o mapa (ex.: Daniel em Atendimento).
 */
export async function desativarLideresForaDoMapaOperacional(
  supabase: SupabaseAdmin,
  regras?: RegraLiderancaOperacional[]
): Promise<number> {
  const regrasEfetivas = regras ?? (await carregarRegrasLiderancaLegadoResolvido());
  const catalogoUnidades = await listarUnidadesCadastroServer();
  const unidadeIdsTodas: string[] = [];
  for (const u of catalogoUnidades) {
    const id = await resolverUnidadeId(supabase, u.slug, catalogoUnidades);
    if (id) unidadeIdsTodas.push(id);
  }

  const nomesUnicos = Array.from(
    new Set(regrasEfetivas.flatMap((r) => r.lideres_nomes.map((n) => n.trim()).filter(Boolean)))
  );

  let desativados = 0;
  for (const nome of nomesUnicos) {
    const liderId = await resolverLiderId(supabase, nome, null);
    if (!liderId) continue;
    const allowed = await paresPermitidosParaLider(
      supabase,
      nome,
      regrasEfetivas,
      unidadeIdsTodas,
      catalogoUnidades
    );
    const { data, error } = await supabase
      .from('lideres_por_setor')
      .select('id, unidade_id, setor')
      .eq('lider_id', liderId)
      .eq('ativo', true);
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const uid = String(row.unidade_id ?? '');
      const setor = String(row.setor ?? '').trim();
      const key = `${uid}|${setor}`;
      if (!allowed.has(key)) {
        const { error: upErr } = await supabase
          .from('lideres_por_setor')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('id', String(row.id));
        if (!upErr) desativados += 1;
      }
    }
  }

  return desativados;
}

/** Grava regras operacionais em `lideres_por_setor`. */
export async function aplicarConfigLiderancaOperacional(
  supabase: SupabaseAdmin,
  regras?: RegraLiderancaOperacional[]
): Promise<ResultadoAplicarConfig> {
  const regrasEfetivas = regras ?? (await carregarRegrasLiderancaLegadoResolvido());
  const resultado: ResultadoAplicarConfig = {
    inseridos: 0,
    erros: [],
    lideres_nao_encontrados: [],
    desativados_fora_mapa: 0,
  };

  const catalogoUnidades = await listarUnidadesCadastroServer();
  const unidadeIdsTodas: string[] = [];
  for (const u of catalogoUnidades) {
    const id = await resolverUnidadeId(supabase, u.slug, catalogoUnidades);
    if (id) unidadeIdsTodas.push(id);
  }

  for (const regra of regrasEfetivas) {
    try {
      await aplicarRegra(supabase, regra, resultado, unidadeIdsTodas, catalogoUnidades);
    } catch (e) {
      resultado.erros.push(e instanceof Error ? e.message : String(e));
    }
  }

  try {
    resultado.desativados_fora_mapa = await desativarLideresForaDoMapaOperacional(supabase, regrasEfetivas);
  } catch (e) {
    resultado.erros.push(e instanceof Error ? e.message : String(e));
  }

  try {
    const { error: estErr } = await supabase
      .from('lideres_por_setor')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('setor', 'Estoque')
      .eq('ativo', true);
    if (estErr) resultado.erros.push(estErr.message);
  } catch (e) {
    resultado.erros.push(e instanceof Error ? e.message : String(e));
  }

  return resultado;
}
