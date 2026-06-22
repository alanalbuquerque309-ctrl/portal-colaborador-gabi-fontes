import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authGestorEmocional } from '@/lib/emocional-gestao-auth';
import {
  emocaoEhNegativa,
  metaEmocao,
  ordenarRegistrosEmocional,
} from '@/lib/emocional-opcoes';
import { dataCivilBr } from '@/lib/data-civil-br';

export const dynamic = 'force-dynamic';

const SELECTS_REGISTRO_ADMIN = [
  'emocao, motivo, data, created_at, colaborador_id, colaboradores(nome, setor, role, unidades(nome))',
  'emocao, data, created_at, colaborador_id, colaboradores(nome, setor, role, unidades(nome))',
] as const;

function erroColunaMotivoAdmin(msg: string): boolean {
  return /motivo|column .* does not exist|schema cache/i.test(msg);
}

/** Lista todas as respostas do termômetro na data (gestão: Daniel, Keila, sócios, admin). */
export async function GET(req: Request) {
  const auth = await authGestorEmocional();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dataParam = searchParams.get('data')?.trim();
  const dataRef =
    dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : dataCivilBr();

  try {
    const supabase = createAdminClient();
    let data: Record<string, unknown>[] | null = null;
    let error: { message: string } | null = null;

    for (const sel of SELECTS_REGISTRO_ADMIN) {
      const res = await supabase
        .from('emocional_registro')
        .select(sel)
        .eq('data', dataRef)
        .order('created_at', { ascending: false });
      if (!res.error) {
        data = (res.data ?? []) as Record<string, unknown>[];
        error = null;
        break;
      }
      error = res.error;
      if (!erroColunaMotivoAdmin(res.error.message)) break;
    }

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const registros = ordenarRegistrosEmocional(
      (data ?? []).map((row: Record<string, unknown>) => {
        const col = row.colaboradores as
          | {
              nome?: string;
              setor?: string | null;
              role?: string | null;
              unidades?: { nome?: string } | { nome?: string }[] | null;
            }
          | null;
        const un = col?.unidades;
        const unidadeNome = Array.isArray(un) ? un[0]?.nome : un?.nome;
        const emocao = String(row.emocao ?? '');
        const meta = metaEmocao(emocao);
        return {
          colaborador_id: String(row.colaborador_id ?? ''),
          nome: String(col?.nome ?? 'Colaborador'),
          setor: col?.setor ? String(col.setor) : null,
          unidade_nome: unidadeNome ? String(unidadeNome) : null,
          role: col?.role ? String(col.role) : null,
          emocao,
          emocao_label: meta?.label ?? emocao,
          emoji: meta?.emoji ?? '❓',
          negativa: emocaoEhNegativa(emocao),
          motivo: row.motivo != null && String(row.motivo).trim() ? String(row.motivo).trim() : null,
          data: String(row.data ?? dataRef),
          registrado_em: row.created_at ? String(row.created_at) : null,
        };
      })
    );

    const negativas = registros.filter((r) => r.negativa).length;

    return NextResponse.json({
      ok: true,
      data_referencia: dataRef,
      total: registros.length,
      resumo: {
        negativas,
        demais: registros.length - negativas,
      },
      registros,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
