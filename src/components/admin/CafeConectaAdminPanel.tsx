'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { CafeConectaDashboardPayload } from '@/lib/cafe-conecta/types';
import { CAFE_CONECTA_REACOES } from '@/lib/cafe-conecta/feedback';
import {
  CAFE_CONECTA_AVISO_VIRADA_SEMANA,
  CAFE_CONECTA_TEXTO_COMUNICADO_EQUIPE,
  descricaoMotivoInelegibilidadeCafeConecta,
  rotuloMotivoInelegibilidadeCafeConecta,
} from '@/lib/cafe-conecta/motivos';
import { getTermo } from '@/lib/tenant/terminology';

type GrupoTab = { slug: string; label: string; sorteio_liberado: boolean };

export function CafeConectaAdminPanel() {
  const termoCafeConecta = getTermo('cafe_conecta');
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<'sorteio' | 'publicar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [grupoSlug, setGrupoSlug] = useState('mesquita');
  const [grupos, setGrupos] = useState<GrupoTab[]>([]);
  const [data, setData] = useState<CafeConectaDashboardPayload | null>(null);
  const [migrationPendente, setMigrationPendente] = useState(false);

  const carregar = useCallback(async (grupo: string) => {
    setErro(null);
    setAviso(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cafe-conecta?grupo=${encodeURIComponent(grupo)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.code === 'tabelas_ausentes') {
        setMigrationPendente(true);
        setData(null);
        if (Array.isArray(json.grupos_disponiveis)) {
          setGrupos(json.grupos_disponiveis as GrupoTab[]);
        }
        return;
      }
      if (!json.ok) {
        setErro(String(json.erro ?? 'Erro ao carregar'));
        return;
      }
      setMigrationPendente(false);
      setData(json as CafeConectaDashboardPayload);
      if (Array.isArray(json.grupos_disponiveis)) {
        setGrupos(json.grupos_disponiveis as GrupoTab[]);
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar(grupoSlug);
  }, [carregar, grupoSlug]);

  const sorteio = data?.sorteio_atual ?? null;
  const isRascunho = sorteio?.status === 'rascunho';
  const isPublicado = sorteio?.status === 'publicado';
  const sorteioLiberado = data?.sorteio_liberado === true;

  const listaElegibilidade = data?.elegibilidade.lista ?? [];

  const feriasLista = useMemo(
    () => listaElegibilidade.filter((l) => l.motivo === 'ferias'),
    [listaElegibilidade]
  );
  const folgaLista = useMemo(
    () => listaElegibilidade.filter((l) => l.motivo === 'folga_quarta'),
    [listaElegibilidade]
  );
  const foraPlantaoLista = useMemo(
    () => listaElegibilidade.filter((l) => l.motivo === 'fora_plantao'),
    [listaElegibilidade]
  );
  const afastadosLista = useMemo(
    () => listaElegibilidade.filter((l) => l.motivo === 'afastado'),
    [listaElegibilidade]
  );
  const semAcessoLista = useMemo(
    () => listaElegibilidade.filter((l) => l.motivo === 'sem_acesso_portal'),
    [listaElegibilidade]
  );
  const outrosInelegiveis = useMemo(
    () =>
      listaElegibilidade.filter(
        (l) =>
          !l.elegivel &&
          l.motivo !== 'ferias' &&
          l.motivo !== 'folga_quarta' &&
          l.motivo !== 'fora_plantao' &&
          l.motivo !== 'afastado' &&
          l.motivo !== 'sem_acesso_portal'
      ),
    [listaElegibilidade]
  );

  const copiarComunicado = async () => {
    try {
      await navigator.clipboard.writeText(CAFE_CONECTA_TEXTO_COMUNICADO_EQUIPE);
      setAviso('Texto do comunicado copiado.');
    } catch {
      setAviso('Não foi possível copiar automaticamente. Selecione o texto abaixo.');
    }
  };

  const realizarSorteio = async () => {
    setAcao('sorteio');
    setErro(null);
    try {
      const res = await fetch('/api/admin/cafe-conecta/sorteio', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo: grupoSlug }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErro(String(json.erro ?? 'Não foi possível sortear.'));
        return;
      }
      if (json.dashboard?.ok) setData(json.dashboard);
      else await carregar(grupoSlug);
    } catch {
      setErro('Erro de conexão ao sortear.');
    } finally {
      setAcao(null);
    }
  };

  const publicar = async () => {
    setAcao('publicar');
    setErro(null);
    try {
      const res = await fetch('/api/admin/cafe-conecta/publicar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo: grupoSlug }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErro(String(json.erro ?? 'Não foi possível publicar.'));
        return;
      }
      if (json.dashboard?.ok) setData(json.dashboard);
      else await carregar(grupoSlug);
    } catch {
      setErro('Erro de conexão ao publicar.');
    } finally {
      setAcao(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <XicaraCarregando size="lg" label={`Carregando ${termoCafeConecta}…`} />
      </div>
    );
  }

  if (migrationPendente) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title={termoCafeConecta}
          description="Sorteio semanal de integração entre equipes."
        />
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">Migration pendente no Supabase</p>
          <p className="mt-2">
            Cole o SQL da migration <code className="text-xs bg-white/80 px-1 rounded">052_cafe_conecta.sql</code> no
            SQL Editor do Supabase (ou rode <code className="text-xs bg-white/80 px-1 rounded">npm run db:apply-052</code>{' '}
            com DATABASE_URL).
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        {erro ?? 'Não foi possível carregar.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.length > 1 && (
        <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-cream-100/80 border border-cafeteria-100">
          {grupos.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setGrupoSlug(g.slug)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                grupoSlug === g.slug
                  ? 'bg-white text-coffee-base shadow-sm border border-cafeteria-200'
                  : 'text-cafeteria-600 hover:text-coffee-base'
              }`}
            >
              {g.label}
              {!g.sorteio_liberado ? (
                <span className="ml-1.5 text-xs font-normal text-cafeteria-500">(prep.)</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <AdminPageHeader
        title={termoCafeConecta}
        description={`${data.grupo.label} · semana ${data.semana_inicio} · quarta ${data.data_referencia}`}
        actions={
          sorteioLiberado ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void realizarSorteio()}
                disabled={acao !== null || isPublicado}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-dourado-base px-4 py-2 text-sm font-semibold text-cream-100 hover:bg-dourado-400 disabled:opacity-50"
              >
                {acao === 'sorteio' ? 'Sorteando…' : isRascunho ? 'Sortear novamente' : 'Realizar sorteio'}
              </button>
              {isRascunho && (
                <button
                  type="button"
                  onClick={() => void publicar()}
                  disabled={acao !== null}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {acao === 'publicar' ? 'Publicando…' : 'Publicar sorteio'}
                </button>
              )}
            </div>
          ) : null
        }
      />

      {!sorteioLiberado && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">Unidade em preparação</p>
          <p className="mt-1">
            Você pode acompanhar elegíveis e a base operacional. O sorteio será liberado quando a loja estiver pronta
            para participar.
          </p>
        </div>
      )}

      {data.alerta_quinta && sorteioLiberado && !isPublicado && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          ☕ {termoCafeConecta} ainda não sorteado/publicado nesta quarta.
        </div>
      )}

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {erro}
        </div>
      )}

      {sorteio?.observacao_admin && (
        <p className="text-sm text-cafeteria-600 bg-cream-50 border border-cream-200 rounded-lg px-3 py-2">
          {sorteio.observacao_admin}
        </p>
      )}

      <div className="rounded-xl border border-cream-200 bg-cream-50/80 px-4 py-3 text-sm text-cafeteria-800 space-y-3">
        <p>{CAFE_CONECTA_AVISO_VIRADA_SEMANA}</p>
        <div className="rounded-lg border border-cafeteria-200 bg-white p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-coffee-base">Comunicado para a equipe</p>
            <button
              type="button"
              onClick={() => void copiarComunicado()}
              className="inline-flex min-h-[36px] items-center rounded-lg border border-cafeteria-200 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-coffee-base hover:bg-cream-100"
            >
              Copiar texto
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-cafeteria-700 font-sans">{CAFE_CONECTA_TEXTO_COMUNICADO_EQUIPE}</pre>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Colaboradores (base)" valor={data.elegibilidade.total_base} tom="neutro" />
        <AdminStatCard label="Elegíveis hoje" valor={data.elegibilidade.elegiveis} tom="verde" />
        <AdminStatCard
          label="Pool sorteio"
          valor={data.elegibilidade.pool_sorteio ?? data.elegibilidade.elegiveis}
          sub={
            data.elegibilidade.elegiveis < 2 && (data.elegibilidade.pool_sorteio ?? 0) > data.elegibilidade.elegiveis
              ? 'inclui sem login'
              : 'disponíveis agora'
          }
          tom="neutro"
        />
        <AdminStatCard label="Sem login semana" valor={data.elegibilidade.sem_acesso} tom="ambar" />
        <AdminStatCard
          label={`Ciclo ${data.ciclo?.numero ?? 1}`}
          valor={`${data.ciclo?.participaram ?? 0}/${data.ciclo?.total_base ?? 0}`}
          sub={`${data.ciclo?.pct ?? 0}% concluído`}
          tom="neutro"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Férias" valor={data.elegibilidade.ferias} tom="neutro" />
        <AdminStatCard label="Afastados" valor={data.elegibilidade.afastados} tom="neutro" />
        <AdminStatCard label="Folga quarta" valor={data.elegibilidade.folga} tom="neutro" />
        <AdminStatCard label="Fora plantão 12x36" valor={data.elegibilidade.fora_plantao ?? 0} tom="neutro" />
      </div>

      {sorteio && (
        <AdminSection title="Sorteio atual" description={isPublicado ? 'Publicado na home do portal.' : 'Rascunho — revise antes de publicar.'}>
          <div className="rounded-xl border border-dourado-200 bg-cream-50 p-5 space-y-3">
            <p className="text-xs uppercase tracking-wide text-cafeteria-500">
              Status: {isPublicado ? 'Publicado' : 'Rascunho'}
              {sorteio.publicado_por_nome ? ` · por ${sorteio.publicado_por_nome}` : ''}
            </p>
            <ul className="space-y-2">
              {(sorteio.participantes ?? []).map((p) => (
                <li key={p.ordem} className="text-lg font-display font-semibold text-coffee-base">
                  {p.nome}{' '}
                  <span className="text-sm font-normal text-cafeteria-600">({p.setor_label})</span>
                </li>
              ))}
            </ul>
          </div>
        </AdminSection>
      )}

      <AdminSection
        title="Elegíveis"
        description={`Com login no portal nesta semana (segunda a quarta). Se forem menos de 2, o sorteio admin inclui quem está ativo mas ainda não entrou (exceto férias, folga na quarta, fora do plantão 12x36 e afastados).`}
      >
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableTh>Nome</AdminTableTh>
              <AdminTableTh>Setor</AdminTableTh>
              <AdminTableTh>Unidade</AdminTableTh>
              <AdminTableTh>Status</AdminTableTh>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {data.elegibilidade.lista
              .filter((l) => l.elegivel)
              .slice(0, 40)
              .map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd>{l.setor ?? '—'}</AdminTableTd>
                  <AdminTableTd>{l.unidade_nome}</AdminTableTd>
                  <AdminTableTd className="text-emerald-700 font-medium">
                    Elegível · entrou no portal esta semana
                  </AdminTableTd>
                </AdminTableRow>
              ))}
          </AdminTableBody>
        </AdminTable>
        {data.elegibilidade.elegiveis > 40 && (
          <p className="text-xs text-cafeteria-500 mt-2">Mostrando 40 de {data.elegibilidade.elegiveis} elegíveis.</p>
        )}
      </AdminSection>

      {feriasLista.length > 0 && (
        <AdminSection
          title="De férias"
          description="Registrado de férias na avaliação desta semana (segunda-feira em diante)."
        >
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Nome</AdminTableTh>
                <AdminTableTh>Setor</AdminTableTh>
                <AdminTableTh>Unidade</AdminTableTh>
                <AdminTableTh>Motivo</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {feriasLista.map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd>{l.setor ?? '—'}</AdminTableTd>
                  <AdminTableTd>{l.unidade_nome}</AdminTableTd>
                  <AdminTableTd className="text-sm text-cafeteria-700">
                    {descricaoMotivoInelegibilidadeCafeConecta(l.motivo)}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminSection>
      )}

      {folgaLista.length > 0 && (
        <AdminSection title="Folga na quarta" description="Não entram no sorteio desta quarta.">
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Nome</AdminTableTh>
                <AdminTableTh>Setor</AdminTableTh>
                <AdminTableTh>Motivo</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {folgaLista.slice(0, 40).map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd>{l.setor ?? '—'}</AdminTableTd>
                  <AdminTableTd className="text-sm text-cafeteria-700">
                    {descricaoMotivoInelegibilidadeCafeConecta(l.motivo)}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
          {folgaLista.length > 40 && (
            <p className="text-xs text-cafeteria-500 mt-2">Mostrando 40 de {folgaLista.length}.</p>
          )}
        </AdminSection>
      )}

      {foraPlantaoLista.length > 0 && (
        <AdminSection
          title="Fora do plantão (12x36)"
          description="Escala 12x36 em outro turno nesta quarta — não entram no sorteio de hoje."
        >
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Nome</AdminTableTh>
                <AdminTableTh>Setor</AdminTableTh>
                <AdminTableTh>Motivo</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {foraPlantaoLista.slice(0, 40).map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd>{l.setor ?? '—'}</AdminTableTd>
                  <AdminTableTd className="text-sm text-cafeteria-700">
                    {descricaoMotivoInelegibilidadeCafeConecta(l.motivo)}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
          {foraPlantaoLista.length > 40 && (
            <p className="text-xs text-cafeteria-500 mt-2">Mostrando 40 de {foraPlantaoLista.length}.</p>
          )}
        </AdminSection>
      )}

      {semAcessoLista.length > 0 && (
        <AdminSection
          title="Sem login na semana"
          description="Precisam entrar no portal entre segunda e quarta para serem sorteados como elegíveis."
        >
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Nome</AdminTableTh>
                <AdminTableTh>Setor</AdminTableTh>
                <AdminTableTh>Motivo</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {semAcessoLista.slice(0, 40).map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd>{l.setor ?? '—'}</AdminTableTd>
                  <AdminTableTd className="text-sm text-cafeteria-700">
                    {descricaoMotivoInelegibilidadeCafeConecta(l.motivo)}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
          {semAcessoLista.length > 40 && (
            <p className="text-xs text-cafeteria-500 mt-2">Mostrando 40 de {semAcessoLista.length}.</p>
          )}
        </AdminSection>
      )}

      {afastadosLista.length > 0 && (
        <AdminSection title="Afastados" description="Licença ou afastamento registrado na semana.">
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Nome</AdminTableTh>
                <AdminTableTh>Setor</AdminTableTh>
                <AdminTableTh>Motivo</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {afastadosLista.map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd>{l.setor ?? '—'}</AdminTableTd>
                  <AdminTableTd className="text-sm text-cafeteria-700">
                    {descricaoMotivoInelegibilidadeCafeConecta(l.motivo)}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminSection>
      )}

      {outrosInelegiveis.length > 0 && (
        <AdminSection title="Outros não elegíveis">
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Nome</AdminTableTh>
                <AdminTableTh>Motivo</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {outrosInelegiveis.map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableTd>{l.nome}</AdminTableTd>
                  <AdminTableTd className="text-sm text-cafeteria-700">
                    {descricaoMotivoInelegibilidadeCafeConecta(l.motivo)}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminSection>
      )}

      {data.metricas && (
        <AdminSection title="Engajamento" description={`Reações rápidas dos colaboradores ao ${termoCafeConecta} publicado.`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <AdminStatCard label="Sorteios publicados" valor={data.metricas.sorteios_publicados} tom="neutro" />
            <AdminStatCard label="Feedback (total)" valor={data.metricas.feedback_total} tom="dourado" />
            <AdminStatCard label="Feedback (semana)" valor={data.metricas.feedback_semana} tom="verde" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CAFE_CONECTA_REACOES.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-sm text-coffee-base"
              >
                <span aria-hidden>{r.emoji}</span>
                {r.label}: <strong>{data.metricas?.por_reacao[r.id] ?? 0}</strong>
              </span>
            ))}
          </div>
        </AdminSection>
      )}

      {(data.duplas?.length ?? 0) > 0 && (
        <AdminSection title="Histórico de duplas" description="Combinações que já saíram juntas (mais recentes primeiro).">
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableTh>Dupla</AdminTableTh>
                <AdminTableTh>Vezes</AdminTableTh>
                <AdminTableTh>Última</AdminTableTh>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {data.duplas!.slice(0, 20).map((d) => (
                <AdminTableRow key={d.chave}>
                  <AdminTableTd>
                    {d.pessoa_a.nome} ({d.pessoa_a.setor_label}) · {d.pessoa_b.nome} ({d.pessoa_b.setor_label})
                  </AdminTableTd>
                  <AdminTableTd>{d.vezes}</AdminTableTd>
                  <AdminTableTd>
                    {new Date(d.ultima_data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </AdminTableTd>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminSection>
      )}

      {data.historico.length > 0 && (
        <AdminSection title="Histórico" description="Sorteios publicados.">
          <ul className="divide-y divide-cream-200 rounded-xl border border-cream-200 bg-white">
            {data.historico.map((h) => (
              <li key={h.id} className="px-4 py-3">
                <p className="text-sm font-medium text-coffee-base">
                  {new Date(h.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')} · Ciclo {h.ciclo_numero}
                </p>
                <p className="text-sm text-cafeteria-700 mt-0.5">
                  {(h.participantes ?? [])
                    .map((p) => `${p.nome} (${p.setor_label})`)
                    .join(' · ')}
                </p>
                {h.publicado_por_nome && (
                  <p className="text-xs text-cafeteria-500 mt-1">Publicado por: {h.publicado_por_nome}</p>
                )}
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      {aviso && <p className="text-sm text-cafeteria-600">{aviso}</p>}
    </div>
  );
}
