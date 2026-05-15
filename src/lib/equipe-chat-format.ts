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
