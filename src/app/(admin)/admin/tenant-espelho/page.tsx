'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { TenantEspelhoAdminPainel } from '@/lib/tenant/types';

const MODULO_LABEL: Record<string, string> = {
  graos: 'Grãos / reconhecimento',
  cafe_conecta: 'Café Conecta',
  quinta_treino: 'Quinta treino',
  trofeus_pares: 'Troféus entre pares',
  termometro_emocional: 'Termômetro emocional',
  avaliacao_equipe: 'Avaliação de equipe',
  feedback_lideranca: 'Feedback liderança',
  escalas: 'Escalas',
  gorjeta: 'Gorjeta',
};

function Badge({
  ok,
  labelOk,
  labelBad,
}: {
  ok: boolean;
  labelOk: string;
  labelBad: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
      }`}
    >
      {ok ? labelOk : labelBad}
    </span>
  );
}

function CampoLista({ titulo, pares }: { titulo: string; pares: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-coffee-base mb-2">{titulo}</h3>
      <dl className="grid gap-1.5 text-sm">
        {pares.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-2 border-b border-cream-200/80 pb-1.5">
            <dt className="text-cafeteria-600">{k}</dt>
            <dd className="text-coffee-base break-words">{v || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ModulosChips({ modulos }: { modulos: Record<string, boolean | undefined> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(modulos).map(([k, ativo]) => (
        <span
          key={k}
          className={`rounded-lg px-2.5 py-1 text-xs border ${
            ativo
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-cafeteria-200 bg-cream-50 text-cafeteria-500 line-through'
          }`}
        >
          {MODULO_LABEL[k] ?? k}
        </span>
      ))}
    </div>
  );
}

function ListaSetores({ setores }: { setores: string[] }) {
  if (setores.length === 0) {
    return <p className="text-sm text-cafeteria-500">Nenhum setor.</p>;
  }
  return (
    <ol className="text-sm text-coffee-base list-decimal list-inside space-y-0.5 columns-1 sm:columns-2">
      {setores.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

export default function TenantEspelhoAdminPage() {
  const [painel, setPainel] = useState<TenantEspelhoAdminPainel | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    fetch('/api/admin/tenant-espelho', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; erro?: string; painel?: TenantEspelhoAdminPainel }) => {
        if (!d.ok || !d.painel) {
          setErro(d.erro || 'Não foi possível carregar o espelho do tenant.');
          setPainel(null);
          return;
        }
        setPainel(d.painel);
      })
      .catch(() => {
        setErro('Falha de rede ao carregar o espelho.');
        setPainel(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <XicaraCarregando size="lg" label="Carregando espelho…" />
      </div>
    );
  }

  if (erro || !painel) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Tenant (espelho)" description="Somente leitura — preparação SaaS." />
        <p className="text-sm text-red-700">{erro}</p>
        <button
          type="button"
          onClick={recarregar}
          className="rounded-lg bg-dourado-base px-4 py-2 text-sm text-cream-100 hover:bg-dourado-400"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const brandingRuntime = Object.entries(painel.runtime.branding).filter(
    ([k]) => k !== 'slug'
  ) as [string, string][];

  const brandingEspelho = painel.espelho_db
    ? (Object.entries(painel.espelho_db.branding).filter(([, v]) => v) as [string, string][])
    : [];

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Tenant (espelho)"
        description="Compara o que o portal usa hoje, o legado em código e o espelho no Supabase. Nada aqui altera produção."
        actions={
          <button
            type="button"
            onClick={recarregar}
            className="rounded-lg border border-cafeteria-300 px-3 py-1.5 text-sm text-coffee-base hover:bg-cream-100"
          >
            Atualizar
          </button>
        }
      />

      <div className="rounded-xl border border-dourado-200 bg-cream-50 px-4 py-3 text-sm text-coffee-base">
        <p>
          <strong>Slug:</strong> {painel.slug} · <strong>Runtime:</strong>{' '}
          {painel.fonte_runtime === 'db_mirror' ? 'espelho DB (USE_TENANT_DB ligado)' : 'legado / env'}
        </p>
        <p className="mt-1 text-cafeteria-600">
          Com <code className="text-xs bg-white/80 px-1 rounded">USE_TENANT_DB=false</code> (padrão), colaboradores
          continuam no legado mesmo que o espelho exista no banco.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          ok={painel.espelho_061_disponivel}
          labelOk="Migration 061 no banco"
          labelBad="Tabela tenants ausente"
        />
        <Badge
          ok={!painel.use_tenant_db}
          labelOk="USE_TENANT_DB desligado (seguro)"
          labelBad="USE_TENANT_DB ligado"
        />
        {painel.comparacao.espelho_alinhado_legado_setores != null && (
          <Badge
            ok={painel.comparacao.espelho_alinhado_legado_setores}
            labelOk="Setores espelho = legado"
            labelBad="Setores espelho divergentes"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="Runtime efetivo" description="O que o servidor entrega ao portal agora.">
          <CampoLista titulo="Branding" pares={brandingRuntime} />
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-coffee-base mb-2">Termos de cultura</h3>
            <CampoLista
              titulo=""
              pares={Object.entries(painel.runtime.termos) as [string, string][]}
            />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-coffee-base mb-2">Módulos</h3>
            <ModulosChips modulos={painel.runtime.modulos} />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-coffee-base mb-2">
              Setores ({painel.runtime.setores.length})
            </h3>
            <ListaSetores setores={painel.runtime.setores} />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-coffee-base mb-2">
              Unidades ({painel.runtime.unidades.length})
            </h3>
            <ul className="text-sm text-coffee-base space-y-0.5">
              {painel.runtime.unidades.map((u) => (
                <li key={u.slug}>
                  {u.label} <span className="text-cafeteria-500">({u.slug})</span>
                </li>
              ))}
            </ul>
          </div>
        </AdminSection>

        <AdminSection
          title="Espelho Supabase (061)"
          description={
            painel.espelho_db
              ? `Tenant ${painel.espelho_db.nome_exibicao}`
              : 'Espelho não encontrado ou migration 061 pendente.'
          }
        >
          {painel.espelho_db ? (
            <>
              <CampoLista
                titulo="Branding"
                pares={brandingEspelho.length > 0 ? brandingEspelho : [['—', 'Vazio']]}
              />
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-coffee-base mb-2">Termos</h3>
                <CampoLista
                  titulo=""
                  pares={Object.entries(painel.espelho_db.termos) as [string, string][]}
                />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-coffee-base mb-2">Módulos</h3>
                <ModulosChips modulos={painel.espelho_db.modulos} />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-coffee-base mb-2">
                  Setores ({painel.espelho_db.setores.length})
                </h3>
                <ListaSetores setores={painel.espelho_db.setores} />
              </div>
              <p className="mt-4 text-xs text-cafeteria-500 break-all">ID: {painel.espelho_db.tenant_id}</p>
            </>
          ) : (
            <p className="text-sm text-cafeteria-600">
              Aplique a migration 061 no SQL Editor do Supabase para popular o espelho.
            </p>
          )}
        </AdminSection>
      </div>

      <AdminSection
        title="Legado em código"
        description="Constantes e defaults TS — fallback quando USE_TENANT_DB está desligado."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <CampoLista
            titulo="Branding"
            pares={Object.entries(painel.legado_codigo.branding).filter(([k]) => k !== 'slug') as [string, string][]}
          />
          <div>
            <h3 className="text-sm font-semibold text-coffee-base mb-2">Setores ({painel.legado_codigo.setores.length})</h3>
            <ListaSetores setores={painel.legado_codigo.setores} />
          </div>
        </div>
      </AdminSection>
    </div>
  );
}
