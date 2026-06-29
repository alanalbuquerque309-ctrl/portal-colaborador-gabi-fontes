'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import { AdminStatCard } from '@/components/admin/shell/AdminStatCard';
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableTd,
  AdminTableTh,
} from '@/components/admin/shell/AdminTable';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { gruposCafeConectaComSorteio } from '@/lib/cafe-conecta/config';
import { getTermo } from '@/lib/tenant/terminology';

type Colaborador = { id: string; nome: string; onboarding_completo: boolean };
type Aviso = { id: string; titulo: string; ativo?: boolean };
type PendenciaItem = {
  colaborador_nome: string;
  unidade_nome: string | null;
  responsavel_lider_label: string;
  tipo: string;
};
type PendenciasResumo = {
  ok?: boolean;
  total?: number;
  intervalo?: string;
  meta?: { alerta_critico_sexta?: boolean };
  resumo?: { criticos_sem_avaliacao?: number };
  itens?: PendenciaItem[];
};

export function AdminDashboardCockpit() {
  const termoCafeConecta = getTermo('cafe_conecta');
  const [loading, setLoading] = useState(true);
  const [acessoRh, setAcessoRh] = useState(false);
  const [gestaoCompleta, setGestaoCompleta] = useState(false);
  const [podeGerirSugestoes, setPodeGerirSugestoes] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [pendencias, setPendencias] = useState<PendenciasResumo | null>(null);
  const [sugestoesPendentes, setSugestoesPendentes] = useState(0);
  const [alertasEmocional, setAlertasEmocional] = useState(0);
  const [redefinicoesPendentes, setRedefinicoesPendentes] = useState(0);
  const [alertaCafeConecta, setAlertaCafeConecta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => {
    let cancel = false;

    const run = async () => {
      setLoading(true);
      setErro(null);

      try {
        const authRes = await fetch('/api/admin/auth', { credentials: 'include', cache: 'no-store' });
        const auth = (await authRes.json()) as {
          ok?: boolean;
          acesso_limitado_rh?: boolean;
          podeVerGorjeta?: boolean;
          podeVerBonificacao?: boolean;
          podeGerirSugestoes?: boolean;
        };

        if (cancel) return;
        const rh = auth.acesso_limitado_rh === true;
        const full = auth.podeVerGorjeta === true || auth.podeVerBonificacao === true;
        const gerirSug = auth.podeGerirSugestoes === true;
        setAcessoRh(rh);
        setGestaoCompleta(full && !rh);
        setPodeGerirSugestoes(gerirSug);

        const tarefas: Promise<void>[] = [
          fetch('/api/admin/colaboradores', { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .then((cols) => {
              if (cancel || !cols.ok) {
                if (!cols.ok) setErro(String(cols.erro ?? 'Erro ao carregar colaboradores.'));
                return;
              }
              setColaboradores(
                (cols.colaboradores ?? []).map((c: Colaborador) => ({
                  id: c.id,
                  nome: c.nome,
                  onboarding_completo: c.onboarding_completo === true,
                }))
              );
            }),
          fetch('/api/admin/avisos', { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .then((avs) => {
              if (cancel || !avs.ok) return;
              setAvisos(
                (avs.avisos ?? []).filter((a: Aviso) => a.ativo !== false).slice(0, 8)
              );
            }),
          fetch('/api/portal/emocional-alertas', { credentials: 'include', cache: 'no-store' })
            .then((r) => (r.status === 403 ? null : r.json()))
            .then((emo) => {
              if (cancel || !emo?.ok) return;
              setAlertasEmocional(Array.isArray(emo.alertas) ? emo.alertas.length : 0);
            }),
          fetch('/api/admin/redefinicoes-senha', { credentials: 'include', cache: 'no-store' })
            .then((r) => (r.status === 401 || r.status === 403 ? null : r.json()))
            .then((red) => {
              if (cancel || !red?.ok) return;
              setRedefinicoesPendentes(Array.isArray(red.solicitacoes) ? red.solicitacoes.length : 0);
            })
            .catch(() => {}),
          Promise.all(
            gruposCafeConectaComSorteio().map((g) =>
              fetch(`/api/admin/cafe-conecta?grupo=${encodeURIComponent(g.slug)}`, {
                credentials: 'include',
                cache: 'no-store',
              })
                .then((r) => (r.status === 401 || r.status === 403 ? null : r.json()))
                .then((cc) => cc?.alerta_quinta === true)
            )
          )
            .then((flags) => {
              if (cancel) return;
              setAlertaCafeConecta(flags.some(Boolean));
            })
            .catch(() => {}),
        ];

        if (gerirSug) {
          tarefas.push(
            fetch('/api/admin/sugestoes/pendentes', { credentials: 'include', cache: 'no-store' })
              .then((r) => r.json())
              .then((sug) => {
                if (cancel || !sug.ok) return;
                setSugestoesPendentes(Math.max(0, Number(sug.pendentes ?? 0)));
              })
          );
        }

        if (full && !rh) {
          tarefas.push(
            fetch('/api/admin/avaliacoes-pendentes', { credentials: 'include', cache: 'no-store' })
              .then((r) => r.json())
              .then((pend) => {
                if (cancel) return;
                if (pend.ok) setPendencias(pend as PendenciasResumo);
              })
          );
        }

        await Promise.all(tarefas);
      } catch {
        if (!cancel) setErro('Erro de conexão ao carregar o dashboard.');
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    void run();
    return () => {
      cancel = true;
    };
  }, []);

  const ativos = colaboradores.filter((c) => c.onboarding_completo);
  const pendentesOnboarding = colaboradores.filter((c) => !c.onboarding_completo);
  const totalPendencias = pendencias?.itens?.length ?? pendencias?.total ?? 0;
  const alertaSexta = pendencias?.meta?.alerta_critico_sexta === true;
  const previewPendencias = (pendencias?.itens ?? []).slice(0, 5);

  const tomPendencias = useMemo(() => {
    if (alertaSexta) return 'vermelho' as const;
    if (totalPendencias > 0) return 'ambar' as const;
    return 'verde' as const;
  }, [alertaSexta, totalPendencias]);

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <XicaraCarregando size="lg" label="Carregando dashboard…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Visão do dia — o que precisa da gestão agora."
        actions={
          <Link
            href="/admin/colaboradores/novo"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-dourado-base px-4 py-2 text-sm font-semibold text-cream-100 hover:bg-dourado-400"
          >
            + Colaborador
          </Link>
        }
      />

      {erro && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          {erro}
        </div>
      )}

      {alertaCafeConecta && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>☕ {termoCafeConecta} ainda não sorteado/publicado nesta quarta.</span>
          <Link
            href="/admin/cafe-conecta"
            className="inline-flex min-h-[40px] items-center rounded-lg bg-dourado-base px-3 py-1.5 text-sm font-semibold text-cream-100 hover:bg-dourado-400"
          >
            Abrir {termoCafeConecta}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <AdminStatCard
          emoji="📈"
          label="Saúde da equipe"
          valor="—"
          sub="Abrir painel →"
          tom="neutro"
          href="/admin/evolucao"
        />

        <AdminStatCard
          emoji="⭐"
          label="Nota dos líderes"
          valor="—"
          sub="Ver ranking →"
          tom="dourado"
          href="/admin/evolucao?aba=lideranca"
        />

        {gestaoCompleta ? (
          <AdminStatCard
            emoji="📋"
            label="Pendências da semana"
            valor={totalPendencias}
            sub={pendencias?.intervalo ?? 'Semana operacional'}
            tom={tomPendencias}
            href="/admin/pendencias-semana"
          />
        ) : (
          <AdminStatCard
            emoji="👥"
            label="Colaboradores"
            valor={colaboradores.length}
            sub={`${ativos.length} ativos`}
            tom="neutro"
            href="/admin/colaboradores"
          />
        )}

        {podeGerirSugestoes ? (
          <AdminStatCard
            emoji="💡"
            label="Sugestões"
            valor={sugestoesPendentes}
            sub={sugestoesPendentes > 0 ? 'Aguardando análise' : 'Tudo lido'}
            tom={sugestoesPendentes > 0 ? 'dourado' : 'verde'}
            href="/admin/sugestoes"
          />
        ) : (
          <AdminStatCard
            emoji="📢"
            label="Avisos ativos"
            valor={avisos.length}
            sub="Comunicados no portal"
            tom="neutro"
            href="/admin/avisos"
          />
        )}

        <AdminStatCard
          emoji="📝"
          label="Onboarding"
          valor={pendentesOnboarding.length}
          sub={pendentesOnboarding.length > 0 ? 'Cadastro incompleto' : 'Todos ativos'}
          tom={pendentesOnboarding.length > 0 ? 'ambar' : 'verde'}
          href="/admin/colaboradores"
        />

        <AdminStatCard
          emoji="🌡"
          label="Termômetro"
          valor={alertasEmocional}
          sub={alertasEmocional > 0 ? 'Alertas hoje' : 'Sem alertas'}
          tom={alertasEmocional > 0 ? 'vermelho' : 'verde'}
          href="/admin/termometro-emocoes"
        />

        <AdminStatCard
          emoji="🔑"
          label="Redefinições"
          valor={redefinicoesPendentes}
          sub={redefinicoesPendentes > 0 ? 'Pedidos de senha' : 'Nada pendente'}
          tom={redefinicoesPendentes > 0 ? 'dourado' : 'verde'}
          href="/admin/redefinicoes-senha"
        />
      </div>

      {gestaoCompleta && totalPendencias > 0 && (
        <Link
          href={alertaSexta ? '/admin/pendencias-semana?filtro=critico_sexta' : '/admin/pendencias-semana'}
          className="block rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            {alertaSexta ? 'Urgente — sexta-feira' : 'Faça agora'}
          </p>
          <p className="text-lg font-display font-semibold text-coffee-base mt-1">
            {alertaSexta
              ? `${pendencias?.resumo?.criticos_sem_avaliacao ?? totalPendencias} crítico(s) sem avaliação na semana`
              : `${totalPendencias} avaliação${totalPendencias === 1 ? '' : 'ões'} pendente${totalPendencias === 1 ? '' : 's'} na rede`}
          </p>
          <p className="text-sm text-cafeteria-600 mt-1">
            {pendencias?.intervalo} — abrir painel de pendências →
          </p>
        </Link>
      )}

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {gestaoCompleta && (
          <AdminSection
            title="Pendências recentes"
            description={pendencias?.intervalo ?? 'Semana em avaliação'}
            action={
              <Link href="/admin/pendencias-semana" className="text-sm font-medium text-dourado-base hover:underline">
                Ver todas
              </Link>
            }
          >
            {previewPendencias.length === 0 ? (
              <p className="text-sm text-emerald-800 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
                Sem pendências na semana — equipe em dia.
              </p>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <AdminTableTh>Colaborador</AdminTableTh>
                  <AdminTableTh className="hidden sm:table-cell">Unidade</AdminTableTh>
                  <AdminTableTh>Líder</AdminTableTh>
                </AdminTableHead>
                <AdminTableBody>
                  {previewPendencias.map((p, i) => (
                    <AdminTableRow key={`${p.colaborador_nome}-${i}`}>
                      <AdminTableTd className="font-medium">{p.colaborador_nome}</AdminTableTd>
                      <AdminTableTd className="hidden sm:table-cell text-cafeteria-600">
                        {p.unidade_nome ?? '—'}
                      </AdminTableTd>
                      <AdminTableTd className="text-cafeteria-600 text-xs sm:text-sm">
                        {p.responsavel_lider_label}
                      </AdminTableTd>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminSection>
        )}

        <AdminSection
          title="Avisos ativos"
          action={
            <Link href="/admin/avisos/novo" className="text-sm font-medium text-dourado-base hover:underline">
              + Novo aviso
            </Link>
          }
        >
          {avisos.length === 0 ? (
            <p className="text-sm text-cafeteria-600">Nenhum aviso ativo no momento.</p>
          ) : (
            <ul className="space-y-2">
              {avisos.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/avisos/${a.id}/editar`}
                    className="block rounded-lg border border-cafeteria-100 px-3 py-2 text-sm text-cafeteria-900 hover:border-dourado-200 hover:bg-cream-50"
                  >
                    {a.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {avisos.length > 5 && (
            <Link href="/admin/avisos" className="inline-block mt-3 text-sm text-dourado-base hover:underline">
              Ver todos ({avisos.length})
            </Link>
          )}
        </AdminSection>

        <AdminSection
          title="Cadastros pendentes"
          description="Colaboradores que ainda não concluíram o onboarding"
          className={gestaoCompleta ? 'lg:col-span-2' : ''}
          action={
            <Link href="/admin/colaboradores" className="text-sm font-medium text-dourado-base hover:underline">
              Gerenciar
            </Link>
          }
        >
          {pendentesOnboarding.length === 0 ? (
            <p className="text-sm text-emerald-800">Todos os cadastros estão ativos no portal.</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2">
              {pendentesOnboarding.slice(0, 6).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden />
                  <span className="text-coffee-base truncate">{c.nome}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection title="Link para convite" description="Envie pelo WhatsApp para novos colaboradores entrarem no portal.">
        <div className="flex flex-col sm:flex-row gap-2">
          <code className="flex-1 truncate rounded-xl bg-cream-100 border border-cafeteria-200 px-3 py-2.5 text-sm text-coffee-base">
            {loginUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(loginUrl).then(() => {
                setLinkCopiado(true);
                setTimeout(() => setLinkCopiado(false), 2000);
              });
            }}
            className="rounded-xl bg-dourado-base px-4 py-2.5 text-sm font-semibold text-cream-100 hover:bg-dourado-400 whitespace-nowrap min-h-[44px]"
          >
            {linkCopiado ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      </AdminSection>

      {acessoRh && (
        <p className="text-xs text-cafeteria-500 text-center pb-2">
          Acesso RH — menu limitado às funções operacionais.
        </p>
      )}
    </div>
  );
}
