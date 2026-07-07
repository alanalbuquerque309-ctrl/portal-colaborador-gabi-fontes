'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { ChecklistRegistro, ChecklistTemplate, ChecklistTurno } from '@/lib/checklists/types';
import { secoesVisiveisParaTurno, todosIdsItensTurno } from '@/lib/checklists/templates';
import {
  ChecklistCampoCard,
  ChecklistChip,
  ChecklistFeedback,
  ChecklistHero,
  ChecklistInput,
  ChecklistItemRow,
  ChecklistProgressBar,
  ChecklistSectionCard,
  ChecklistStickyActions,
  ChecklistTextarea,
} from '@/components/checklists/ChecklistUi';

type Props = { tipo: string };

function contagemSecao(itens: Record<string, boolean>, ids: string[]) {
  const ok = ids.filter((id) => itens[id] === true).length;
  return { ok, total: ids.length };
}

export function ChecklistFormClient({ tipo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unidadeId = searchParams.get('unidade_id') ?? '';
  const turno = (searchParams.get('turno') ?? 'manha') as ChecklistTurno;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [meta, setMeta] = useState<{ unidade_nome: string; dia_rotulo: string; turno_rotulo: string } | null>(null);
  const [itens, setItens] = useState<Record<string, boolean>>({});
  const [notasSecoes, setNotasSecoes] = useState<Record<string, string>>({});
  const [setor, setSetor] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [respAbertura, setRespAbertura] = useState('');
  const [respFechamento, setRespFechamento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setErro('Selecione a unidade na lista de checklists.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/portal/checklists/${encodeURIComponent(tipo)}?unidade_id=${encodeURIComponent(unidadeId)}&turno=${turno}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Não foi possível carregar.');
        return;
      }

      setTemplate(data.template);
      setMeta({
        unidade_nome: data.unidade?.nome ?? '',
        dia_rotulo: data.dia_semana_rotulo ?? '',
        turno_rotulo: data.turno_rotulo ?? '',
      });

      const reg = data.registro as ChecklistRegistro | null;
      const resp = reg?.respostas;
      setItens(resp?.itens ?? {});
      setNotasSecoes(resp?.notas_secoes ?? {});
      setSetor(resp?.setor ?? '');
      setTemperatura(resp?.temperatura_geladeira ?? '');
      setRespAbertura(resp?.responsavel_abertura ?? '');
      setRespFechamento(resp?.responsavel_fechamento ?? '');
      setObservacoes(reg?.observacoes ?? '');
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [tipo, unidadeId, turno]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const secoesVisiveis = useMemo(() => {
    if (!template) return [];
    return secoesVisiveisParaTurno(template, turno);
  }, [template, turno]);

  const idsIniciais = useMemo(() => {
    if (!template) return [];
    return todosIdsItensTurno(template, turno);
  }, [template, turno]);

  useEffect(() => {
    if (!template) return;
    setItens((prev) => {
      const next = { ...prev };
      for (const id of idsIniciais) {
        if (next[id] === undefined) next[id] = false;
      }
      return next;
    });
  }, [template, idsIniciais]);

  const { concluidos, total } = useMemo(() => {
    const ok = idsIniciais.filter((id) => itens[id] === true).length;
    return { concluidos: ok, total: idsIniciais.length };
  }, [idsIniciais, itens]);

  const salvar = async () => {
    setSalvando(true);
    setMsg(null);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/checklists/${encodeURIComponent(tipo)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidade_id: unidadeId,
          turno,
          observacoes,
          respostas: {
            itens,
            notas_secoes: notasSecoes,
            setor: setor || undefined,
            temperatura_geladeira: temperatura || undefined,
            responsavel_abertura: respAbertura || undefined,
            responsavel_fechamento: respFechamento || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Falha ao salvar.');
        return;
      }
      setMsg(data.mensagem || 'Checklist salvo com sucesso.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <XicaraCarregando size="md" label="Carregando formulário…" />
      </div>
    );
  }

  if (erro && !template) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <ChecklistFeedback tipo="erro" mensagem={erro} />
        <Link href="/portal/checklists" className="inline-flex text-sm font-semibold text-dourado-base hover:underline">
          ← Voltar aos checklists
        </Link>
      </div>
    );
  }

  if (!template) return null;

  const titulo = template.titulo;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-32 md:pb-8">
      <ChecklistHero
        titulo={titulo}
        subtitulo={template.descricao}
        backHref="/portal/checklists"
        chips={
          meta && (
            <>
              <ChecklistChip destaque>
                <span aria-hidden>📍</span> {meta.unidade_nome}
              </ChecklistChip>
              <ChecklistChip>
                <span aria-hidden>📅</span> {meta.dia_rotulo}
              </ChecklistChip>
              <ChecklistChip>
                <span aria-hidden>{turno === 'manha' ? '☀️' : '🌤️'}</span> {meta.turno_rotulo}
              </ChecklistChip>
            </>
          )
        }
      />

      <div className="rounded-2xl border border-cafeteria-200 bg-white p-4 shadow-sm">
        <ChecklistProgressBar concluidos={concluidos} total={total} label="Itens conferidos" />
        {total > 0 && concluidos < total && (
          <p className="mt-2 text-xs text-cafeteria-500">
            Marque cada item conforme for conferindo na loja. Você pode salvar parcialmente.
          </p>
        )}
      </div>

      {msg && <ChecklistFeedback tipo="sucesso" mensagem={msg} />}
      {erro && <ChecklistFeedback tipo="erro" mensagem={erro} />}

      {template.campos_extras?.map((campo) => {
        if (campo.id === 'setor') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                placeholder="Ex.: Cozinha, Balcão…"
              />
            </ChecklistCampoCard>
          );
        }
        if (campo.id === 'temperatura_geladeira') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                inputMode="decimal"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                placeholder={campo.placeholder ?? 'Ex.: 4'}
              />
            </ChecklistCampoCard>
          );
        }
        if (campo.id === 'responsavel_abertura') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                value={respAbertura}
                onChange={(e) => setRespAbertura(e.target.value)}
                placeholder="Nome do responsável na abertura"
              />
            </ChecklistCampoCard>
          );
        }
        if (campo.id === 'responsavel_fechamento') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                value={respFechamento}
                onChange={(e) => setRespFechamento(e.target.value)}
                placeholder="Nome do responsável no fechamento"
              />
            </ChecklistCampoCard>
          );
        }
        return null;
      })}

      {secoesVisiveis.map((secao) => {
        const ids = secao.itens.map((i) => i.id);
        const { ok, total: totSec } = contagemSecao(itens, ids);
        return (
          <ChecklistSectionCard key={secao.id} titulo={secao.titulo} concluidos={ok} total={totSec}>
            {secao.itens.map((item) => (
              <ChecklistItemRow
                key={item.id}
                id={`chk-${item.id}`}
                label={item.horario ? `${item.horario} — ${item.label}` : item.label}
                checked={itens[item.id] === true}
                onChange={(v) => setItens((p) => ({ ...p, [item.id]: v }))}
              />
            ))}
            {secao.permite_nota && (
              <div className="pt-2 px-1">
                <p className="text-xs font-medium text-cafeteria-500 mb-1.5">Observações desta seção</p>
                <ChecklistTextarea
                  value={notasSecoes[secao.id] ?? ''}
                  onChange={(e) => setNotasSecoes((p) => ({ ...p, [secao.id]: e.target.value }))}
                  rows={2}
                  placeholder="Opcional: desvios, pendências…"
                />
              </div>
            )}
          </ChecklistSectionCard>
        );
      })}

      <ChecklistCampoCard label="Observações gerais">
        <ChecklistTextarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Resumo do turno, ocorrências ou combinações com a equipe…"
        />
      </ChecklistCampoCard>

      <ChecklistStickyActions
        salvando={salvando}
        onSalvar={() => void salvar()}
        onVoltar={() => router.push('/portal/checklists')}
        concluidos={concluidos}
        total={total}
      />
    </div>
  );
}
