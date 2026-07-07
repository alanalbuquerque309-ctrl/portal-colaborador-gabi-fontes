import type { ChecklistTemplate, ChecklistTipo } from '@/lib/checklists/types';

/** Checklist Diário Gerência — Mesquita (PDF png2pdf, págs. 3–4). Fase piloto: só esta unidade. */
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    tipo: 'gerencia_diaria_mesquita',
    titulo: 'Checklist Diário Gerência',
    descricao: 'Rotina diária da gerência Mesquita (abertura, supervisão e fechamento).',
    turnos: ['manha', 'tarde'],
    exige_unidade_slug: ['mesquita'],
    campos_extras: [
      { id: 'responsavel_abertura', label: 'Responsável abertura', tipo: 'text' },
      { id: 'responsavel_fechamento', label: 'Responsável fechamento', tipo: 'text' },
    ],
    secoes: [
      {
        id: 'abertura_operacao',
        titulo: 'Abertura e operação',
        itens: [
          { id: 'abrir_loja_0730', label: 'Abrir loja às 07:30h' },
          { id: 'ligar_servidor', label: 'Ligar o servidor no escritório' },
          {
            id: 'chegada_funcionarios',
            label:
              'Acompanhar chegada dos funcionários; falta, atraso ou atestado → comunicar no grupo ESCALA',
          },
          {
            id: 'organizacao_salao',
            label:
              'Supervisionar mesas e cadeiras do salão: mesas limpas, cadeiras alinhadas, vaso, açucareiro, porta-guardanapo e número',
          },
          { id: 'abertura_caixa_ifood', label: 'Abertura do caixa e iFood às 07:45h' },
          {
            id: 'entrega_radios',
            label:
              'Entregar rádios carregados testando na presença (Atendimento, Balcão, Caixa, Recepção, Cozinha Doce/Salgada, ADM, Gerência)',
          },
          {
            id: 'reservas_dia',
            label: 'Verificar reservas do dia e alinhar atendente responsável por cada uma',
          },
          {
            id: 'celular_delivery',
            label: 'Acompanhar celular do delivery e itens pausados/despausados',
          },
          {
            id: 'limpeza_balcao_frente',
            label:
              'Supervisionar limpeza dos balcões de frente (mármore, vitrine doces/salgados, caixa)',
          },
          {
            id: 'qualidade_doces_validade',
            label: 'Conferir qualidade dos doces e validade; pedir ajuste se necessário',
          },
          {
            id: 'briefing_sexta',
            label: 'Sexta-feira: briefing com os setores (conforme disponibilidade)',
          },
        ],
      },
      {
        id: 'supervisao_recorrente',
        titulo: 'Supervisão diária e recorrente',
        itens: [
          {
            id: 'insumos_barra',
            label: 'Conferência da lista de insumos da Barra com estoquista e motorista',
          },
          {
            id: 'vistoria_salao_banheiros',
            label: 'Vistoria diária do salão e banheiros; ASG abastece se necessário',
          },
          {
            id: 'limpeza_acucareiros',
            label: 'Segundas e quintas: supervisionar limpeza dos açucareiros',
          },
          {
            id: 'limpeza_baixo_balcao',
            label: 'Segundas: supervisionar limpeza embaixo dos balcões/vitrines',
          },
          {
            id: 'lavagem_cozinhas',
            label: 'Segundas: supervisionar lavagem das cozinhas (preferencialmente 14h)',
          },
          {
            id: 'limpeza_estoque_quinta',
            label: 'Quintas: supervisionar limpeza e organização do estoque',
          },
          {
            id: 'contagem_talheres',
            label: 'Quartas: contagem de talheres e louças → ADM alimenta planilha Excel',
          },
          {
            id: 'limpeza_vidros_14h',
            label:
              'Diariamente 14h: limpeza de vidros e portas (3 entradas, reservados, colunas catraca)',
          },
          {
            id: 'lavagem_entrada_quinta',
            label: 'Quintas: supervisionar lavagem da entrada principal e área externa',
          },
          {
            id: 'insumos_balcao_doce',
            label:
              'Diário: conferir insumos do balcão do doce vs. vendas do dia anterior; anotar faltas',
          },
        ],
        permite_nota: true,
      },
      {
        id: 'fechamento_controles',
        titulo: 'Fechamento e controles finais',
        itens: [
          {
            id: 'camara_dia_24',
            label: '1× ao mês: limpeza da câmara frigorífica (dia 24)',
          },
          {
            id: 'recolher_radios',
            label: 'Recolher rádios ao final do expediente testando na presença dos funcionários',
          },
          { id: 'foto_cafe_conecta', label: 'Quarta: enviar foto do Café Conecta' },
          {
            id: 'planilha_desperdicio',
            label: 'Diário: enviar planilha de desperdício de cada setor no grupo de supervisão',
          },
          { id: 'verificar_gas', label: 'Quarta: verificar gás das cozinhas' },
          {
            id: 'janelas_andar_superior',
            label: 'A cada 10 dias: limpeza janelas andar superior (dias 10, 20 e 30)',
          },
          {
            id: 'planilha_temperatura',
            label: 'Verificar/solicitar planilha de temperatura de geladeiras e balcões (todos setores)',
          },
          { id: 'luzes_externas_18h', label: 'Ligar luzes externas às 18h' },
          {
            id: 'checklist_setores',
            label: 'Conferir checklist dos setores antes de liberar equipe (Estoque, Cozinha, ASG etc.)',
          },
          { id: 'desligar_servidor', label: 'Desligar servidor ao deixar malote no escritório' },
          { id: 'desligar_luzes', label: 'Conferir e desligar todas as luzes antes de sair' },
          { id: 'ativar_alarme', label: 'Ativar o alarme' },
        ],
        permite_nota: true,
      },
    ],
  },
];

export function templateChecklistPorTipo(tipo: string): ChecklistTemplate | null {
  return CHECKLIST_TEMPLATES.find((t) => t.tipo === tipo) ?? null;
}

export function tiposChecklistValidos(): ChecklistTipo[] {
  return CHECKLIST_TEMPLATES.map((t) => t.tipo);
}

export function templateVisivelParaUnidade(
  template: ChecklistTemplate,
  unidadeSlug: string | null | undefined
): boolean {
  if (!template.exige_unidade_slug?.length) return true;
  if (!unidadeSlug) return false;
  return template.exige_unidade_slug.includes(unidadeSlug);
}

export function todosIdsItens(template: ChecklistTemplate): string[] {
  return template.secoes.flatMap((s) => s.itens.map((i) => i.id));
}

export function filtrarTemplatesPorUnidade(unidadeSlug: string | null | undefined): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter((t) => templateVisivelParaUnidade(t, unidadeSlug));
}

export function slugsUnidadesComChecklist(): string[] {
  const slugs = new Set<string>();
  for (const t of CHECKLIST_TEMPLATES) {
    if (t.exige_unidade_slug?.length) {
      for (const s of t.exige_unidade_slug) slugs.add(s);
    }
  }
  return Array.from(slugs);
}
