import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEmail } from '@/lib/password';
import { normalizeTelefoneLogin, telefoneLoginValido } from '@/lib/telefone';
import {
  ipDaRequisicao,
  mensagemBloqueio,
  registrarTentativa,
  verificarRegras,
  type RateLimitRegra,
} from '@/lib/rate-limit';

type ColaboradorRecuperacao = {
  id: string;
  email: string | null;
  telefone: string | null;
  telefone_login?: string | null;
  nome?: string | null;
  unidade_id?: string | null;
};

// Mensagem única (anti-enumeração): não revela se telefone/e-mail existem no cadastro.
const MENSAGEM_GENERICA =
  'Se os dados conferirem com o cadastro, o RH vai redefinir sua senha e avisar você. Procure o RH se precisar de ajuda.';

// Recuperação é rara: janela longa e limite baixo para conter abuso/varredura.
const JANELA_MS = 60 * 60 * 1000; // 60 min
const MAX_POR_IP = 8;
const MAX_POR_TELEFONE = 5;

function isMissingTelefoneLoginColumn(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return msg.includes('telefone_login') && (msg.includes('does not exist') || msg.includes('schema cache'));
}

/**
 * Recuperação de senha endurecida (passo 4 de segurança).
 *
 * Não reseta mais a senha automaticamente (isso permitia takeover só com telefone+e-mail).
 * Em vez disso registra uma SOLICITAÇÃO que o RH/admin atende no painel. A resposta é sempre
 * genérica (anti-enumeração) e o endpoint é protegido por rate limit durável.
 */
export async function POST(req: Request) {
  let body: { telefone?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const telefoneLogin = normalizeTelefoneLogin(String(body.telefone ?? ''));
  const emailIn = normalizeEmail(String(body.email ?? ''));

  if (!telefoneLoginValido(telefoneLogin)) {
    return NextResponse.json(
      { ok: false, erro: 'Informe um celular válido com DDD (10 ou 11 dígitos).' },
      { status: 400 }
    );
  }
  if (!emailIn || !emailIn.includes('@')) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    // Sem service role não há como registrar/atender; resposta genérica para não vazar estado.
    return NextResponse.json({ ok: true, mensagem: MENSAGEM_GENERICA });
  }

  const ip = ipDaRequisicao(req);
  const regras: RateLimitRegra[] = [
    { escopo: 'recuperar_senha', tipoChave: 'ip', chave: ip, janelaMs: JANELA_MS, maxFalhas: MAX_POR_IP },
    {
      escopo: 'recuperar_senha',
      tipoChave: 'identidade',
      chave: telefoneLogin,
      janelaMs: JANELA_MS,
      maxFalhas: MAX_POR_TELEFONE,
    },
  ];

  const bloqueio = await verificarRegras(supabase, regras);
  if (bloqueio) {
    return NextResponse.json(
      { ok: false, erro: mensagemBloqueio(bloqueio.retryAposMs) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(bloqueio.retryAposMs / 1000)) } }
    );
  }

  // Cada pedido conta para o limite (sucesso=false): contém varredura mesmo sem acertar o cadastro.
  await registrarTentativa(supabase, { escopo: 'recuperar_senha', tipoChave: 'ip', chave: ip });
  await registrarTentativa(supabase, {
    escopo: 'recuperar_senha',
    tipoChave: 'identidade',
    chave: telefoneLogin,
  });

  try {
    let { data: candidatos, error } = await supabase
      .from('colaboradores')
      .select('id, email, telefone, telefone_login, nome, unidade_id')
      .ilike('email', emailIn)
      .limit(10);

    if (error && isMissingTelefoneLoginColumn(error.message)) {
      const retry = await supabase
        .from('colaboradores')
        .select('id, email, telefone, nome, unidade_id')
        .ilike('email', emailIn)
        .limit(10);
      candidatos = retry.data as typeof candidatos;
      error = retry.error;
    }

    // Falha de banco ou ausência de match: mesma resposta genérica (anti-enumeração).
    if (error) {
      return NextResponse.json({ ok: true, mensagem: MENSAGEM_GENERICA });
    }

    const col = ((candidatos ?? []) as ColaboradorRecuperacao[]).find((c) => {
      const emailCad = normalizeEmail(c.email ?? '');
      const telefoneCadastro = normalizeTelefoneLogin(c.telefone ?? '');
      const telefoneLoginCadastro = normalizeTelefoneLogin(c.telefone_login ?? '');
      return (
        emailCad === emailIn &&
        (telefoneCadastro === telefoneLogin || telefoneLoginCadastro === telefoneLogin)
      );
    });

    if (col) {
      // Registra a solicitação na fila do RH. O índice único parcial garante no máximo uma
      // pendente por colaborador; um conflito (23505) significa que já há pedido aberto — ok.
      const insert = await supabase.from('solicitacoes_redefinicao_senha').insert({
        colaborador_id: col.id,
        unidade_id: col.unidade_id ?? null,
        nome_snapshot: col.nome ?? null,
        telefone_informado: telefoneLogin,
        email_informado: emailIn,
        status: 'pendente',
      });
      // Ignora erro de duplicidade (já existe pendente) e erro de tabela ausente (migration não
      // aplicada): a resposta segue genérica para não revelar nada ao cliente.
      void insert.error;
    }

    return NextResponse.json({ ok: true, mensagem: MENSAGEM_GENERICA });
  } catch {
    return NextResponse.json({ ok: true, mensagem: MENSAGEM_GENERICA });
  }
}
