'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import type { ChecklistItemStatus, ChecklistRegistro, ChecklistTemplate, ChecklistTurno } from '@/lib/checklists/types';
import { secoesVisiveisParaTurno, todosIdsItensTurno } from '@/lib/checklists/templates';
import {
  ChecklistCampoCard,
  ChecklistChip,
  ChecklistFeedback,
  ChecklistHero,
  ChecklistInput,
  ChecklistItemStatusRow,
  ChecklistProgressBar,
  ChecklistSectionCard,
  ChecklistStickyActions,
  ChecklistTextarea,
} from '@/components/checklists/ChecklistUi';

type Props = { tipo: string };

type PendenciaOutroTurno = {
  id: string;
  label: string;
  horario?: string;
  turno_origem: ChecklistTurno;
  status: ChecklistItemStatus;
  justificativa: string;
};

function contagemSecao(status: Record<string, ChecklistItemStatus | undefined>, ids: string[]) {
  let ok = 0;
  let pendente = 0;
  for (const id of ids) {
    if (status[id] === 'ok') ok += 1;
    else if (status[id] === 'pendente') pendente += 1;
  }
  return { ok, pendente, respondidos: ok + pendente, total: ids.length };
}

function rotuloTurnoOrigem(t: ChecklistTurno) {
  return t === 'manha' ? 'manhã' : 'tarde';
}

export function ChecklistFormClient({ tipo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unidadeId = searchParams.get('unidade_id') ?? '';
  const turno = (searchParams.get('turno') ?? 'manha') as ChecklistTurno;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [meta, setMeta] = useState<{ unidade_nome: string; dia_rotulo: string; turno_rotulo: string } | null>(null);
  const [statusItens, setStatusItens] = useState<Record<string, ChecklistItemStatus>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [notasSecoes, setNotasSecoes] = useState<Record<string, string>>({});
  const [pendenciasPlantao, setPendenciasPlantao] = useState<PendenciaOutroTurno[]>([]);
  const [setor, setSetor] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [respAbertura, setRespAbertura] = useState('');
  const [respFechamento, setRespFechamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [publicadoEm, setPublicadoEm] = useState<string | null>(null);
  const [autoSalvoEm, setAutoSalvoEm] = useState<string | null>(null);

  const prontoRef = useRef(false);
  const dirtyRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvandoRef = useRef(false);
  const snapRef = useRef({
    statusItens: {} as Record<string, ChecklistItemStatus>,
    justificativas: {} as Record<string, string>,
    notasSecoes: {} as Record<string, string>,
    setor: '',
    temperatura: '',
    respAbertura: '',
    respFechamento: '',
    observacoes: '',
  });
  snapRef.current = {
    statusItens,
    justificativas,
    notasSecoes,
    setor,
    temperatura,
    respAbertura,
    respFechamento,
    observacoes,
  };

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setErro('Selecione a unidade na lista de checklists.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    prontoRef.current = false;
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
      const pend = (data.pendencias_outro_turno ?? []) as PendenciaOutroTurno[];
      setPendenciasPlantao(pend);

      const status: Record<string, ChecklistItemStatus> = { ...(resp?.status_itens ?? {}) };
      const just: Record<string, string> = { ...(resp?.justificativas_itens ?? {}) };
      for (const p of pend) {
        if (status[p.id] !== 'ok') {
          status[p.id] = p.status;
          if (p.justificativa) just[p.id] = p.justificativa;
        }
      }

      setStatusItens(status);
      setJustificativas(just);
      setNotasSecoes(resp?.notas_secoes ?? {});
      setSetor(resp?.setor ?? '');
      setTemperatura(resp?.temperatura_geladeira ?? '');
      setRespAbertura(resp?.responsavel_abertura ?? '');
      setRespFechamento(resp?.responsavel_fechamento ?? '');
      setObservacoes(reg?.observacoes ?? '');
      setPublicadoEm(reg?.publicado_em ?? null);
      dirtyRef.current = false;
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        prontoRef.current = true;
      }, 0);
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

  const { concluidos, total, pendentes } = useMemo(() => {
    let ok = 0;
    let pend = 0;
    for (const id of idsIniciais) {
      if (statusItens[id] === 'ok') ok += 1;
      else if (statusItens[id] === 'pendente') pend += 1;
    }
    return { concluidos: ok + pend, total: idsIniciais.length, pendentes: pend };
  }, [idsIniciais, statusItens]);

  const payloadRespostas = useCallback(() => {
    const s = snapRef.current;
    return {
      status_itens: s.statusItens,
      justificativas_itens: s.justificativas,
      notas_secoes: s.notasSecoes,
      setor: s.setor || undefined,
      temperatura_geladeira: s.temperatura || undefined,
      responsavel_abertura: s.respAbertura || undefined,
      responsavel_fechamento: s.respFechamento || undefined,
    };
  }, []);

  const persistirRascunho = useCallback(
    async (origem: 'manual' | 'auto'): Promise<boolean> => {
      if (!unidadeId || salvandoRef.current) return false;
      salvandoRef.current = true;
      if (origem === 'manual') {
        setSalvando(true);
        setMsg(null);
        setErro(null);
      }
      try {
        const res = await fetch(`/api/portal/checklists/${encodeURIComponent(tipo)}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unidade_id: unidadeId,
            turno,
            observacoes: snapRef.current.observacoes,
            respostas: payloadRespostas(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (origem === 'manual') setErro(data.erro || 'Falha ao salvar.');
          return false;
        }
        dirtyRef.current = false;
        setAutoSalvoEm(new Date().toISOString());
        if (origem === 'manual') {
          setMsg(
            data.mensagem ||
              'Rascunho salvo. A liderança só vê depois que você clicar em Publicar.'
          );
          if (data.registro?.publicado_em) setPublicadoEm(data.registro.publicado_em);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return true;
      } catch {
        if (origem === 'manual') setErro('Erro de conexão.');
        return false;
      } finally {
        salvandoRef.current = false;
        if (origem === 'manual') setSalvando(false);
      }
    },
    [unidadeId, tipo, turno, payloadRespostas]
  );

  const agendarAutosave = useCallback(() => {
    if (!prontoRef.current) return;
    dirtyRef.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persistirRascunho('auto');
    }, 1800);
  }, [persistirRascunho]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const definirStatus = (id: string, status: ChecklistItemStatus) => {
    setStatusItens((p) => ({ ...p, [id]: status }));
    if (status === 'ok') {
      setJustificativas((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setPendenciasPlantao((lista) => lista.filter((x) => x.id !== id));
    }
    agendarAutosave();
  };

  const salvar = async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    await persistirRascunho('manual');
  };

  const publicar = async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setPublicando(true);
    setMsg(null);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/checklists/${encodeURIComponent(tipo)}/publicar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidade_id: unidadeId,
          turno,
          observacoes: snapRef.current.observacoes,
          respostas: payloadRespostas(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Falha ao publicar.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      dirtyRef.current = false;
      setMsg(data.mensagem || 'Checklist publicado. Já aparece para a liderança no portal.');
      setPublicadoEm(data.registro?.publicado_em ?? new Date().toISOString());
      setPendenciasPlantao((lista) => lista.filter((p) => statusItens[p.id] === 'pendente'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setPublicando(false);
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

  const pendenciasVisiveis = pendenciasPlantao.filter((p) => statusItens[p.id] === 'pendente');

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-40 md:pb-8">
      <ChecklistHero
        titulo={template.titulo}
        subtitulo="Marque cada item. O rascunho grava sozinho; para a liderança ver, use Publicar."
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
              {publicadoEm && (
                <ChecklistChip>
                  <span aria-hidden>✓</span> Publicado
                </ChecklistChip>
              )}
            </>
          )
        }
      />

      <div className="rounded-2xl border border-cafeteria-200 bg-white p-4 shadow-sm">
        <ChecklistProgressBar concluidos={concluidos} total={total} label="Itens do seu turno" />
        <p className="mt-2 text-xs text-cafeteria-500 leading-relaxed">
          <strong className="text-coffee-base">Publicar</strong> é o que libera o checklist para gerentes, RH, admin e
          sócios. Rascunho (automático ou botão) só guarda o progresso.
        </p>
        {autoSalvoEm && !publicadoEm && (
          <p className="mt-1 text-xs text-emerald-800">
            Rascunho guardado às{' '}
            {new Date(autoSalvoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Ainda falta
            publicar para aparecer no portal.
          </p>
        )}
        {pendentes > 0 && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            {pendentes} pendência(s) no turno; pode publicar com justificativa ou resolver antes.
          </p>
        )}
      </div>

      {msg && <ChecklistFeedback tipo="sucesso" mensagem={msg} />}
      {erro && <ChecklistFeedback tipo="erro" mensagem={erro} />}

      {pendenciasVisiveis.length > 0 && (
        <ChecklistSectionCard
          titulo={`Pendências do plantão da ${rotuloTurnoOrigem(pendenciasVisiveis[0]?.turno_origem ?? (turno === 'manha' ? 'tarde' : 'manha'))}`}
          concluidos={pendenciasVisiveis.filter((p) => statusItens[p.id] === 'ok').length}
          total={pendenciasVisiveis.length}
        >
          <p className="text-xs text-amber-900/90 px-1 pb-2 leading-relaxed">
            Itens deixados pelo plantão anterior. Marque OK quando resolver (você ou o próximo gerente) e publique.
          </p>
          {pendenciasVisiveis.map((item) => (
            <ChecklistItemStatusRow
              key={item.id}
              label={item.horario ? `${item.horario} — ${item.label}` : item.label}
              status={statusItens[item.id] ?? 'pendente'}
              justificativa={justificativas[item.id] ?? item.justificativa}
              onStatus={(st) => definirStatus(item.id, st)}
              onJustificativa={(texto) => {
                setJustificativas((p) => ({ ...p, [item.id]: texto }));
                agendarAutosave();
              }}
            />
          ))}
        </ChecklistSectionCard>
      )}

      {template.campos_extras?.map((campo) => {
        if (campo.id === 'setor') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                value={setor}
                onChange={(e) => {
                  setSetor(e.target.value);
                  agendarAutosave();
                }}
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
                onChange={(e) => {
                  setTemperatura(e.target.value);
                  agendarAutosave();
                }}
                placeholder={campo.placeholder ?? 'Ex.: 4'}
              />
            </ChecklistCampoCard>
          );
        }
        if (campo.id === 'responsavel_abertura' && turno === 'manha') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                value={respAbertura}
                onChange={(e) => {
                  setRespAbertura(e.target.value);
                  agendarAutosave();
                }}
                placeholder="Nome do responsável na abertura"
              />
            </ChecklistCampoCard>
          );
        }
        if (campo.id === 'responsavel_fechamento' && turno === 'tarde') {
          return (
            <ChecklistCampoCard key={campo.id} label={campo.label}>
              <ChecklistInput
                type="text"
                value={respFechamento}
                onChange={(e) => {
                  setRespFechamento(e.target.value);
                  agendarAutosave();
                }}
                placeholder="Nome do responsável no fechamento"
              />
            </ChecklistCampoCard>
          );
        }
        return null;
      })}

      {secoesVisiveis.map((secao) => {
        const ids = secao.itens.map((i) => i.id);
        const { respondidos, total: totSec } = contagemSecao(statusItens, ids);
        return (
          <ChecklistSectionCard key={secao.id} titulo={secao.titulo} concluidos={respondidos} total={totSec}>
            {secao.itens.map((item) => (
              <ChecklistItemStatusRow
                key={item.id}
                label={item.horario ? `${item.horario} — ${item.label}` : item.label}
                status={statusItens[item.id] ?? null}
                justificativa={justificativas[item.id] ?? ''}
                onStatus={(st) => definirStatus(item.id, st)}
                onJustificativa={(texto) => {
                  setJustificativas((p) => ({ ...p, [item.id]: texto }));
                  agendarAutosave();
                }}
              />
            ))}
            {secao.permite_nota && (
              <div className="pt-2 px-1">
                <p className="text-xs font-medium text-cafeteria-500 mb-1.5">Observações desta seção</p>
                <ChecklistTextarea
                  value={notasSecoes[secao.id] ?? ''}
                  onChange={(e) => {
                    setNotasSecoes((p) => ({ ...p, [secao.id]: e.target.value }));
                    agendarAutosave();
                  }}
                  rows={2}
                  placeholder="Opcional: desvios ou combinações com a equipe…"
                />
              </div>
            )}
          </ChecklistSectionCard>
        );
      })}

      <ChecklistCampoCard label="Observações gerais">
        <ChecklistTextarea
          value={observacoes}
          onChange={(e) => {
            setObservacoes(e.target.value);
            agendarAutosave();
          }}
          rows={3}
          placeholder="Resumo do turno, ocorrências ou combinações com a equipe…"
        />
      </ChecklistCampoCard>

      <ChecklistStickyActions
        salvando={salvando}
        publicando={publicando}
        onSalvar={() => void salvar()}
        onPublicar={() => void publicar()}
        onVoltar={() => router.push('/portal/checklists')}
        concluidos={concluidos}
        total={total}
        publicadoEm={publicadoEm}
      />
    </div>
  );
}
