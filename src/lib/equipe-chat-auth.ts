import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canAcessarChatEquipe } from '@/lib/roles';

export type EquipeChatViewer = { id: string; role: string; nome: string };

export async function getEquipeChatViewer(): Promise<EquipeChatViewer | null> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('colaboradores')
    .select('id, role, nome')
    .eq('id', colaboradorId)
    .maybeSingle();
  if (!data) return null;

  const role = String((data as { role?: string }).role ?? '');
  if (!canAcessarChatEquipe(role, colaboradorId)) return null;

  return {
    id: String(data.id),
    role,
    nome: String((data as { nome?: string }).nome ?? 'Colaborador'),
  };
}

export function normalizeMensagem(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

export function isMissingEquipeChatTable(errorMessage: string): boolean {
  const msg = String(errorMessage || '').toLowerCase();
  return msg.includes('equipe_chat_mensagens') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
