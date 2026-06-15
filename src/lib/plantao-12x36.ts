/**
 * Plantão 12x36 amarrado à função de liderança.
 *
 * A paridade (dias pares/ímpares) é guardada na linha `lideres_por_setor`
 * (a função), com o mês-base em que foi definida. Como os dois líderes de
 * um plantão 12x36 trocam todo mês, o app inverte a paridade automaticamente
 * conforme a distância em meses até o mês-base. Trocar a pessoa (lider_id)
 * não muda nada: a configuração fica na função.
 */

export type ParidadePlantao = 'par' | 'impar';

export function ehParidadePlantao(v: string | null | undefined): v is ParidadePlantao {
  return v === 'par' || v === 'impar';
}

/** Mês atual no fuso da operação (Brasil), formato YYYY-MM. */
export function mesAtualOperacao(): string {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return ymd.slice(0, 7);
}

/** Mês (YYYY-MM) a partir de uma data ISO YYYY-MM-DD. */
export function mesDeDataIso(dataIso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(dataIso).trim());
  return m ? `${m[1]}-${m[2]}` : mesAtualOperacao();
}

function indiceMes(mesYYYYMM: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mesYYYYMM).trim());
  if (!m) return null;
  return Number(m[1]) * 12 + (Number(m[2]) - 1);
}

function inverter(p: ParidadePlantao): ParidadePlantao {
  return p === 'par' ? 'impar' : 'par';
}

/**
 * Paridade efetiva da função no mês alvo, partindo da base definida no mês-ref.
 * Inverte a cada mês de diferença. Sem base/ref válidos, retorna null.
 */
export function paridadeNoMes(
  base: string | null | undefined,
  mesRef: string | null | undefined,
  mesAlvo?: string
): ParidadePlantao | null {
  if (!ehParidadePlantao(base)) return null;
  const alvo = mesAlvo?.trim() || mesAtualOperacao();
  const idxRef = indiceMes(mesRef ?? '');
  const idxAlvo = indiceMes(alvo);
  if (idxRef == null || idxAlvo == null) return base;
  const diff = Math.abs(idxAlvo - idxRef);
  return diff % 2 === 0 ? base : inverter(base);
}

/** O dia do mês cai na paridade informada? (dia 15 = ímpar, 16 = par) */
export function diaCaiNaParidade(dataIso: string, paridade: ParidadePlantao): boolean {
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(String(dataIso).trim());
  if (!m) return false;
  const dia = Number(m[1]);
  return paridade === 'par' ? dia % 2 === 0 : dia % 2 === 1;
}

export function rotuloParidade(p: ParidadePlantao | null | undefined): string {
  if (p === 'par') return 'dias pares';
  if (p === 'impar') return 'dias ímpares';
  return '';
}
