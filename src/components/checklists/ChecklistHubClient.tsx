'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { ChecklistTurno } from '@/lib/checklists/types';
import { ChecklistVistoriaPanel } from '@/components/checklists/ChecklistVistoriaPanel';
import { ChecklistPublicadoPanel } from '@/components/checklists/ChecklistPublicadoPanel';
import {
  ChecklistChip,
  ChecklistHero,
  ChecklistPreviewBanner,
  ChecklistTemplateCard,
  ChecklistTurnoToggle,
} from '@/components/checklists/ChecklistUi';

type Unidade = { id: string; nome: string; slug: string };
type TemplateResumo = {
  tipo: string;
  titulo: string;
  descricao: string;
  turnos: ChecklistTurno[];
  papel?: 'gerencia' | 'setor';
  exige_unidade_slug?: string[];
};

export function ChecklistHubClient() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [fasePiloto, setFasePiloto] = useState(false);
  const [diaRotulo, setDiaRotulo] = useState('');
  const [templates, setTemplates] = useState<TemplateResumo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState('');
  const [turno, setTurno] = useState<ChecklistTurno>('manha');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const metaRes = await fetch('/api/portal/checklists', { credentials: 'include', cache: 'no-store' });
      const meta = await metaRes.json();

      if (!metaRes.ok || !meta.ok) {
        setErro(meta.erro || 'Não foi possível carregar checklists.');
        return;
      }

      setPreview(meta.preview_socios === true);
      setFasePiloto(meta.fase_piloto === true);
      setDiaRotulo(String(meta.dia_semana_rotulo ?? ''));
      setTemplates(meta.templates ?? []);

      const lista = (meta.unidades ?? []) as Unidade[];
      setUnidades(lista);
      setUnidadeId((atual) => {
        if (atual && lista.some((u) => u.id === atual)) return atual;
        return lista[0]?.id ?? '';
      });
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const unidadeSlug = unidades.find((u) => u.id === unidadeId)?.slug ?? '';
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome ?? '';

  const templatesVisiveis = useMemo(() => {
    return templates.filter((t) => {
      const slugs = t.exige_unidade_slug ?? [];
      if (slugs.length === 0) return true;
      return slugs.includes(unidadeSlug);
    });
  }, [templates, unidadeSlug]);

  const templatesGerencia = useMemo(
    () => templatesVisiveis.filter((t) => t.papel !== 'setor'),
    [templatesVisiveis]
  );
  const templatesSetor = useMemo(
    () => templatesVisiveis.filter((t) => t.papel === 'setor'),
    [templatesVisiveis]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <XicaraCarregando size="md" label="Carregando checklists…" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-900 text-sm">
        {erro}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <ChecklistHero
        titulo="Checklists Mesquita"
        subtitulo={
          fasePiloto
            ? 'Piloto Mesquita: seu checklist de gerência por turno e vistoria dos setores (Estoque, ASG, Cozinha, Balcão, Caixa).'
            : 'Escolha a loja e o turno, depois abra o checklist. Cada envio atualiza o registro deste dia da semana.'
        }
        chips={
          <>
            <ChecklistChip destaque>
              <span aria-hidden>📅</span> {diaRotulo || 'Hoje'}
            </ChecklistChip>
            {unidadeNome && (
              <ChecklistChip>
                <span aria-hidden>📍</span> {unidadeNome}
              </ChecklistChip>
            )}
          </>
        }
      />

      <ChecklistPreviewBanner />

      {fasePiloto && (
        <div className="rounded-2xl border border-coffee-base/15 bg-cream-50 px-4 py-3 text-sm text-cafeteria-700">
          Fase piloto <strong className="text-coffee-base">Mesquita</strong>: gerência preenche abertura (manhã) e
          fechamento (tarde); ao longo do dia, vistorie se Estoque, ASG, Cozinha, Balcão e Caixa preencheram o deles.
        </div>
      )}

      <div className="rounded-2xl border border-cafeteria-200 bg-white p-4 md:p-5 shadow-sm space-y-5">
        {unidades.length > 1 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cafeteria-500 mb-2">Loja</p>
            <select
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              className="w-full rounded-xl border border-cafeteria-200 bg-cream-50/60 px-3 py-2.5 min-h-[48px] text-coffee-base font-medium focus:outline-none focus:ring-2 focus:ring-dourado-base/30"
              aria-label="Selecionar unidade"
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cafeteria-500 mb-2">Turno</p>
          <ChecklistTurnoToggle value={turno} onChange={setTurno} />
        </div>
      </div>

      {unidadeId && templatesGerencia.length > 0 && (
        <ChecklistPublicadoPanel
          unidadeId={unidadeId}
          tipo={templatesGerencia[0]?.tipo ?? 'gerencia_diaria_mesquita'}
        />
      )}

      {templatesGerencia.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cafeteria-500 px-1">Checklist de gerência</h2>
          <ul className="space-y-3">
            {templatesGerencia.map((t) => (
              <li key={t.tipo}>
                <ChecklistTemplateCard
                  href={`/portal/checklists/${t.tipo}?unidade_id=${encodeURIComponent(unidadeId)}&turno=${turno}`}
                  titulo={t.titulo}
                  descricao={t.descricao}
                  tipo={t.tipo}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {unidadeId && unidadeSlug === 'mesquita' && (
        <ChecklistVistoriaPanel unidadeId={unidadeId} unidadeSlug={unidadeSlug} turno={turno} />
      )}

      {templatesSetor.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cafeteria-500 px-1">
            Formulários dos setores
          </h2>
          <p className="text-xs text-cafeteria-500 px-1">
            Cada setor preenche o seu. Na fase piloto, sócios/gerência podem testar antes de liberar para a equipe.
          </p>
          <ul className="space-y-3">
            {templatesSetor.map((t) => (
              <li key={t.tipo}>
                <ChecklistTemplateCard
                  href={`/portal/checklists/${t.tipo}?unidade_id=${encodeURIComponent(unidadeId)}&turno=${turno}`}
                  titulo={t.titulo}
                  descricao={t.descricao}
                  tipo={t.tipo}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {templatesVisiveis.length === 0 && (
        <div className="rounded-2xl border border-dashed border-cafeteria-300 bg-cream-50 px-4 py-8 text-center text-sm text-cafeteria-600">
          Nenhum checklist disponível para esta unidade na fase piloto.
        </div>
      )}

      <div className="rounded-2xl border border-cafeteria-200/80 bg-cream-50/80 px-4 py-3 text-xs text-cafeteria-600">
        <span className="font-semibold text-cafeteria-800">Relatório da rede:</span> preenchimentos salvos aparecem em{' '}
        <Link href="/admin/checklists" className="font-semibold text-dourado-base hover:underline">
          Admin → Checklists (consulta)
        </Link>
        .
      </div>
    </div>
  );
}
