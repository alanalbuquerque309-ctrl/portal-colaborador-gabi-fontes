import type { ChecklistSecao, ChecklistTemplate, ChecklistTipo, ChecklistTurno } from '@/lib/checklists/types';

/** Checklists Mesquita (PDF png2pdf + rotinas operacionais). Fase piloto: só esta unidade. */
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    tipo: 'gerencia_diaria_mesquita',
    titulo: 'Checklist Diário Gerência',
    descricao: 'Rotina diária da gerência Mesquita (abertura, supervisão e fechamento).',
    turnos: ['manha', 'tarde'],
    papel: 'gerencia',
    exige_unidade_slug: ['mesquita'],
    campos_extras: [
      { id: 'responsavel_abertura', label: 'Responsável abertura', tipo: 'text' },
      { id: 'responsavel_fechamento', label: 'Responsável fechamento', tipo: 'text' },
    ],
    secoes: [
      {
        id: 'abertura_operacao',
        titulo: 'Abertura e operação',
        turno_foco: 'manha',
        itens: [
          { id: 'abrir_loja_0730', label: 'Abrir loja às 07:30h', horario: '07:30' },
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
          { id: 'abertura_caixa_ifood', label: 'Abertura do caixa e iFood às 07:45h', horario: '07:45' },
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
        turno_foco: 'manha',
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
            horario: '14:00',
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
        turno_foco: 'tarde',
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
          { id: 'luzes_externas_18h', label: 'Ligar luzes externas às 18h', horario: '18:00' },
          {
            id: 'checklist_setores',
            label:
              'Conferir checklist dos setores antes de liberar equipe (Estoque, Cozinha, ASG, Balcão, Caixa)',
          },
          { id: 'desligar_servidor', label: 'Desligar servidor ao deixar malote no escritório' },
          { id: 'desligar_luzes', label: 'Conferir e desligar todas as luzes antes de sair' },
          { id: 'ativar_alarme', label: 'Ativar o alarme' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'estoque_diario_mesquita',
    titulo: 'Checklist Diário Estoque',
    descricao: 'Rotina diária do estoque Mesquita (organização, validade e insumos).',
    turnos: ['manha', 'tarde'],
    papel: 'setor',
    exige_unidade_slug: ['mesquita'],
    campos_extras: [
      { id: 'temperatura_geladeira', label: 'Temperatura câmara/geladeira (°C)', tipo: 'text', placeholder: 'Ex.: 4' },
    ],
    secoes: [
      {
        id: 'abertura_estoque',
        titulo: 'Abertura e organização',
        turno_foco: 'manha',
        itens: [
          { id: 'piso_organizado', label: 'Piso seco e corredores desobstruídos' },
          { id: 'validade_conferida', label: 'Validade dos produtos conferida (FIFO)' },
          { id: 'temperatura_registrada', label: 'Temperatura de câmaras registrada na planilha' },
          { id: 'insumos_barra_separados', label: 'Insumos da Barra separados conforme lista do dia' },
          { id: 'etiquetas_ok', label: 'Etiquetas e identificação dos produtos OK' },
        ],
      },
      {
        id: 'fechamento_estoque',
        titulo: 'Fechamento',
        turno_foco: 'tarde',
        itens: [
          { id: 'desperdicio_registrado', label: 'Desperdício do dia registrado e comunicado' },
          { id: 'geladeiras_fechadas', label: 'Câmaras e geladeiras fechadas e organizadas' },
          { id: 'area_externa_estoque', label: 'Área de recebimento limpa e organizada' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'asg_diario_mesquita',
    titulo: 'Checklist Diário ASG',
    descricao: 'Limpeza e apoio ao salão, banheiros e áreas comuns.',
    turnos: ['manha', 'tarde'],
    papel: 'setor',
    exige_unidade_slug: ['mesquita'],
    secoes: [
      {
        id: 'limpeza_manha',
        titulo: 'Limpeza e abastecimento',
        turno_foco: 'manha',
        itens: [
          { id: 'banheiros_abertura', label: 'Banheiros limpos, abastecidos e sem odores' },
          { id: 'salao_piso', label: 'Salão: piso limpo e seco' },
          { id: 'lixeiras', label: 'Lixeiras vazias e com saco novo' },
          { id: 'material_limpeza', label: 'Material de limpeza separado e completo' },
          { id: 'vidros_portas', label: 'Vidros e portas limpos (conforme escala)' },
        ],
      },
      {
        id: 'limpeza_tarde',
        titulo: 'Fechamento ASG',
        turno_foco: 'tarde',
        itens: [
          { id: 'banheiros_fechamento', label: 'Banheiros revisados no fechamento' },
          { id: 'descarte', label: 'Descarte e lixo conforme procedimento' },
          { id: 'ferramentas_guardadas', label: 'Ferramentas guardadas e área de limpeza organizada' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'cozinha_diario_mesquita',
    titulo: 'Checklist Diário Cozinha',
    descricao: 'Rotina do chefe de cozinha (abertura, produção e fechamento).',
    turnos: ['manha', 'tarde'],
    papel: 'setor',
    exige_unidade_slug: ['mesquita'],
    secoes: [
      {
        id: 'abertura_cozinha',
        titulo: 'Abertura da cozinha',
        turno_foco: 'manha',
        itens: [
          { id: 'bancadas_higienizadas', label: 'Bancadas e equipamentos higienizados' },
          { id: 'mise_en_place', label: 'Mise en place do turno separado' },
          { id: 'temperatura_equipamentos', label: 'Temperatura de equipamentos conferida' },
          { id: 'validade_insumos', label: 'Validade de insumos críticos conferida' },
          { id: 'epi_higiene', label: 'EPI e higiene pessoal da equipe OK' },
        ],
      },
      {
        id: 'fechamento_cozinha',
        titulo: 'Fechamento da cozinha',
        turno_foco: 'tarde',
        itens: [
          { id: 'desperdicio_cozinha', label: 'Desperdício registrado e comunicado' },
          { id: 'equipamentos_desligados', label: 'Equipamentos desligados conforme procedimento' },
          { id: 'limpeza_final', label: 'Limpeza final das bancadas e piso' },
          { id: 'gas_conferido', label: 'Gás e válvulas conferidos (quando aplicável)' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'balcao_diario_mesquita',
    titulo: 'Checklist Diário Balcão',
    descricao: 'Abertura e rotina do balcão, vitrines e salão.',
    turnos: ['manha', 'tarde'],
    papel: 'setor',
    exige_unidade_slug: ['mesquita'],
    secoes: [
      {
        id: 'abertura_balcao',
        titulo: 'Abertura balcão e salão',
        turno_foco: 'manha',
        itens: [
          { id: 'bancada_higienizada', label: 'Bancada do balcão higienizada e organizada' },
          { id: 'maquinas_cafe', label: 'Máquinas de café e bebidas testadas e abastecidas' },
          { id: 'vitrines_doces', label: 'Vitrines de doces e salgados organizadas e limpas' },
          { id: 'cardapio_precos', label: 'Cardápio, preços e complementos conferidos' },
          { id: 'salao_layout', label: 'Salão: mesas, cadeiras e itens de mesa alinhados' },
          { id: 'area_externa', label: 'Área externa e fachada limpas (quando aplicável)' },
        ],
      },
      {
        id: 'fechamento_balcao',
        titulo: 'Fechamento balcão',
        turno_foco: 'tarde',
        itens: [
          { id: 'vitrines_fechamento', label: 'Vitrines organizadas e produtos guardados' },
          { id: 'maquinas_limpeza', label: 'Máquinas limpas e desligadas' },
          { id: 'insumos_anotados', label: 'Faltas de insumos anotadas para o dia seguinte' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'caixa_diario_mesquita',
    titulo: 'Checklist Diário Caixa',
    descricao: 'Abertura, operação e fechamento do caixa e PDV.',
    turnos: ['manha', 'tarde'],
    papel: 'setor',
    exige_unidade_slug: ['mesquita'],
    secoes: [
      {
        id: 'abertura_caixa',
        titulo: 'Abertura do caixa',
        turno_foco: 'manha',
        itens: [
          { id: 'abertura_0745', label: 'Caixa e iFood abertos às 07:45h', horario: '07:45' },
          { id: 'fundo_caixa', label: 'Fundo de caixa e troco conferidos' },
          { id: 'pdv_servidor', label: 'PDV e servidor operacionais' },
          { id: 'integracao_ifood', label: 'Integração iFood testada' },
          { id: 'area_caixa_limpa', label: 'Área do caixa limpa e organizada' },
        ],
      },
      {
        id: 'fechamento_caixa',
        titulo: 'Fechamento do caixa',
        turno_foco: 'tarde',
        itens: [
          { id: 'conferencia_pdv', label: 'Conferência do PDV com gerência' },
          { id: 'fechamento_ifood', label: 'iFood fechado conforme procedimento' },
          { id: 'malote_valores', label: 'Malote/valores entregues conforme rotina' },
          { id: 'gaveta_organizada', label: 'Gaveta e área do caixa organizadas para o dia seguinte' },
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

export function secoesVisiveisParaTurno(template: ChecklistTemplate, turno: ChecklistTurno): ChecklistSecao[] {
  return template.secoes.filter((s) => !s.turno_foco || s.turno_foco === turno);
}

export function todosIdsItens(template: ChecklistTemplate): string[] {
  return template.secoes.flatMap((s) => s.itens.map((i) => i.id));
}

export function todosIdsItensTurno(template: ChecklistTemplate, turno: ChecklistTurno): string[] {
  return secoesVisiveisParaTurno(template, turno).flatMap((s) => s.itens.map((i) => i.id));
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
