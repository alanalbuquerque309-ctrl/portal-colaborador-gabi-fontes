import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';

/**
 * Login do portal por CPF + senha — consulta no servidor (contorna RLS do Supabase).
 * Sem senha cadastrada: retorna needsPassword para o cliente abrir fluxo de primeira senha.
 */
export async function POST(req: Request) {
  let body: { cpf?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const cleanCpf = String(body.cpf ?? '')
    .replace(/\D/g, '')
    .trim()
    .padStart(11, '0');

  const senhaTrim = String(body.senha ?? '').trim();

  if (cleanCpf.length !== 11) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash')
      .eq('cpf', cleanCpf)
      .single();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'CPF não cadastrado. Entre em contato com o RH.' }, { status: 404 });
    }

    const senhaHash = (col as { senha_hash?: string | null }).senha_hash;

    if (!senhaHash) {
      return NextResponse.json({
        ok: true,
        needsPassword: true,
        cpf: cleanCpf,
      });
    }

    if (!senhaTrim) {
      return NextResponse.json({ ok: false, erro: 'Digite sua senha.' }, { status: 400 });
    }

    if (!verifyPassword(senhaTrim, senhaHash)) {
      return NextResponse.json({ ok: false, erro: 'Senha incorreta.' }, { status: 401 });
    }

    const payload = buildPortalLoginJson(
      {
        id: col.id,
        unidade_id: col.unidade_id,
        role: (col as { role?: string }).role,
        onboarding_completo: (col as { onboarding_completo?: boolean }).onboarding_completo,
      },
      cleanCpf
    );

    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
