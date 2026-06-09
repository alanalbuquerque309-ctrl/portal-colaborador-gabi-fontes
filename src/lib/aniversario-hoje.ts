import type { createAdminClient } from '@/lib/supabase/admin';
import { aniversarioNoDia, dataCivilBr } from '@/lib/data-civil-br';
import { podeVerBalaoAniversario, isAniversarioBalaoRedeAtivo, isAniversarioBalaoPreviewAtivo } from '@/lib/aniversario-balao-access';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type AniversarianteHoje = {
  id: string;
  nome: string;
  primeiro_nome: string;
  foto_url: string | null;
  unidade_nome: string;
  parabens_count: number;
};

export type EstadoAniversarioHoje = {
  ok: true;
  pode_ver_feature: boolean;
  preview_ativo: boolean;
  rede_ativa: boolean;
  data_ref: string;
  aniversariantes: AniversarianteHoje[];
  sou_aniversariante: boolean;
  meus_parabens_count: number;
  ja_dispensou_hoje: boolean;
  parabenizados_ids: string[];
  pendentes_ids: string[];
  mostrar_balao: boolean;
  mostrar_faixa: boolean;
  parabenizou_algum: boolean;
};

export function primeiroNome(nome: string): string {
  const p = String(nome ?? '')
    .trim()
    .split(/\s+/)[0];
  return p || String(nome ?? '').trim() || 'Colega';
}

function tabelaAniversarioAusente(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    msg.includes('aniversario_dia_acao') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

async function contarParabensPorAlvo(
  supabase: SupabaseAdmin,
  ids: string[],
  dataRef: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from('aniversario_dia_acao')
    .select('para_colaborador_id')
    .eq('data_ref', dataRef)
    .eq('acao', 'parabens')
    .in('para_colaborador_id', ids);

  if (error) {
    if (tabelaAniversarioAusente(error)) return map;
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const id = String(row.para_colaborador_id ?? '');
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function carregarEstadoAniversarioHoje(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  nomeColaborador: string | null,
  roleColaborador: string | null = null
): Promise<EstadoAniversarioHoje> {
  const dataRef = dataCivilBr();
  const redeAtiva = isAniversarioBalaoRedeAtivo();
  const previewAtivo = isAniversarioBalaoPreviewAtivo();
  const podeVer = podeVerBalaoAniversario({
    colaboradorId,
    nome: nomeColaborador,
    role: roleColaborador,
  });

  const baseVazio: EstadoAniversarioHoje = {
    ok: true,
    pode_ver_feature: podeVer,
    preview_ativo: previewAtivo,
    rede_ativa: redeAtiva,
    data_ref: dataRef,
    aniversariantes: [],
    sou_aniversariante: false,
    meus_parabens_count: 0,
    ja_dispensou_hoje: false,
    parabenizados_ids: [],
    pendentes_ids: [],
    mostrar_balao: false,
    mostrar_faixa: false,
    parabenizou_algum: false,
  };

  if (!podeVer) return baseVazio;

  const { data: colaboradores, error: errColab } = await supabase
    .from('colaboradores')
    .select('id, nome, data_nascimento, foto_url, unidades(nome)')
    .not('data_nascimento', 'is', null);

  if (errColab) throw new Error(errColab.message);

  const todos = colaboradores ?? [];
  const doDia = todos.filter((c: { data_nascimento: string | null }) =>
    aniversarioNoDia(c.data_nascimento)
  );

  const idsDia = doDia.map((c: { id: string }) => c.id);
  const contagem = await contarParabensPorAlvo(supabase, idsDia, dataRef);

  const aniversariantes: AniversarianteHoje[] = doDia
    .map((c: Record<string, unknown>) => {
      const un = c.unidades;
      const nomeUnidade = Array.isArray(un)
        ? (un[0] as { nome?: string })?.nome
        : (un as { nome?: string })?.nome;
      const nome = String(c.nome ?? '');
      return {
        id: String(c.id),
        nome,
        primeiro_nome: primeiroNome(nome),
        foto_url: (c.foto_url as string | null) ?? null,
        unidade_nome: nomeUnidade ?? '',
        parabens_count: contagem.get(String(c.id)) ?? 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const souAniversariante = aniversariantes.some((a) => a.id === colaboradorId);
  const meusParabens = contagem.get(colaboradorId) ?? 0;

  const { data: acoes, error: errAcoes } = await supabase
    .from('aniversario_dia_acao')
    .select('acao, para_colaborador_id')
    .eq('colaborador_id', colaboradorId)
    .eq('data_ref', dataRef);

  if (errAcoes) {
    if (!tabelaAniversarioAusente(errAcoes)) throw new Error(errAcoes.message);
  }

  const jaDispensou = (acoes ?? []).some((a) => a.acao === 'dispensar');
  const parabenizadosIds = (acoes ?? [])
    .filter((a) => a.acao === 'parabens' && a.para_colaborador_id)
    .map((a) => String(a.para_colaborador_id));
  const parabenizouAlgum = parabenizadosIds.length > 0;

  const outrosHoje = aniversariantes.filter((a) => a.id !== colaboradorId);
  const pendentesIds = outrosHoje
    .filter((a) => !parabenizadosIds.includes(a.id))
    .map((a) => a.id);

  const temConteudo = aniversariantes.length > 0;
  const mostrarBalaoColega = !jaDispensou && pendentesIds.length > 0;
  const mostrarBalaoAniversariante = souAniversariante && !jaDispensou && pendentesIds.length === 0;
  const mostrarBalao = temConteudo && (mostrarBalaoColega || mostrarBalaoAniversariante);

  const mostrarFaixaFinal =
    temConteudo &&
    !souAniversariante &&
    outrosHoje.length > 0 &&
    (jaDispensou || parabenizouAlgum);

  return {
    ok: true,
    pode_ver_feature: true,
    preview_ativo: previewAtivo,
    rede_ativa: redeAtiva,
    data_ref: dataRef,
    aniversariantes,
    sou_aniversariante: souAniversariante,
    meus_parabens_count: meusParabens,
    ja_dispensou_hoje: jaDispensou,
    parabenizados_ids: parabenizadosIds,
    pendentes_ids: pendentesIds,
    mostrar_balao: mostrarBalao,
    mostrar_faixa: mostrarFaixaFinal,
    parabenizou_algum: parabenizouAlgum,
  };
}
