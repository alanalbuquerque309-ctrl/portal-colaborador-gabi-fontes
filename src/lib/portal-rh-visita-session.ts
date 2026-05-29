import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { podeAvaliarRhVisitaGeral } from '@/lib/avaliacao-rh-visita-access';

export type PortalRhVisitaContext = {
  colaboradorId: string;
  unidadeId: string;
  nome: string;
  role: string;
  setor: string | null;
};

export async function requirePortalRhVisitaSession(): Promise<
  { ok: true; ctx: PortalRhVisitaContext } | { ok: false; response: Response }
> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return {
      ok: false,
      response: Response.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 }),
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, role, unidade_id, nome, setor')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        response: Response.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 }),
      };
    }

    const ok = podeAvaliarRhVisitaGeral({
      colaboradorId: data.id,
      role: data.role as string,
      setor: (data as { setor?: string | null }).setor,
      nome: data.nome as string,
    });

    if (!ok) {
      return {
        ok: false,
        response: Response.json(
          { ok: false, erro: 'Acesso restrito à avaliadora RH (visita geral)' },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true,
      ctx: {
        colaboradorId: data.id,
        unidadeId: data.unidade_id,
        nome: String(data.nome ?? ''),
        role: String(data.role ?? ''),
        setor: (data as { setor?: string | null }).setor ?? null,
      },
    };
  } catch {
    return {
      ok: false,
      response: Response.json({ ok: false, erro: 'Erro ao validar sessão' }, { status: 500 }),
    };
  }
}
