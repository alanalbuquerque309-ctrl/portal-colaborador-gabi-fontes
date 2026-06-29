import type { createAdminClient } from '@/lib/supabase/admin';
import {
  labelPublicoAviso,
  resolverPublicoAviso,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';
import {
  montarAudienciaTreinamento,
  type PessoaAudiencia,
  type ResumoAudienciaComunicacao,
} from '@/lib/audiencia-comunicacao';
import { resolverParTreinosQuinta } from '@/lib/graos/quinta-treino';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { deveVerTreinoLiderancaPortal, normalizePortalRole } from '@/lib/roles';
import { treinoLiderVideoIdAtual } from '@/lib/treino-lider-acompanhamento';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type ItemAcompanhamentoTreinamento = {
  id: string;
  titulo: string;
  origem: 'cadastro' | 'automatico';
  formato: 'video' | 'texto';
  publico_label: string;
  exige_confirmacao: boolean;
  total_esperado: number;
  assistiram: PessoaAudiencia[];
  nao_assistiram: PessoaAudiencia[];
  visualizou_sem_confirmar: PessoaAudiencia[];
};

function classificarListas(
  resumo: ResumoAudienciaComunicacao,
  exige_confirmacao: boolean
): Pick<ItemAcompanhamentoTreinamento, 'assistiram' | 'nao_assistiram' | 'visualizou_sem_confirmar'> {
  if (exige_confirmacao) {
    return {
      assistiram: resumo.confirmados,
      visualizou_sem_confirmar: resumo.abriu_nao_confirmou,
      nao_assistiram: resumo.nao_fez,
    };
  }
  return {
    assistiram: [...resumo.confirmados, ...resumo.abriu_nao_confirmou],
    visualizou_sem_confirmar: [],
    nao_assistiram: resumo.nao_fez,
  };
}

type ColabBase = PessoaAudiencia & {
  role: string;
};

async function listarColaboradoresBase(supabase: SupabaseAdmin): Promise<ColabBase[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, setor, role, unidades(nome, slug)')
    .neq('role', 'admin')
    .order('nome');

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => {
    const un = c.unidades as { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
    const u = Array.isArray(un) ? un[0] : un;
    return {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      setor: (c.setor as string | null) ?? null,
      unidade_nome: u?.nome ? String(u.nome) : null,
      visualizado_em: null,
      confirmado_em: null,
      role: normalizePortalRole(c.role as string | null),
    };
  });
}

async function montarAudienciaTreinoLider(supabase: SupabaseAdmin): Promise<ItemAcompanhamentoTreinamento | null> {
  const videoId = treinoLiderVideoIdAtual();
  const par = resolverParTreinosQuinta(undefined);
  if (!videoId || !par.lider.embed_url) return null;

  const base = await listarColaboradoresBase(supabase);
  const esperados: ColabBase[] = [];

  for (const p of base) {
    const podeAvaliacao = await podeUsarAvaliacaoEquipeSemanal(supabase, p.id, p.role);
    if (deveVerTreinoLiderancaPortal(p.role, podeAvaliacao)) {
      esperados.push(p);
    }
  }

  const ids = esperados.map((p) => p.id);
  const confMap = new Map<string, string>();

  if (ids.length > 0) {
    const { data: conf } = await supabase
      .from('treino_lider_conclusoes')
      .select('colaborador_id, concluido_em')
      .eq('video_youtube_id', videoId)
      .in('colaborador_id', ids);

    for (const row of conf ?? []) {
      confMap.set(String(row.colaborador_id), String(row.concluido_em ?? ''));
    }
  }

  const confirmados: PessoaAudiencia[] = [];
  const nao_fez: PessoaAudiencia[] = [];

  for (const p of esperados) {
    const confirmado_em = confMap.get(p.id) ?? null;
    const row = { ...p, visualizado_em: confirmado_em, confirmado_em };
    if (confirmado_em) confirmados.push(row);
    else nao_fez.push(row);
  }

  const byNome = (a: PessoaAudiencia, b: PessoaAudiencia) => a.nome.localeCompare(b.nome, 'pt-BR');
  confirmados.sort(byNome);
  nao_fez.sort(byNome);

  const resumo: ResumoAudienciaComunicacao = {
    total_esperado: esperados.length,
    confirmados,
    abriu_nao_confirmou: [],
    nao_fez,
  };

  return {
    id: 'quinta-lider',
    titulo: par.lider.titulo,
    origem: 'automatico',
    formato: 'video',
    publico_label: 'Liderança',
    exige_confirmacao: true,
    total_esperado: resumo.total_esperado,
    ...classificarListas(resumo, true),
  };
}

export function chaveTreinoAutomaticoColaborador(videoId: string): string {
  return `quinta-colaborador:${videoId}`;
}

async function montarAudienciaTreinoColaboradorQuinta(
  supabase: SupabaseAdmin
): Promise<ItemAcompanhamentoTreinamento | null> {
  const par = resolverParTreinosQuinta(undefined);
  const videoId = par.colaborador.youtube_video_id;
  if (!videoId || !par.colaborador.embed_url) return null;

  const chave = chaveTreinoAutomaticoColaborador(videoId);
  const base = await listarColaboradoresBase(supabase);
  const esperados = base.filter((p) => normalizePortalRole(p.role) === 'colaborador');
  const ids = esperados.map((p) => p.id);

  const visualMap = new Map<string, string>();
  const confMap = new Map<string, string>();

  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from('treinamento_automatico_registros')
      .select('colaborador_id, visualizado_em, confirmado_em')
      .eq('treino_chave', chave)
      .in('colaborador_id', ids);

    for (const row of rows ?? []) {
      const cid = String(row.colaborador_id);
      if (row.visualizado_em) visualMap.set(cid, String(row.visualizado_em));
      if (row.confirmado_em) confMap.set(cid, String(row.confirmado_em));
    }
  }

  const confirmados: PessoaAudiencia[] = [];
  const abriu_nao_confirmou: PessoaAudiencia[] = [];
  const nao_fez: PessoaAudiencia[] = [];

  for (const p of esperados) {
    const visualizado_em = visualMap.get(p.id) ?? null;
    const confirmado_em = confMap.get(p.id) ?? null;
    const row = { ...p, visualizado_em, confirmado_em };
    if (confirmado_em || visualizado_em) confirmados.push(row);
    else nao_fez.push(row);
  }

  const byNome = (a: PessoaAudiencia, b: PessoaAudiencia) => a.nome.localeCompare(b.nome, 'pt-BR');
  confirmados.sort(byNome);
  abriu_nao_confirmou.sort(byNome);
  nao_fez.sort(byNome);

  const resumo: ResumoAudienciaComunicacao = {
    total_esperado: esperados.length,
    confirmados,
    abriu_nao_confirmou,
    nao_fez,
  };

  return {
    id: 'quinta-colaborador',
    titulo: par.colaborador.titulo,
    origem: 'automatico',
    formato: 'video',
    publico_label: 'Colaboradores',
    exige_confirmacao: false,
    total_esperado: resumo.total_esperado,
    ...classificarListas(resumo, false),
  };
}

export async function montarAcompanhamentoTreinamentos(
  supabase: SupabaseAdmin
): Promise<ItemAcompanhamentoTreinamento[]> {
  const itens: ItemAcompanhamentoTreinamento[] = [];

  const { data: rows, error } = await supabase
    .from('treinamentos')
    .select('id, titulo, tipo_conteudo, publico_alvo, exige_confirmacao, unidades:unidade_id(slug)')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false });

  if (!error) {
    for (const row of rows ?? []) {
      const id = String(row.id);
      const audiencia = await montarAudienciaTreinamento(supabase, id);
      const unidade = row.unidades as { slug?: string } | null;
      const publico = resolverPublicoAviso(row.publico_alvo as string | null, unidade?.slug ?? null);
      const tipo = String((row as { tipo_conteudo?: string }).tipo_conteudo ?? 'video');
      const formato: 'video' | 'texto' = tipo === 'texto' ? 'texto' : 'video';

      itens.push({
        id,
        titulo: String(row.titulo ?? audiencia.titulo),
        origem: 'cadastro',
        formato,
        publico_label: labelPublicoAviso(publico as PublicoAvisoKey),
        exige_confirmacao: audiencia.exige_confirmacao,
        total_esperado: audiencia.total_esperado,
        ...classificarListas(audiencia, audiencia.exige_confirmacao),
      });
    }
  }

  const quintaColab = await montarAudienciaTreinoColaboradorQuinta(supabase);
  if (quintaColab) itens.push(quintaColab);

  const quintaLider = await montarAudienciaTreinoLider(supabase);
  if (quintaLider) itens.push(quintaLider);

  return itens;
}

export async function registrarVisualizacaoTreinoAutomatico(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  treinoChave: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const agora = new Date().toISOString();
  const { error } = await supabase.from('treinamento_automatico_registros').upsert(
    {
      treino_chave: treinoChave,
      colaborador_id: colaboradorId,
      visualizado_em: agora,
    },
    { onConflict: 'treino_chave,colaborador_id' }
  );

  if (error) {
    if (/treinamento_automatico_registros|does not exist|schema cache/i.test(error.message)) {
      return { ok: false, erro: 'Tabela de acompanhamento ainda não existe — aplique a migration 064.' };
    }
    return { ok: false, erro: error.message };
  }

  return { ok: true };
}
