import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalGerenteSession } from '@/lib/portal-gerente-session';
import { requirePortalRhVisitaSession } from '@/lib/portal-rh-visita-session';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import { listarRedeParaVisitaRh } from '@/lib/avaliacao-rh-visita';
import { normalizePortalRole } from '@/lib/roles';

/** Líder ou visita RH marca colaborador como apto na função (sem menção a gorjeta na UI). */
export async function POST(req: Request) {
  let body: { colaborador_id?: string; apto?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const alvoId = String(body.colaborador_id ?? '').trim();
  const apto = body.apto !== false;

  if (!alvoId) {
    return NextResponse.json({ ok: false, erro: 'colaborador_id obrigatório' }, { status: 400 });
  }

  const authGerente = await requirePortalGerenteSession();
  if (authGerente.ok) {
    return await marcarApto(authGerente.ctx.colaboradorId, authGerente.ctx.unidadeId, alvoId, apto, 'gerente');
  }

  const authRh = await requirePortalRhVisitaSession();
  if (!authRh.ok) return authRh.response;

  return await marcarApto(authRh.ctx.colaboradorId, null, alvoId, apto, 'rh');
}

async function marcarApto(
  colaboradorId: string,
  unidadeId: string | null,
  alvoId: string,
  apto: boolean,
  modo: 'gerente' | 'rh'
) {
  try {
    const supabase = createAdminClient();

    if (modo === 'gerente') {
      if (!unidadeId) {
        return NextResponse.json({ ok: false, erro: 'Unidade do gerente não encontrada.' }, { status: 403 });
      }
      const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, colaboradorId, unidadeId);
      if (!equipe.some((m) => m.id === alvoId)) {
        return NextResponse.json(
          { ok: false, erro: 'Colaborador fora da sua equipe para avaliação.' },
          { status: 403 }
        );
      }
    } else {
      const rede = await listarRedeParaVisitaRh(supabase, colaboradorId);
      const alvo = rede.find((m) => m.id === alvoId);
      if (!alvo || normalizePortalRole(alvo.role) !== 'colaborador') {
        return NextResponse.json(
          { ok: false, erro: 'Aptidão na função só para colaboradores da rede (visita RH).' },
          { status: 403 }
        );
      }
    }

    const payload = apto
      ? {
          operacao_apto: true,
          operacao_apto_em: new Date().toISOString(),
          operacao_apto_por: colaboradorId,
          updated_at: new Date().toISOString(),
        }
      : {
          operacao_apto: false,
          operacao_apto_em: null,
          operacao_apto_por: null,
          updated_at: new Date().toISOString(),
        };

    const { error } = await supabase.from('colaboradores').update(payload).eq('id', alvoId);

    if (error) {
      if (/operacao_apto/i.test(error.message)) {
        return NextResponse.json(
          {
            ok: false,
            erro: 'Campo operacao_apto ausente no banco. Aplique a migration 035_operacao_apto.sql.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, operacao_apto: apto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
