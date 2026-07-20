'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ChecklistTurno } from '@/lib/checklists/types';

export function ChecklistPreviewBanner() {
  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-cream-50 px-4 py-3.5 text-sm text-emerald-950 shadow-sm">
      <p className="font-semibold flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200/80 text-xs" aria-hidden>
          ✓
        </span>
        Checklist operacional Mesquita
      </p>
      <p className="mt-1.5 leading-relaxed text-emerald-900/90 pl-8">
        Gerentes de loja, RH, admin e sócios podem preencher. Marque cada item como OK ou Pendente; pendências exigem
        justificativa.
      </p>
    </div>
  );
}

export function ChecklistHero({
  titulo,
  subtitulo,
  chips,
  backHref,
  backLabel = 'Checklists',
}: {
  titulo: string;
  subtitulo?: string;
  chips?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dourado-200/60 bg-gradient-to-br from-cream-50 via-white to-dourado-50/40 px-5 py-6 md:px-7 md:py-7 shadow-sm">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-dourado-base/10 blur-2xl"
        aria-hidden
      />
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-cafeteria-600 hover:text-coffee-base transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </Link>
      )}
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-coffee-base tracking-tight">{titulo}</h1>
      {subtitulo && <p className="mt-2 text-sm md:text-base text-cafeteria-600 leading-relaxed max-w-xl">{subtitulo}</p>}
      {chips && <div className="mt-4 flex flex-wrap gap-2">{chips}</div>}
    </div>
  );
}

export function ChecklistChip({
  children,
  destaque = false,
}: {
  children: ReactNode;
  destaque?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        destaque
          ? 'bg-dourado-base/20 text-coffee-base border border-dourado-base/30'
          : 'bg-white/80 text-cafeteria-700 border border-cafeteria-200/80'
      }`}
    >
      {children}
    </span>
  );
}

export function ChecklistTurnoToggle({
  value,
  onChange,
}: {
  value: ChecklistTurno;
  onChange: (v: ChecklistTurno) => void;
}) {
  const opcoes: { id: ChecklistTurno; label: string; emoji: string }[] = [
    { id: 'manha', label: 'Manhã', emoji: '☀️' },
    { id: 'tarde', label: 'Tarde', emoji: '🌤️' },
  ];
  return (
    <div className="flex rounded-2xl border border-cafeteria-200 bg-cream-50/80 p-1 gap-1">
      {opcoes.map((o) => {
        const ativo = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
              ativo
                ? 'bg-white text-coffee-base shadow-sm border border-dourado-200/60'
                : 'text-cafeteria-600 hover:text-coffee-base'
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              {o.emoji}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChecklistProgressBar({
  concluidos,
  total,
  label,
  compacto,
}: {
  concluidos: number;
  total: number;
  label?: string;
  compacto?: boolean;
}) {
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const cor =
    pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-dourado-base' : 'bg-cafeteria-300';

  return (
    <div className={compacto ? 'space-y-1' : 'space-y-2'}>
      {!compacto && (
        <div className="flex items-center justify-between text-xs font-medium text-cafeteria-600">
          <span>{label ?? 'Progresso'}</span>
          <span className="tabular-nums text-coffee-base">
            {concluidos}/{total} · {pct}%
          </span>
        </div>
      )}
      <div className={`w-full rounded-full bg-cafeteria-100 overflow-hidden ${compacto ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${cor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function ChecklistItemRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-all min-h-[52px] ${
        checked
          ? 'border-emerald-200 bg-emerald-50/70 shadow-sm'
          : 'border-cafeteria-100 bg-cream-50/50 hover:border-cafeteria-200 hover:bg-white'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
          checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-cafeteria-300 bg-white'
        }`}
        aria-hidden
      >
        {checked && (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className={`text-sm leading-snug pt-0.5 ${checked ? 'text-emerald-950 font-medium' : 'text-cafeteria-800'}`}>
        {label}
      </span>
    </label>
  );
}

export function ChecklistItemStatusRow({
  label,
  status,
  justificativa,
  onStatus,
  onJustificativa,
}: {
  label: string;
  status: 'ok' | 'pendente' | null;
  justificativa: string;
  onStatus: (status: 'ok' | 'pendente') => void;
  onJustificativa: (texto: string) => void;
}) {
  const pendenteSemJust = status === 'pendente' && justificativa.trim().length < 3;

  return (
    <div
      className={`rounded-xl border px-3 py-3 transition-all ${
        status === 'ok'
          ? 'border-emerald-200 bg-emerald-50/70'
          : status === 'pendente'
            ? 'border-amber-200 bg-amber-50/50'
            : 'border-cafeteria-100 bg-cream-50/50'
      }`}
    >
      <p className="text-sm leading-snug text-cafeteria-800 font-medium">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStatus('ok')}
          className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold transition-colors ${
            status === 'ok'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => onStatus('pendente')}
          className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold transition-colors ${
            status === 'pendente'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'border border-amber-200 bg-white text-amber-900 hover:bg-amber-50'
          }`}
        >
          Pendente
        </button>
      </div>
      {status === 'pendente' && (
        <div className="mt-3">
          <label className="text-xs font-medium text-cafeteria-600 block mb-1.5">
            Justificativa <span className="text-amber-700">(obrigatória)</span>
          </label>
          <ChecklistTextarea
            value={justificativa}
            onChange={(e) => onJustificativa(e.target.value)}
            rows={2}
            placeholder="Explique o que ficou pendente e o próximo passo…"
            aria-invalid={pendenteSemJust}
            className={pendenteSemJust ? 'border-amber-300 ring-1 ring-amber-200' : undefined}
          />
        </div>
      )}
    </div>
  );
}

export function ChecklistSectionCard({
  titulo,
  concluidos,
  total,
  children,
}: {
  titulo: string;
  concluidos: number;
  total: number;
  children: ReactNode;
}) {
  const completo = total > 0 && concluidos >= total;
  return (
    <section
      className={`rounded-2xl border overflow-hidden transition-shadow ${
        completo ? 'border-emerald-200/80 shadow-sm' : 'border-cafeteria-200 bg-white'
      }`}
    >
      <div
        className={`px-4 py-3.5 border-b ${
          completo ? 'bg-emerald-50/80 border-emerald-100' : 'bg-gradient-to-r from-cream-50 to-white border-cafeteria-100'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold text-coffee-base text-base leading-snug">{titulo}</h2>
          {completo && (
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              OK
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="mt-2.5">
            <ChecklistProgressBar concluidos={concluidos} total={total} compacto />
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </section>
  );
}

export function ChecklistCampoCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block rounded-2xl border border-cafeteria-200 bg-white p-4 shadow-sm">
      <span className="text-sm font-semibold text-coffee-base">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-cafeteria-200 bg-cream-50/50 px-3 py-2.5 min-h-[48px] text-coffee-base placeholder:text-cafeteria-400 focus:outline-none focus:ring-2 focus:ring-dourado-base/30 focus:border-dourado-base/50';

export function ChecklistInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function ChecklistTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputClass} min-h-[88px] resize-y ${props.className ?? ''}`}
    />
  );
}

export function ChecklistStickyActions({
  salvando,
  publicando,
  onSalvar,
  onPublicar,
  onVoltar,
  concluidos,
  total,
  publicadoEm,
}: {
  salvando: boolean;
  publicando?: boolean;
  onSalvar: () => void;
  onPublicar: () => void;
  onVoltar: () => void;
  concluidos: number;
  total: number;
  publicadoEm?: string | null;
}) {
  const busy = salvando || publicando;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:static md:mt-2">
      {publicadoEm && (
        <p className="hidden md:block text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-2">
          Publicado em {new Date(publicadoEm).toLocaleString('pt-BR')}. Amanhã o formulário abre de novo; este dia
          fica 7 dias para conferência.
        </p>
      )}
      <div className="md:hidden border-t border-cafeteria-200 bg-cream-100/95 backdrop-blur-md px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(62,39,35,0.08)]">
        <div className="max-w-2xl mx-auto space-y-2">
          <ChecklistProgressBar concluidos={concluidos} total={total} label="Itens do turno" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onVoltar}
              className="rounded-xl border border-cafeteria-300 bg-white px-3 py-3 min-h-[48px] text-sm font-semibold text-cafeteria-800"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSalvar}
              className="flex-1 rounded-xl border border-cafeteria-300 bg-white py-3 min-h-[48px] text-sm font-semibold text-coffee-base disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onPublicar}
              className="flex-1 rounded-xl bg-coffee-base text-cream-50 py-3 min-h-[48px] text-sm font-bold shadow-md disabled:opacity-50"
            >
              {publicando ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
      <div className="hidden md:flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={onPublicar}
          className="rounded-xl bg-coffee-base text-cream-50 font-bold px-8 py-3 min-h-[48px] shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
        >
          {publicando ? 'Publicando…' : 'Publicar checklist'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSalvar}
          className="rounded-xl border border-cafeteria-300 bg-white px-8 py-3 min-h-[48px] font-semibold text-coffee-base hover:border-dourado-base/50 transition-colors disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Salvar rascunho'}
        </button>
        <button
          type="button"
          onClick={onVoltar}
          className="rounded-xl border border-cafeteria-300 bg-white px-8 py-3 min-h-[48px] font-semibold text-cafeteria-800 hover:border-dourado-base/50 transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

export function ChecklistItemStatusLeitura({
  label,
  status,
  justificativa,
}: {
  label: string;
  status: 'ok' | 'pendente' | null;
  justificativa?: string;
}) {
  const ok = status === 'ok';
  const pend = status === 'pendente';
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        ok ? 'border-emerald-200 bg-emerald-50/60' : pend ? 'border-amber-200 bg-amber-50/50' : 'border-cafeteria-100 bg-cream-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-cafeteria-800 leading-snug">{label}</p>
        {ok && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            OK
          </span>
        )}
        {pend && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
            Pendente
          </span>
        )}
      </div>
      {pend && justificativa && (
        <p className="mt-2 text-xs text-amber-900/90 leading-relaxed border-t border-amber-200/60 pt-2">
          <span className="font-semibold">Justificativa:</span> {justificativa}
        </p>
      )}
    </div>
  );
}

export function iconeTemplateChecklist(tipo: string): { emoji: string; categoria: 'abertura' | 'fechamento' | 'gerencia' } {
  if (tipo.includes('gerencia')) return { emoji: '📋', categoria: 'gerencia' };
  if (tipo.startsWith('fechamento')) return { emoji: '🌙', categoria: 'fechamento' };
  if (tipo === 'abertura_setor') return { emoji: '🧹', categoria: 'abertura' };
  return { emoji: '☕', categoria: 'abertura' };
}

export function ChecklistTemplateCard({
  href,
  titulo,
  descricao,
  tipo,
}: {
  href: string;
  titulo: string;
  descricao: string;
  tipo: string;
}) {
  const { emoji, categoria } = iconeTemplateChecklist(tipo);
  const abertura = categoria === 'abertura';
  const gerencia = categoria === 'gerencia';

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-cafeteria-200 bg-white p-4 md:p-5 transition-all hover:border-dourado-base/50 hover:shadow-md min-h-[72px]"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${
          gerencia
            ? 'bg-coffee-base/10 text-coffee-base border border-coffee-base/20'
            : abertura
              ? 'bg-amber-50 text-amber-900 border border-amber-100'
              : 'bg-indigo-50 text-indigo-900 border border-indigo-100'
        }`}
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-coffee-base text-base group-hover:text-dourado-base transition-colors">
            {titulo}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
              gerencia
                ? 'bg-coffee-base/10 text-coffee-base'
                : abertura
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-indigo-100 text-indigo-900'
            }`}
          >
            {gerencia ? 'Gerência' : abertura ? 'Abertura' : 'Fechamento'}
          </span>
        </span>
        <span className="block text-sm text-cafeteria-600 mt-1 leading-relaxed">{descricao}</span>
        <span className="inline-flex items-center gap-1 mt-2.5 text-sm font-semibold text-dourado-base">
          Preencher
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

export function ChecklistFeedback({
  tipo,
  mensagem,
}: {
  tipo: 'erro' | 'sucesso';
  mensagem: string;
}) {
  const ok = tipo === 'sucesso';
  return (
    <div
      role="alert"
      className={`rounded-2xl border px-4 py-3 text-sm flex items-start gap-3 ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
      }`}
    >
      <span className="text-lg leading-none" aria-hidden>
        {ok ? '✓' : '!'}
      </span>
      <p className="leading-relaxed font-medium">{mensagem}</p>
    </div>
  );
}
