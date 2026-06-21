import { segundaSemanaSaoPaulo, partesSaoPaulo } from '@/lib/semana-brasil';

/** Quarta-feira (YYYY-MM-DD) da semana civil SP que contém `ref`. */
export function quartaReferenciaSemanaSaoPaulo(ref: Date = new Date()): string {
  const seg = segundaSemanaSaoPaulo(ref);
  const [y, m, d] = seg.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, (d || 1) + 2);
  const ys = dt.getFullYear();
  const ms = String(dt.getMonth() + 1).padStart(2, '0');
  const ds = String(dt.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

export function ehQuartaSaoPaulo(ref: Date = new Date()): boolean {
  const { wd } = partesSaoPaulo(ref);
  return wd.startsWith('Wed');
}

/** A partir das 06:00 em America/Sao_Paulo. */
export function ehAposSeisHorasQuartaAlerta(ref: Date = new Date()): boolean {
  if (!ehQuartaSaoPaulo(ref)) return false;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(ref);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  return h >= 6;
}

export function deveExibirAlertaCafeConectaQuinta(
  ref: Date,
  sorteioPublicadoSemana: boolean
): boolean {
  return ehAposSeisHorasQuartaAlerta(ref) && !sorteioPublicadoSemana;
}
