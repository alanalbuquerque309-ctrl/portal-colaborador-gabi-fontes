import type { SupabaseClient } from '@supabase/supabase-js';
import { semanaVigenteParaGraos } from '@/lib/graos/semana-vigencia';
import { nivelGraosPorTotal } from '@/lib/graos/nivel';

export type GraosLinhaGestao = {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  saldo_confirmado: number;
  saldo_pendente: number;
  graos_semana_ganhos: number;
  nivel: { emoji: string; label: string };
};

function tabelaAusente(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('graos_movimentos') && (m.includes('does not exist') || m.includes('schema cache'));
}

/** Lista resumida para sócio/admin — só colaboradores da operação. */
export async function listarGraosGestao(
  supabase: SupabaseClient,
  semanaInicio: string
): Promise<GraosLinhaGestao[]> {
  const { data: colaboradores, error: errColab } = await supabase
    .from('colaboradores')
    .select('id, nome, setor')
    .eq('role', 'colaborador')
    .order('nome', { ascending: true });

  if (errColab) throw new Error(errColab.message);
  const lista = colaboradores ?? [];
  if (lista.length === 0) return [];

  const ids = lista.map((c) => String(c.id));
  const { data: movs, error: errMov } = await supabase
    .from('graos_movimentos')
    .select('colaborador_id, graos, estado, missao, semana_inicio')
    .in('colaborador_id', ids);

  if (errMov) {
    if (tabelaAusente(errMov.message)) {
      return lista.map((c) => ({
        colaborador_id: String(c.id),
        nome: String(c.nome ?? ''),
        setor: (c as { setor?: string | null }).setor ?? null,
        saldo_confirmado: 0,
        saldo_pendente: 0,
        graos_semana_ganhos: 0,
        nivel: nivelGraosPorTotal(0),
      }));
    }
    throw new Error(errMov.message);
  }

  type Acc = { confirmado: number; pendente: number; total_ganho: number; semana: number };
  const porId = new Map<string, Acc>();

  for (const row of movs ?? []) {
    const semRow = row.semana_inicio ? String(row.semana_inicio) : null;
    if (semRow && !semanaVigenteParaGraos(semRow)) continue;

    const cid = String(row.colaborador_id);
    const acc = porId.get(cid) ?? { confirmado: 0, pendente: 0, total_ganho: 0, semana: 0 };
    const g = Number(row.graos) || 0;
    const est = String(row.estado);
    const missao = String(row.missao ?? '');

    if (est === 'confirmado') {
      acc.confirmado += g;
      if (g > 0 && missao !== 'debito_resgate' && missao !== 'ajuste_rh') {
        acc.total_ganho += g;
      }
    } else if (est === 'pendente' && g > 0 && String(row.semana_inicio) === semanaInicio) {
      acc.pendente += g;
    }

    if (
      g > 0 &&
      String(row.semana_inicio) === semanaInicio &&
      (est === 'confirmado' || est === 'pendente')
    ) {
      acc.semana += g;
    }

    porId.set(cid, acc);
  }

  return lista.map((c) => {
    const cid = String(c.id);
    const acc = porId.get(cid) ?? { confirmado: 0, pendente: 0, total_ganho: 0, semana: 0 };
    return {
      colaborador_id: cid,
      nome: String(c.nome ?? ''),
      setor: (c as { setor?: string | null }).setor ?? null,
      saldo_confirmado: acc.confirmado,
      saldo_pendente: acc.pendente,
      graos_semana_ganhos: acc.semana,
      nivel: nivelGraosPorTotal(acc.total_ganho),
    };
  });
}
