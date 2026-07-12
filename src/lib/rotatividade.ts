/** Motivos de saída no desligamento (exclusão de cadastro). */
export const MOTIVOS_SAIDA = [
  { value: 'demissao', label: 'Demissão' },
  { value: 'justa_causa', label: 'Justa causa' },
  { value: 'pedido_demissao', label: 'Pediu demissão' },
  { value: 'outro', label: 'Outro' },
] as const;

export type MotivoSaida = (typeof MOTIVOS_SAIDA)[number]['value'];

export const MOTIVOS_SAIDA_VALORES: readonly MotivoSaida[] = MOTIVOS_SAIDA.map((m) => m.value);

export function isMotivoSaida(v: string): v is MotivoSaida {
  return (MOTIVOS_SAIDA_VALORES as readonly string[]).includes(v);
}

export function rotuloMotivoSaida(motivo: string | null | undefined, motivoOutro?: string | null): string {
  const m = String(motivo ?? '').trim();
  const found = MOTIVOS_SAIDA.find((x) => x.value === m);
  if (!found) return m || '—';
  if (found.value === 'outro') {
    const outro = String(motivoOutro ?? '').trim();
    return outro ? `Outro: ${outro}` : 'Outro';
  }
  return found.label;
}

/** Limites de mês civil (YYYY-MM-DD) em calendário local do servidor. */
export function limitesMesCivil(ano: number, mes: number): { inicio: string; fim: string; rotulo: string } {
  const m = Math.min(12, Math.max(1, Math.floor(mes)));
  const y = Math.floor(ano);
  const ultimoDia = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  const dd = String(ultimoDia).padStart(2, '0');
  const inicio = `${y}-${mm}-01`;
  const fim = `${y}-${mm}-${dd}`;
  const rotulo = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { inicio, fim, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
}

/** Mês atual (calendário local). */
export function mesCivilAtual(): { ano: number; mes: number } {
  const agora = new Date();
  return { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
}

export function isoEmIntervalo(iso: string | null | undefined, inicio: string, fim: string): boolean {
  const d = String(iso ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d >= inicio && d <= fim;
}

/** Dias entre duas datas ISO (YYYY-MM-DD); null se inválido. */
export function diasEntreIso(inicio: string | null | undefined, fim: string | null | undefined): number | null {
  const a = String(inicio ?? '').trim().slice(0, 10);
  const b = String(fim ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
  const t0 = Date.parse(`${a}T12:00:00Z`);
  const t1 = Date.parse(`${b}T12:00:00Z`);
  if (Number.isNaN(t0) || Number.isNaN(t1)) return null;
  return Math.max(0, Math.round((t1 - t0) / 86_400_000));
}

/** Ex.: "1 ano e 2 meses", "45 dias", "3 meses". */
export function formatarTempoCasa(dias: number | null | undefined): string {
  if (dias == null || dias < 0 || Number.isNaN(dias)) return '—';
  if (dias < 30) return dias === 1 ? '1 dia' : `${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? '1 mês' : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (resto === 0) return anos === 1 ? '1 ano' : `${anos} anos`;
  return `${anos === 1 ? '1 ano' : `${anos} anos`} e ${resto === 1 ? '1 mês' : `${resto} meses`}`;
}

export type AgregadoChave = {
  chave: string;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

export function agregarEntradasSaidas(
  entradas: { chave: string; label: string }[],
  saidas: { chave: string; label: string }[]
): AgregadoChave[] {
  const map = new Map<string, AgregadoChave>();
  const touch = (chave: string, label: string) => {
    const k = chave || 'sem';
    const lab = label || chave || 'Sem classificação';
    if (!map.has(k)) map.set(k, { chave: k, label: lab, entradas: 0, saidas: 0, saldo: 0 });
    return map.get(k)!;
  };
  for (const e of entradas) {
    const row = touch(e.chave, e.label);
    row.entradas += 1;
  }
  for (const s of saidas) {
    const row = touch(s.chave, s.label);
    row.saidas += 1;
  }
  for (const row of Array.from(map.values())) {
    row.saldo = row.entradas - row.saidas;
  }
  return Array.from(map.values()).sort(
    (a, b) => b.saidas - a.saidas || b.entradas - a.entradas || a.label.localeCompare(b.label, 'pt-BR')
  );
}
