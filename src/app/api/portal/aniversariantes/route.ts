import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  aniversarioNoMes,
  formatarDiaMesAniversarioPtBr,
  partesDataIso,
} from '@/lib/data-civil-br';

/** Lista aniversariantes do mês (todas as unidades). Requer login no portal. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const ref = new Date();

    const { data: colaboradores, error } = await supabase
      .from('colaboradores')
      .select('id, nome, data_nascimento, data_admissao, foto_url, unidades(nome)')
      .not('data_nascimento', 'is', null);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const todos = colaboradores ?? [];
    const doMes = todos.filter((c: { data_nascimento: string | null }) =>
      aniversarioNoMes(c.data_nascimento, ref)
    );

    const resultado = doMes
      .map((c: Record<string, unknown>) => {
        const un = c.unidades;
        const nomeUnidade = Array.isArray(un) ? (un[0] as { nome?: string })?.nome : (un as { nome?: string })?.nome;
        const nasc = c.data_nascimento as string | null;
        const adm = c.data_admissao as string | null;
        const mesmoDiaAdmissao =
          nasc && adm && String(nasc).slice(0, 10) === String(adm).slice(0, 10);
        const partes = partesDataIso(nasc);
        return {
          id: c.id,
          nome: c.nome,
          data_nascimento: nasc,
          aniversario_label: formatarDiaMesAniversarioPtBr(nasc),
          foto_url: c.foto_url ?? null,
          unidade_nome: nomeUnidade ?? '',
          possivel_conflito_admissao: mesmoDiaAdmissao,
          dia_mes: partes ? partes.dia : 32,
        };
      })
      .sort((a, b) => {
        const da = Number(a.dia_mes) || 32;
        const db = Number(b.dia_mes) || 32;
        return da - db || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
      })
      .map(({ dia_mes: _d, ...rest }) => rest);

    return NextResponse.json({ ok: true, aniversariantes: resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
