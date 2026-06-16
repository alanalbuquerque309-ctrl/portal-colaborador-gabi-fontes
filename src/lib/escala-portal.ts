import type { createAdminClient } from '@/lib/supabase/admin';
import {
  gerarMes,
  parseFolgaDiasTexto,
  type ConfigEscala,
  type TipoEscala,
} from '@/lib/escala-calendario';
import { formatarDataLocalISO, parseDataLocalISO } from '@/lib/semana-referencia';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type EscalaPortalLinha = {
  id: string;
  data: string;
  hora_entrada: string;
  hora_saida: string;
  observacao: string | null;
  fonte: 'banco' | 'gerada';
};

/** Data de hoje no fuso da operação (Brasil). */
export function hojeIsoOperacao(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function primeiroDiaMesIso(dataIso: string): string {
  const [y, m] = dataIso.split('-');
  return `${y}-${m}-01`;
}

export function ultimoDiaMesIso(dataIso: string): string {
  const d = parseDataLocalISO(dataIso);
  if (Number.isNaN(d.getTime())) return dataIso;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const ultimo = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
}

function addDiasIso(dataIso: string, dias: number): string {
  const d = parseDataLocalISO(dataIso);
  if (Number.isNaN(d.getTime())) return dataIso;
  d.setDate(d.getDate() + dias);
  return formatarDataLocalISO(d);
}

function mesesNoIntervalo(deIso: string, ateIso: string): Array<{ ano: number; mes: number }> {
  const de = parseDataLocalISO(deIso);
  const ate = parseDataLocalISO(ateIso);
  if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) return [];
  const out: Array<{ ano: number; mes: number }> = [];
  const cur = new Date(de.getFullYear(), de.getMonth(), 1);
  const fim = new Date(ate.getFullYear(), ate.getMonth(), 1);
  while (cur <= fim) {
    out.push({ ano: cur.getFullYear(), mes: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function isTipoEscala(v: string | null | undefined): v is TipoEscala {
  return v === '5x2' || v === '6x1' || v === '12x36';
}

/** «Outro plantão» só faz sentido para colaboradores em regime 12x36 (par de gerentes). */
export function colaboradorPermiteMarcarForaPlantao(tipoEscala: string | null | undefined): boolean {
  return tipoEscala === '12x36';
}

type ColabEscala = {
  tipo_escala: string | null;
  escala_folga_dias: string | null;
  escala_hora_entrada: string | null;
  escala_hora_saida: string | null;
};

function gerarLinhasDoCadastro(
  colab: ColabEscala,
  deIso: string,
  ateIso: string
): EscalaPortalLinha[] {
  const tipo = colab.tipo_escala;
  if (!isTipoEscala(tipo) || tipo === '12x36') return [];

  const entrada = String(colab.escala_hora_entrada ?? '08:00').trim() || '08:00';
  const saida = String(colab.escala_hora_saida ?? '17:00').trim() || '17:00';
  const { folgaDiasSemana, folgaDomingoSemanal } = parseFolgaDiasTexto(colab.escala_folga_dias);

  const config: ConfigEscala = {
    tipo,
    folgaDiasSemana,
    folgaDomingoSemanal,
  };

  const linhas: EscalaPortalLinha[] = [];
  for (const { ano, mes } of mesesNoIntervalo(deIso, ateIso)) {
    for (const dia of gerarMes(config, ano, mes)) {
      if (dia.data < deIso || dia.data > ateIso) continue;
      linhas.push({
        id: `gerada-${dia.data}`,
        data: dia.data,
        hora_entrada: dia.folga ? '00:00' : entrada,
        hora_saida: dia.folga ? '00:00' : saida,
        observacao: dia.observacao,
        fonte: 'gerada',
      });
    }
  }
  return linhas;
}

/** Monta escala do colaborador: banco (`escalas`) + fallback por `tipo_escala` no cadastro. */
export async function listarEscalasPortalColaborador(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  opts?: { dias?: number; deIso?: string; ateIso?: string }
): Promise<{
  escalas: EscalaPortalLinha[];
  periodo: { de: string; ate: string };
  meta: { tipo_escala: string | null; tem_banco: boolean; tem_gerada: boolean };
}> {
  const hoje = hojeIsoOperacao();
  const dias = Math.min(62, Math.max(14, opts?.dias ?? 45));
  const deIso = opts?.deIso?.trim() || primeiroDiaMesIso(hoje);
  const fimMesAtual = ultimoDiaMesIso(deIso);
  const atePorDias = opts?.ateIso?.trim() || addDiasIso(hoje, dias);
  const ate =
    opts?.ateIso?.trim() ||
    (atePorDias > fimMesAtual ? atePorDias : fimMesAtual);

  const { data: colabRaw, error: errColab } = await supabase
    .from('colaboradores')
    .select('tipo_escala, escala_folga_dias, escala_hora_entrada, escala_hora_saida')
    .eq('id', colaboradorId)
    .maybeSingle();

  const colab: ColabEscala = errColab
    ? {
        tipo_escala: null,
        escala_folga_dias: null,
        escala_hora_entrada: null,
        escala_hora_saida: null,
      }
    : {
        tipo_escala: (colabRaw as ColabEscala | null)?.tipo_escala ?? null,
        escala_folga_dias: (colabRaw as ColabEscala | null)?.escala_folga_dias ?? null,
        escala_hora_entrada: (colabRaw as ColabEscala | null)?.escala_hora_entrada ?? null,
        escala_hora_saida: (colabRaw as ColabEscala | null)?.escala_hora_saida ?? null,
      };

  const { data: rows, error } = await supabase
    .from('escalas')
    .select('id, data, hora_entrada, hora_saida, observacao')
    .eq('colaborador_id', colaboradorId)
    .gte('data', deIso)
    .lte('data', ate)
    .order('data', { ascending: true });

  if (error) throw new Error(error.message);

  const porData = new Map<string, EscalaPortalLinha>();

  const geradas = gerarLinhasDoCadastro(colab, deIso, ate);
  for (const g of geradas) porData.set(g.data, g);

  for (const e of rows ?? []) {
    const data = String(e.data ?? '');
    if (!data) continue;
    porData.set(data, {
      id: String(e.id),
      data,
      hora_entrada: String(e.hora_entrada ?? '08:00'),
      hora_saida: String(e.hora_saida ?? '17:00'),
      observacao: (e.observacao as string | null) ?? null,
      fonte: 'banco',
    });
  }

  const escalas = Array.from(porData.values()).sort((a, b) => a.data.localeCompare(b.data));

  return {
    escalas,
    periodo: { de: deIso, ate },
    meta: {
      tipo_escala: colab.tipo_escala,
      tem_banco: (rows ?? []).length > 0,
      tem_gerada: geradas.length > 0,
    },
  };
}
