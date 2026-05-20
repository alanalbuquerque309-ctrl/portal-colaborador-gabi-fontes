import { createAdminClient } from '@/lib/supabase/admin';

export async function nomesPorIds(ids: string[]): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, string>();
  if (!uniq.length) return map;

  const supabase = createAdminClient();
  const { data } = await supabase.from('colaboradores').select('id, nome').in('id', uniq);
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.nome ?? 'Colaborador'));
  }
  return map;
}

/** Nome + telefone por id (evita embed PostgREST que pode omitir linhas de sócio/admin). */
export async function colaboradoresResumoPorIds(
  ids: string[]
): Promise<Map<string, { nome: string; telefone: string | null }>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, { nome: string; telefone: string | null }>();
  if (!uniq.length) return map;

  const supabase = createAdminClient();
  const { data } = await supabase.from('colaboradores').select('id, nome, telefone').in('id', uniq);
  for (const row of data ?? []) {
    map.set(String(row.id), {
      nome: String(row.nome ?? 'Colaborador'),
      telefone: row.telefone != null ? String(row.telefone) : null,
    });
  }
  return map;
}
