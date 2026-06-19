/** Segunda-feira (data local) da semana de `ref`, em America/Sao_Paulo, formato YYYY-MM-DD. */
export function segundaSemanaSaoPaulo(ref: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  const ys = local.getFullYear();
  const ms = String(local.getMonth() + 1).padStart(2, '0');
  const ds = String(local.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

/** Domingo (data local) da semana de `ref`, em America/Sao_Paulo, formato YYYY-MM-DD. */
export function domingoSemanaSaoPaulo(ref: Date = new Date()): string {
  const inicio = segundaSemanaSaoPaulo(ref);
  const [y, m, d] = inicio.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + 6);
  const ys = dt.getFullYear();
  const ms = String(dt.getMonth() + 1).padStart(2, '0');
  const ds = String(dt.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

/** Rótulo legível da semana (segunda a domingo) a partir da segunda YYYY-MM-DD. */
export function rotuloSemanaSaoPaulo(semanaInicio: string): string {
  const [y, m, d] = semanaInicio.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return semanaInicio;
  const ini = new Date(Date.UTC(y, m - 1, d));
  const fim = new Date(ini);
  fim.setUTCDate(fim.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${fmt(ini)} a ${fmt(fim)}`;
}

/** Partes de data/hora em America/Sao_Paulo. */
export function partesSaoPaulo(ref: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return { y, mo, day, wd, iso: `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/** Fim exclusivo da semana (próxima segunda 00:00 SP) em UTC ISO, para queries timestamptz. */
export function semanaFimExclusiveUtcIsoSp(semanaInicioYmd: string): string {
  const [y, m, d] = semanaInicioYmd.split('-').map((x) => parseInt(x, 10));
  const next = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 7, 3, 0, 0, 0));
  return next.toISOString();
}

/** Início da semana (segunda 00:00 SP) em UTC ISO. SP = UTC−3 (sem horário de verão). */
export function semanaInicioUtcIsoSp(semanaInicioYmd: string): string {
  return `${semanaInicioYmd}T03:00:00.000Z`;
}

/** `true` na quinta-feira (0h–23:59 SP). */
export function ehQuintaSaoPaulo(ref: Date = new Date()): boolean {
  const { wd } = partesSaoPaulo(ref);
  return wd.startsWith('Thu');
}

/** `true` na sexta-feira (0h–23:59 SP). */
export function ehSextaSaoPaulo(ref: Date = new Date()): boolean {
  const { wd } = partesSaoPaulo(ref);
  return wd.startsWith('Fri');
}

/** Data ISO de hoje em São Paulo. */
export function hojeIsoSaoPaulo(ref: Date = new Date()): string {
  return partesSaoPaulo(ref).iso;
}

/** `true` quando hoje é domingo em America/Sao_Paulo. */
export function hojeEhDomingoSaoPaulo(ref: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo, day);
  return local.getDay() === 0;
}
