import type { SupabaseClient } from '@supabase/supabase-js';
import { GRAOS_MISSAO } from '@/lib/graos/constants';
import { creditarMissaoGraos, processarElegibilidadeSemanaGraos } from '@/lib/graos/movimentos';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import type { AdminViewerContext } from '@/lib/admin-auth';

/** Só sócio, admin (Daniel) ou sessão admin por senha. */
export function podeDestacarSugestaoGraos(ctx: AdminViewerContext | null): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerBonificacaoInterna(ctx.role);
}

export function refKeySugestaoDestaqueGraos(colaboradorId: string, sugestaoId: string): string {
  return `${colaboradorId}:sugestao_destaque:${sugestaoId}`;
}

/** Marca destaque e credita +7 Grãos (pendentes até elegibilidade da semana). */
export async function aplicarDestaqueSugestaoGraos(
  supabase: SupabaseClient,
  opts: {
    sugestaoId: string;
    colaboradorId: string;
    semanaInicio: string;
    destacadoPorId: string | null;
  }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const refKey = refKeySugestaoDestaqueGraos(opts.colaboradorId, opts.sugestaoId);
  const cred = await creditarMissaoGraos(supabase, {
    colaboradorId: opts.colaboradorId,
    semanaInicio: opts.semanaInicio,
    missao: 'sugestao_destaque',
    graos: GRAOS_MISSAO.sugestao_destaque_bonus,
    refKey,
    descricao: 'Sugestão destacada — gostamos, vamos analisar',
    meta: { sugestao_id: opts.sugestaoId },
  });

  if (!cred.ok) return cred;

  const { error: errUp } = await supabase
    .from('sugestoes_reclamacoes')
    .update({
      graos_destaque_em: new Date().toISOString(),
      graos_destaque_por: opts.destacadoPorId,
      visualizado_em: new Date().toISOString(),
    })
    .eq('id', opts.sugestaoId)
    .is('graos_destaque_em', null);

  if (errUp) return { ok: false, erro: errUp.message };

  await processarElegibilidadeSemanaGraos(supabase, opts.colaboradorId, opts.semanaInicio);
  return { ok: true };
}

export function semanaInicioDeCreatedAt(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return segundaSemanaSaoPaulo();
  return segundaSemanaSaoPaulo(d);
}
