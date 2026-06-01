/** Grade de calendário com semanas completas (dias do mês anterior/posterior visíveis). */

export function periodoSemanasCompletas(mesRef: string): {
  de: string;
  ate: string;
  ano: number;
  mes: number;
} {
  const m = /^(\d{4})-(\d{2})$/.exec(mesRef.trim());
  if (!m) {
    const hoje = new Date();
    return periodoSemanasCompletas(
      `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    );
  }
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);

  const de = new Date(primeiro);
  const dow = de.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  de.setDate(de.getDate() - back);

  const ate = new Date(ultimo);
  const fwd = ate.getDay() === 0 ? 0 : 7 - ate.getDay();
  ate.setDate(ate.getDate() + fwd);

  return { de: isoLocal(de), ate: isoLocal(ate), ano, mes };
}

export function primeiroUltimoDiaMes(mesRef: string): { de: string; ate: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(mesRef.trim());
  if (!m) return { de: '', ate: '' };
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const ultimo = new Date(ano, mes, 0).getDate();
  return {
    de: `${ano}-${String(mes).padStart(2, '0')}-01`,
    ate: `${ano}-${String(mes).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`,
  };
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type CelulaGrade = {
  data: string;
  noMes: boolean;
  dia: number;
};

export function celulasGradeMes(mesRef: string): CelulaGrade[] {
  const { de, ate, ano, mes } = periodoSemanasCompletas(mesRef);
  const cells: CelulaGrade[] = [];
  const cur = new Date(`${de}T12:00:00`);
  const end = new Date(`${ate}T12:00:00`);
  while (cur <= end) {
    cells.push({
      data: isoLocal(cur),
      noMes: cur.getFullYear() === ano && cur.getMonth() + 1 === mes,
      dia: cur.getDate(),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}
