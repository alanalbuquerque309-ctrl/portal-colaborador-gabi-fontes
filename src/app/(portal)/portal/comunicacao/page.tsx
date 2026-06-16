'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanalAjudaPainel, NOME_ATENDIMENTO_AJUDA } from '@/components/ajuda/CanalAjudaPainel';
import { getPortalSession } from '@/lib/utils/session';
import { canVisualizarAjuda, normalizePortalRole } from '@/lib/roles';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import { AJUDA_CHAT_ATUALIZADO, emitAjudaChatAtualizado } from '@/lib/ajuda-chat-events';
import { SUGESTOES_ATUALIZADO } from '@/lib/sugestoes-events';

export default function ComunicacaoPage() {
  const router = useRouter();
  const [podeInboxAjuda, setPodeInboxAjuda] = useState(false);
  const [pendenciasInbox, setPendenciasInbox] = useState(0);
  const [podeGestaoSugestoes, setPodeGestaoSugestoes] = useState(false);
  const [sugestoesPendentes, setSugestoesPendentes] = useState(0);

  useEffect(() => {
    const s = getPortalSession();
    if (!s?.colaboradorId || s.colaboradorId === 'pending') {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    let cancel = false;
    const carregarPendencias = () => {
      fetch(`/api/admin/ajuda-chat?somente_pendentes=1&_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((inbox: { ok?: boolean; itens?: unknown[] }) => {
          if (cancel || !inbox.ok) return;
          setPendenciasInbox(Array.isArray(inbox.itens) ? inbox.itens.length : 0);
        })
        .catch(() => {});
    };

    const carregarSugestoesPendentes = () => {
      fetch(`/api/admin/sugestoes/pendentes?_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((d: { ok?: boolean; pendentes?: number }) => {
          if (cancel || d.ok !== true) return;
          setSugestoesPendentes(Math.max(0, Number(d.pendentes ?? 0)));
        })
        .catch(() => {});
    };

    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; colaborador?: { id?: string; role?: string | null } }) => {
        if (cancel || !data.ok || !data.colaborador) return;
        const role = normalizePortalRole(data.colaborador.role);
        const cid = String(data.colaborador.id ?? '');
        const pode = canVisualizarAjuda(role, cid);
        setPodeInboxAjuda(pode);
        const gestaoSug = podeVerBonificacaoInterna(role);
        setPodeGestaoSugestoes(gestaoSug);
        if (pode) carregarPendencias();
        if (gestaoSug) carregarSugestoesPendentes();
      })
      .catch(() => {});

    window.addEventListener(AJUDA_CHAT_ATUALIZADO, carregarPendencias);
    window.addEventListener(SUGESTOES_ATUALIZADO, carregarSugestoesPendentes);
    return () => {
      cancel = true;
      window.removeEventListener(AJUDA_CHAT_ATUALIZADO, carregarPendencias);
      window.removeEventListener(SUGESTOES_ATUALIZADO, carregarSugestoesPendentes);
    };
  }, []);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-cafeteria-800">Comunicação</h1>
        <p className="text-sm text-coffee-100 mt-1">
          Sugestões, reclamações e contato com ADM/RH em um só lugar.
        </p>
      </div>

      <Link
        href="/portal/sugestoes"
        className="flex items-start gap-4 rounded-2xl border border-dourado-200 bg-gradient-to-br from-cream-50 to-white p-5 hover:border-dourado-base transition-colors min-h-[44px]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-dourado-base/15 text-dourado-base">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-coffee-base text-base">Sugestões e reclamações</span>
          <span className="block text-sm text-coffee-100 mt-1">
            Envie ideias para melhorar a operação ou registre uma reclamação. Pode ser anônimo.
          </span>
          <span className="inline-block mt-2 text-sm font-medium text-dourado-base">Abrir caixa →</span>
        </span>
      </Link>

      {podeGestaoSugestoes && (
        <Link
          href="/admin/sugestoes"
          className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 hover:border-amber-400 transition-colors min-h-[44px]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-950">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-coffee-base text-base">
              Analisar sugestões da equipe
              {sugestoesPendentes > 0 ? (
                <span className="ml-2 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-coffee-base">
                  {sugestoesPendentes} aguardando
                </span>
              ) : null}
            </span>
            <span className="block text-sm text-coffee-100 mt-1">
              Ideias enviadas pelos colaboradores. Marque como visto ou «Gostamos — vamos analisar» (+7 Grãos).
            </span>
            <span className="inline-block mt-2 text-sm font-medium text-dourado-base">Abrir gestão →</span>
          </span>
        </Link>
      )}

      {podeInboxAjuda && (
        <Link
          href="/portal/ajuda-inbox"
          className="flex items-start gap-4 rounded-2xl border border-cafeteria-200 bg-white p-5 hover:border-dourado-base transition-colors min-h-[44px]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cafeteria-100 text-cafeteria-800">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-coffee-base text-base">
              Inbox ajuda
              {pendenciasInbox > 0 ? (
                <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  {pendenciasInbox} pendente{pendenciasInbox === 1 ? '' : 's'}
                </span>
              ) : null}
            </span>
            <span className="block text-sm text-coffee-100 mt-1">
              Responder pedidos dos colaboradores (acesso só sócios e administração).
            </span>
            <span className="inline-block mt-2 text-sm font-medium text-dourado-base">Abrir inbox →</span>
          </span>
        </Link>
      )}

      <section id="suporte" aria-labelledby="suporte-titulo">
        <h2 id="suporte-titulo" className="text-lg font-display font-semibold text-coffee-base mb-3">
          Falar com suporte (ADM/RH)
        </h2>
        <p className="text-sm text-coffee-100 mb-3">
          Dúvidas operacionais, pedidos urgentes ou assuntos do dia a dia com {NOME_ATENDIMENTO_AJUDA} e a
          administração.
        </p>
        <CanalAjudaPainel variant="embedded" onChatAtualizado={emitAjudaChatAtualizado} />
      </section>
    </main>
  );
}
