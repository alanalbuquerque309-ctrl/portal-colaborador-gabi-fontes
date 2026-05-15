import { createAdminClient } from '@/lib/supabase/admin';
import { getAjudaResponsavelColaboradorId, normalizePortalRole } from '@/lib/roles';

export type ContatoEquipe = { id: string; nome: string; role: string };

/** Lista quem pode receber mensagem direta (exclui o próprio utilizador). */
export async function listarContatosEquipe(meuId: string): Promise<ContatoEquipe[]> {
  const supabase = createAdminClient();
  const responsavelId = getAjudaResponsavelColaboradorId();

  const { data: sociosAdmins } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .in('role', ['socio', 'admin'])
    .order('nome', { ascending: true });

  const map = new Map<string, ContatoEquipe>();

  for (const row of sociosAdmins ?? []) {
    const id = String(row.id);
    if (id === meuId) continue;
    map.set(id, {
      id,
      nome: String(row.nome ?? 'Colaborador'),
      role: normalizePortalRole(String(row.role ?? '')),
    });
  }

  if (responsavelId && responsavelId !== meuId) {
    const { data: resp } = await supabase
      .from('colaboradores')
      .select('id, nome, role')
      .eq('id', responsavelId)
      .maybeSingle();
    if (resp?.id) {
      map.set(String(resp.id), {
        id: String(resp.id),
        nome: String(resp.nome ?? 'Atendimento'),
        role: normalizePortalRole(String(resp.role ?? 'colaborador')),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function contatoPermitido(meuId: string, outroId: string): Promise<boolean> {
  if (!outroId || outroId === meuId) return false;
  const contatos = await listarContatosEquipe(meuId);
  return contatos.some((c) => c.id === outroId);
}
