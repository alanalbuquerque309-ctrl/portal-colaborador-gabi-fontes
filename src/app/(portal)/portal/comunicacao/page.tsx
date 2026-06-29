'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanalAjudaPainel, NOME_ATENDIMENTO_AJUDA } from '@/components/ajuda/CanalAjudaPainel';
import { getPortalSession } from '@/lib/utils/session';
import { canVisualizarAjuda, normalizePortalRole } from '@/lib/roles';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import { AJUDA_CHAT_ATUALIZADO, emitAjudaChatAtualizado } from '@/lib/ajuda-chat-events';
import { SUGESTOES_ATUALIZADO } from '@/lib/sugestoes-events';
import { IlustracaoMegafone } from '@/components/portal/vivo/PortalIlustracao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';
import { PortalPageHeader } from '@/components/portal/shell/PortalPageHeader';
import { PortalSection } from '@/components/portal/shell/PortalSection';
import { PortalActionCard } from '@/components/portal/shell/PortalActionCard';
import { getTermoCurto } from '@/lib/tenant/terminology';

const IconBalao = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
    />
  </svg>
);

const IconClipboard = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const IconInbox = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
);

export default function ComunicacaoPage() {
  const graosCurto = getTermoCurto('reconhecimento');
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
      <PortalPageHeader
        title="Comunicação"
        description="Sugestões, reclamações e contato com ADM/RH em um só lugar."
        breadcrumb={[{ label: 'Portal', href: '/portal' }, { label: 'Comunicação' }]}
        illustration={<IlustracaoMegafone className="w-24 h-20 opacity-95" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PortalActionCard
          href="/portal/sugestoes"
          title="Sugestões, elogios e reclamações"
          description="Envie ideias, elogios ou registre uma reclamação. Apenas reclamações podem ser anônimas."
          cta="Abrir caixa →"
          icon={<IconBalao />}
          tom="dourado"
        />

        {podeGestaoSugestoes && (
          <PortalActionCard
            href="/admin/sugestoes"
            title="Analisar sugestões da equipe"
            description={`Ideias enviadas pelos colaboradores. Responda com bônus de 0, 3, 5 ou 9 ${graosCurto} (+1 no envio).`}
            cta="Abrir gestão →"
            icon={<IconClipboard />}
            tom="ambar"
            badge={
              sugestoesPendentes > 0 ? (
                <span className="ml-2 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-coffee-base">
                  {sugestoesPendentes} aguardando
                </span>
              ) : undefined
            }
          />
        )}

        {podeInboxAjuda && (
          <PortalActionCard
            href="/portal/ajuda-inbox"
            title="Inbox ajuda"
            description="Responder pedidos dos colaboradores (acesso só sócios e administração)."
            cta="Abrir inbox →"
            icon={<IconInbox />}
            tom="neutro"
            badge={
              pendenciasInbox > 0 ? (
                <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  {pendenciasInbox} pendente{pendenciasInbox === 1 ? '' : 's'}
                </span>
              ) : undefined
            }
          />
        )}
      </div>

      <PortalSection
        id="suporte"
        title="Falar com suporte (ADM/RH)"
        description={`Dúvidas operacionais, pedidos urgentes ou assuntos do dia a dia com ${NOME_ATENDIMENTO_AJUDA} e a administração.`}
      >
        <CanalAjudaPainel variant="embedded" onChatAtualizado={emitAjudaChatAtualizado} />
      </PortalSection>

      <PortalRodapeFrase variant="comunicacao" />
    </main>
  );
}
