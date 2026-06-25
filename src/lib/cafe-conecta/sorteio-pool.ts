import type { CafeConectaColaboradorBase, CafeConectaElegibilidadeLinha } from '@/lib/cafe-conecta/types';

function motivoBloqueiaSorteio(m: CafeConectaElegibilidadeLinha['motivo']): boolean {
  return m === 'ferias' || m === 'afastado' || m === 'folga_quarta';
}

function linhaParaBase(l: CafeConectaElegibilidadeLinha): CafeConectaColaboradorBase {
  const { elegivel: _e, motivo: _m, ...base } = l;
  return base;
}

/** Pool usado no sorteio admin: elegíveis estritos ou, se faltar gente, quem só não entrou no portal. */
export function poolSorteioAdminCafeConecta(lista: CafeConectaElegibilidadeLinha[]): {
  pool: CafeConectaColaboradorBase[];
  relaxouPortal: boolean;
  elegiveisStrict: number;
} {
  const elegiveisStrict = lista.filter((l) => l.elegivel);
  if (elegiveisStrict.length >= 2) {
    return {
      pool: elegiveisStrict.map(linhaParaBase),
      relaxouPortal: false,
      elegiveisStrict: elegiveisStrict.length,
    };
  }

  const vistos = new Set<string>();
  const pool: CafeConectaColaboradorBase[] = [];
  for (const l of lista) {
    if (motivoBloqueiaSorteio(l.motivo)) continue;
    if (vistos.has(l.id)) continue;
    vistos.add(l.id);
    pool.push(linhaParaBase(l));
  }

  return {
    pool,
    relaxouPortal: elegiveisStrict.length < 2 && pool.length >= 2,
    elegiveisStrict: elegiveisStrict.length,
  };
}

export function mensagemErroPoolSorteioAdmin(opts: {
  elegiveisStrict: number;
  pool: number;
  semAcesso: number;
  folga: number;
  ferias: number;
  afastados: number;
}): string {
  const partes: string[] = [];
  if (opts.elegiveisStrict < 2) {
    partes.push(
      `${opts.elegiveisStrict} elegível(is) com login no portal esta semana (mínimo 2 para sortear sem exceção).`
    );
  }
  if (opts.pool < 2) {
    partes.push(`No pool ampliado (sem exigir portal) restam ${opts.pool}.`);
  }
  if (opts.semAcesso > 0) {
    partes.push(`${opts.semAcesso} sem acesso ao portal (Grãos login_semana).`);
  }
  if (opts.folga > 0) partes.push(`${opts.folga} de folga na quarta.`);
  if (opts.ferias > 0) partes.push(`${opts.ferias} de férias.`);
  if (opts.afastados > 0) partes.push(`${opts.afastados} afastados.`);
  return partes.join(' ');
}
