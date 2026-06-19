import type { SupabaseClient } from '@supabase/supabase-js';
import { creditarMissaoGraos, processarElegibilidadeSemanaGraos } from '@/lib/graos/movimentos';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import type { AdminViewerContext } from '@/lib/admin-auth';
import {
  graosRespostaSugestaoValidos,
  opcaoRespostaSugestao,
  type GraosRespostaSugestao,
} from '@/lib/sugestao-resposta-graos';

/** Só sócio, admin (Daniel) ou sessão admin por senha. */
export function podeDestacarSugestaoGraos(ctx: AdminViewerContext | null): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerBonificacaoInterna(ctx.role);
}

export function refKeySugestaoDestaqueGraos(colaboradorId: string, sugestaoId: string): string {
  return `${colaboradorId}:sugestao_destaque:${sugestaoId}`;
}

/** Responde sugestão e credita bônus 0, 3, 5 ou 9 Grãos (além do 1 do envio). */
export async function aplicarRespostaSugestaoGraos(
  supabase: SupabaseClient,
  opts: {
    sugestaoId: string;
    colaboradorId: string;
    semanaInicio: string;
    graos: GraosRespostaSugestao;
    respondidoPorId: string | null;
  }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const op = opcaoRespostaSugestao(opts.graos);
  if (!op) return { ok: false, erro: 'Quantidade de Grãos inválida.' };

  if (opts.graos > 0) {
    const refKey = refKeySugestaoDestaqueGraos(opts.colaboradorId, opts.sugestaoId);
    const cred = await creditarMissaoGraos(supabase, {
      colaboradorId: opts.colaboradorId,
      semanaInicio: opts.semanaInicio,
      missao: 'sugestao_destaque',
      graos: opts.graos,
      refKey,
      descricao: `Resposta à sugestão — ${op.labelAdmin}`,
      meta: { sugestao_id: opts.sugestaoId, graos_resposta: opts.graos },
    });

    if (!cred.ok) return cred;
  }

  const now = new Date().toISOString();
  const payloads: Record<string, unknown>[] = [
    {
      graos_destaque_em: now,
      graos_destaque_por: opts.respondidoPorId,
      graos_resposta_bonus: opts.graos,
      visualizado_em: now,
    },
    {
      graos_destaque_em: now,
      graos_destaque_por: opts.respondidoPorId,
      graos_resposta_bonus: opts.graos,
    },
    {
      graos_destaque_em: now,
      graos_destaque_por: opts.respondidoPorId,
      visualizado_em: now,
    },
    {
      graos_destaque_em: now,
      graos_destaque_por: opts.respondidoPorId,
    },
  ];

  let errUp: { message: string } | null = null;
  for (const payload of payloads) {
    const { error } = await supabase
      .from('sugestoes_reclamacoes')
      .update(payload)
      .eq('id', opts.sugestaoId)
      .is('graos_destaque_em', null);
    if (!error) {
      errUp = null;
      break;
    }
    errUp = error;
    if (!/graos_resposta|graos_destaque|visualizado_em|does not exist|schema cache/i.test(error.message)) {
      break;
    }
  }

  if (errUp) return { ok: false, erro: errUp.message };

  if (opts.graos > 0) {
    await processarElegibilidadeSemanaGraos(supabase, opts.colaboradorId, opts.semanaInicio);
  }

  return { ok: true };
}

/** @deprecated Use aplicarRespostaSugestaoGraos com graos: 9 */
export async function aplicarDestaqueSugestaoGraos(
  supabase: SupabaseClient,
  opts: {
    sugestaoId: string;
    colaboradorId: string;
    semanaInicio: string;
    destacadoPorId: string | null;
  }
) {
  return aplicarRespostaSugestaoGraos(supabase, {
    ...opts,
    graos: 9,
    respondidoPorId: opts.destacadoPorId,
  });
}

export function semanaInicioDeCreatedAt(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return segundaSemanaSaoPaulo();
  return segundaSemanaSaoPaulo(d);
}

export { graosRespostaSugestaoValidos };
