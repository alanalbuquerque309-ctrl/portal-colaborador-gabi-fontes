import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Rate limit durável em Postgres (tabela rate_limit_tentativas), via service_role.
 *
 * Sem Vercel KV/Redis e em ambiente serverless, o estado em memória não sobrevive entre
 * instâncias/cold starts — por isso a contagem fica no banco. Conta apenas tentativas com
 * falha dentro da janela; um sucesso limpa o contador da chave.
 *
 * Princípio: FAIL-OPEN. Se a tabela ainda não existir (migration 050 não aplicada) ou o banco
 * falhar, nunca bloqueia o usuário legítimo — o rate limit é defesa adicional, não o gate.
 */

export type RateLimitEscopo = 'login' | 'recuperar_senha';
export type RateLimitTipoChave = 'identidade' | 'ip';

export type RateLimitRegra = {
  escopo: RateLimitEscopo;
  tipoChave: RateLimitTipoChave;
  chave: string;
  /** Janela de observação em milissegundos. */
  janelaMs: number;
  /** Máximo de falhas dentro da janela antes de bloquear. */
  maxFalhas: number;
};

export type RateLimitResultado = {
  bloqueado: boolean;
  falhas: number;
  /** Quanto falta (ms) para liberar, quando bloqueado. */
  retryAposMs: number;
};

const TABELA = 'rate_limit_tentativas';

/** Extrai o IP do cliente a partir dos headers de proxy (Vercel/edge). */
export function ipDaRequisicao(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'desconhecido';
}

/** Normaliza a chave (caixa baixa, sem espaços nas pontas) para contagem consistente. */
function normalizarChave(chave: string): string {
  return chave.trim().toLowerCase();
}

/**
 * Verifica se a chave está bloqueada (falhas >= maxFalhas dentro da janela).
 * Não registra nada; apenas consulta. Fail-open em qualquer erro.
 */
export async function verificarRateLimit(
  supabase: SupabaseClient,
  regra: RateLimitRegra
): Promise<RateLimitResultado> {
  const chave = normalizarChave(regra.chave);
  if (!chave) return { bloqueado: false, falhas: 0, retryAposMs: 0 };

  const desde = new Date(Date.now() - regra.janelaMs).toISOString();
  try {
    const { data, error } = await supabase
      .from(TABELA)
      .select('criado_em')
      .eq('escopo', regra.escopo)
      .eq('tipo_chave', regra.tipoChave)
      .eq('chave', chave)
      .eq('sucesso', false)
      .gte('criado_em', desde)
      .order('criado_em', { ascending: true });

    if (error) return { bloqueado: false, falhas: 0, retryAposMs: 0 };

    const falhas = data?.length ?? 0;
    if (falhas < regra.maxFalhas) {
      return { bloqueado: false, falhas, retryAposMs: 0 };
    }

    const maisAntiga = data?.[0]?.criado_em ? new Date(data[0].criado_em as string).getTime() : Date.now();
    const liberaEm = maisAntiga + regra.janelaMs;
    const retryAposMs = Math.max(0, liberaEm - Date.now());
    return { bloqueado: retryAposMs > 0, falhas, retryAposMs };
  } catch {
    return { bloqueado: false, falhas: 0, retryAposMs: 0 };
  }
}

/** Registra uma tentativa (falha por padrão). Fail-open em erro. */
export async function registrarTentativa(
  supabase: SupabaseClient,
  regra: Pick<RateLimitRegra, 'escopo' | 'tipoChave' | 'chave'>,
  sucesso = false
): Promise<void> {
  const chave = normalizarChave(regra.chave);
  if (!chave) return;
  try {
    await supabase.from(TABELA).insert({
      escopo: regra.escopo,
      tipo_chave: regra.tipoChave,
      chave,
      sucesso,
    });
    // Poda oportunista (~2% das gravações): sem cron, a tabela cresceria para sempre.
    if (Math.random() < 0.02) {
      await podarTentativasAntigas(supabase);
    }
  } catch {
    /* fail-open: rate limit é defesa adicional, não pode derrubar o fluxo */
  }
}

/** Limpa as falhas de uma chave (chamar após sucesso para resetar o contador). */
export async function limparTentativas(
  supabase: SupabaseClient,
  regra: Pick<RateLimitRegra, 'escopo' | 'tipoChave' | 'chave'>
): Promise<void> {
  const chave = normalizarChave(regra.chave);
  if (!chave) return;
  try {
    await supabase
      .from(TABELA)
      .delete()
      .eq('escopo', regra.escopo)
      .eq('tipo_chave', regra.tipoChave)
      .eq('chave', chave);
  } catch {
    /* fail-open */
  }
}

/** Remove tentativas antigas (limpeza oportunista; chamada melhor-esforço). */
export async function podarTentativasAntigas(
  supabase: SupabaseClient,
  maxIdadeMs = 24 * 60 * 60 * 1000
): Promise<void> {
  const limite = new Date(Date.now() - maxIdadeMs).toISOString();
  try {
    await supabase.from(TABELA).delete().lt('criado_em', limite);
  } catch {
    /* fail-open */
  }
}

/**
 * Verifica um conjunto de regras (ex.: por identidade e por IP) e devolve a primeira que estiver
 * bloqueada. Use antes de validar a senha.
 */
export async function verificarRegras(
  supabase: SupabaseClient,
  regras: RateLimitRegra[]
): Promise<RateLimitResultado | null> {
  for (const regra of regras) {
    const r = await verificarRateLimit(supabase, regra);
    if (r.bloqueado) return r;
  }
  return null;
}

/** Mensagem padrão de bloqueio (não vaza qual chave estourou). */
export function mensagemBloqueio(retryAposMs: number): string {
  const minutos = Math.max(1, Math.ceil(retryAposMs / 60000));
  return `Muitas tentativas. Aguarde cerca de ${minutos} minuto${minutos === 1 ? '' : 's'} e tente novamente.`;
}
