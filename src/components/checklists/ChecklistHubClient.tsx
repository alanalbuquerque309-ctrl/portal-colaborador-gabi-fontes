'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { ChecklistTurno } from '@/lib/checklists/types';
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
};

export function ChecklistHubClient() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);
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
      setDiaRotulo(String(meta.dia_semana_rotulo ?? ''));
      setTemplates(meta.templates ?? []);

      const lista = (meta.unidades ?? []) as Unidade[];
      setUnidades(lista);
      if (lista.length > 0 && !unidadeId) {
        setUnidadeId(lista[0].id);
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome ?? '';
  const aberturas = templates.filter((t) => t.tipo.startsWith('abertura'));
  const fechamentos = templates.filter((t) => t.tipo.startsWith('fechamento'));

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
        titulo="Operação do dia"
        subtitulo="Escolha a loja e o turno, depois abra o checklist de abertura ou fechamento. Cada envio atualiza o registro deste dia da semana."
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

      {preview && <ChecklistPreviewBanner />}

      <div className="rounded-2xl border border-cafeteria-200 bg-white p-4 md:p-5 shadow-sm space-y-5">
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

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cafeteria-500 mb-2">Turno</p>
          <ChecklistTurnoToggle value={turno} onChange={setTurno} />
        </div>
      </div>

      {aberturas.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-coffee-base px-1">Abertura</h2>
          <ul className="space-y-3">
            {aberturas.map((t) => (
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
        </div>
      )}

      {fechamentos.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-coffee-base px-1">Fechamento</h2>
          <ul className="space-y-3">
            {fechamentos.map((t) => (
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
        </div>
      )}

      <div className="rounded-2xl border border-dourado-200/50 bg-gradient-to-r from-cream-50 to-dourado-50/30 px-4 py-4 text-sm text-cafeteria-700">
        <p className="font-semibold text-coffee-base">Consulta da rede</p>
        <p className="mt-1 leading-relaxed">
          Veja o que foi preenchido em todas as lojas no painel admin.{' '}
          <Link href="/admin/checklists" className="font-semibold text-dourado-base hover:underline">
            Admin → Checklists
          </Link>
        </p>
      </div>
    </div>
  );
}
