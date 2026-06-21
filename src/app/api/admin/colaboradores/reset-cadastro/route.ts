import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';
import { payloadResetPrimeiroAcesso } from '@/lib/onboarding-reabrir';
import { AUDIT_ACOES, registrarAuditoria } from '@/lib/audit-log';

/** Zera senha, onboarding e perfil pessoal — fluxo de primeiro acesso. Admin, RH e sócios. */
export async function POST(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID obrigatório' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const payload = payloadResetPrimeiroAcesso();

    let { error } = await supabase.from('colaboradores').update(payload).eq('id', id);

    if (error && String(error.message).toLowerCase().includes('forca_troca_senha')) {
      const { forca_troca_senha: _f, ...semForca } = payload;
      ({ error } = await supabase.from('colaboradores').update(semForca).eq('id', id));
    }

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    await registrarAuditoria(supabase, {
      acao: AUDIT_ACOES.COLAB_RESET_CADASTRO,
      alvoTipo: 'colaborador',
      alvoId: id,
      req,
    });

    return NextResponse.json({
      ok: true,
      msg: 'Cadastro resetado. A pessoa refaz senha, perfil e onboarding no próximo login.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
