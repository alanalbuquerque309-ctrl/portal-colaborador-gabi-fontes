import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { AUDIT_ACOES, registrarAuditoria } from '@/lib/audit-log';
import { normalizarSlugUnidadeOperacional } from '@/lib/constants/colaborador-org';
import { isMotivoSaida, type MotivoSaida } from '@/lib/rotatividade';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Desliga colaborador (hard delete) com motivo + snapshot no audit.
 * POST { id, motivo, motivo_outro? } — evita DELETE com body.
 */
export async function POST(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  let body: { id?: string; motivo?: string; motivo_outro?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  const motivoRaw = String(body.motivo ?? '').trim();
  if (!isMotivoSaida(motivoRaw)) {
    return NextResponse.json(
      { ok: false, erro: 'Informe o motivo: demissão, justa causa, pediu demissão ou outro.' },
      { status: 400 }
    );
  }
  const motivo: MotivoSaida = motivoRaw;
  const motivoOutro =
    motivo === 'outro' ? String(body.motivo_outro ?? '').trim().slice(0, 120) : null;
  if (motivo === 'outro' && (!motivoOutro || motivoOutro.length < 3)) {
    return NextResponse.json(
      { ok: false, erro: 'Em «Outro», descreva o motivo (mínimo 3 caracteres).' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: alvo, error: errAlvo } = await supabase
      .from('colaboradores')
      .select('id, nome, setor, unidade_id, data_admissao, role, unidades(slug)')
      .eq('id', id)
      .maybeSingle();

    if (errAlvo) {
      return NextResponse.json({ ok: false, erro: errAlvo.message }, { status: 500 });
    }
    if (!alvo) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const unidadeRaw = (alvo as { unidades?: unknown }).unidades;
    const unidadeObj = Array.isArray(unidadeRaw) ? unidadeRaw[0] : unidadeRaw;
    const slugRaw =
      unidadeObj && typeof unidadeObj === 'object' && 'slug' in unidadeObj
        ? String((unidadeObj as { slug?: string }).slug ?? '')
        : null;
    const unidadeSlug = normalizarSlugUnidadeOperacional(slugRaw);
    const adm = String((alvo as { data_admissao?: string | null }).data_admissao ?? '')
      .trim()
      .slice(0, 10);

    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    await registrarAuditoria(supabase, {
      acao: AUDIT_ACOES.COLAB_EXCLUIR,
      alvoTipo: 'colaborador',
      alvoId: id,
      unidadeId: (alvo as { unidade_id?: string | null }).unidade_id ?? null,
      detalhes: {
        motivo,
        motivo_outro: motivoOutro,
        nome: String((alvo as { nome?: string }).nome ?? '').trim() || null,
        setor: (alvo as { setor?: string | null }).setor
          ? String((alvo as { setor?: string | null }).setor).trim()
          : null,
        unidade_slug: unidadeSlug,
        data_admissao: /^\d{4}-\d{2}-\d{2}$/.test(adm) ? adm : null,
        role: (alvo as { role?: string | null }).role
          ? String((alvo as { role?: string | null }).role)
          : null,
      },
      req,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, erro: 'Erro ao excluir' }, { status: 500 });
  }
}

/** Legado: redireciona orientação — use POST com motivo. */
export async function DELETE() {
  return NextResponse.json(
    {
      ok: false,
      erro: 'Use POST /api/admin/colaboradores/excluir com { id, motivo, motivo_outro? }.',
    },
    { status: 405 }
  );
}
