import type { ChecklistTemplate, ChecklistTipo } from '@/lib/checklists/types';

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    tipo: 'abertura_setor',
    titulo: 'Abertura do setor',
    descricao: 'Conferências antes de abrir o setor (limpeza, equipamentos, insumos).',
    turnos: ['manha', 'tarde'],
    campos_extras: [{ id: 'setor', label: 'Setor', tipo: 'text' }],
    secoes: [
      {
        id: 'preparo',
        titulo: 'Preparo e organização',
        itens: [
          { id: 'piso_limpo', label: 'Piso limpo e seco' },
          { id: 'bancadas', label: 'Bancadas higienizadas e organizadas' },
          { id: 'lixeiras', label: 'Lixeiras vazias e com saco' },
          { id: 'equipamentos', label: 'Equipamentos ligados e funcionando' },
          { id: 'insumos', label: 'Insumos do turno separados' },
          { id: 'uniforme_equipe', label: 'Equipe uniformizada no setor' },
        ],
      },
    ],
  },
  {
    tipo: 'abertura_balcao_salao',
    titulo: 'Abertura balcão e salão',
    descricao: 'Checklist de abertura da loja (balcão, salão e área externa).',
    turnos: ['manha', 'tarde'],
    secoes: [
      {
        id: 'limpeza_geral',
        titulo: 'Limpeza geral',
        itens: [
          { id: 'piso', label: 'Piso limpo' },
          { id: 'lixeiras', label: 'Lixeiras vazias' },
          { id: 'mesas_cadeiras', label: 'Mesas e cadeiras limpas e organizadas' },
          { id: 'banheiros', label: 'Banheiros conferidos' },
        ],
      },
      {
        id: 'balcao',
        titulo: 'Balcão e cozinha',
        itens: [
          { id: 'bancada', label: 'Bancada higienizada' },
          { id: 'maquinas', label: 'Máquinas de café / equipamentos OK' },
          { id: 'vitines', label: 'Vitines organizadas e abastecidas' },
          { id: 'cardapio', label: 'Cardápio e preços conferidos' },
        ],
        permite_nota: true,
      },
      {
        id: 'salao',
        titulo: 'Salão',
        itens: [
          { id: 'layout', label: 'Layout do salão conforme padrão' },
          { id: 'som', label: 'Ambiente (som/luz) adequado' },
        ],
        permite_nota: true,
      },
      {
        id: 'externo',
        titulo: 'Área externa',
        itens: [
          { id: 'fachada', label: 'Fachada e entrada limpas' },
          { id: 'calçada', label: 'Calçada / área externa sem obstáculos' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'fechamento_salao',
    titulo: 'Fechamento salão',
    descricao: 'Fechamento do salão (inclui registro de temperatura da geladeira quando aplicável).',
    turnos: ['manha', 'tarde'],
    campos_extras: [
      {
        id: 'temperatura_geladeira',
        label: 'Temperatura geladeira (°C)',
        tipo: 'text',
        placeholder: 'Ex.: 4',
      },
    ],
    secoes: [
      {
        id: 'limpeza',
        titulo: 'Limpeza geral e instalações',
        itens: [
          { id: 'piso', label: 'Piso limpo' },
          { id: 'lixeiras', label: 'Lixeiras tratadas' },
          { id: 'equipamentos_off', label: 'Equipamentos desligados conforme padrão' },
        ],
      },
      {
        id: 'salao',
        titulo: 'Salão de lazer',
        itens: [
          { id: 'mesas', label: 'Mesas e cadeiras limpas e empilhadas' },
          { id: 'decoracao', label: 'Decoração e materiais guardados' },
        ],
        permite_nota: true,
      },
      {
        id: 'externo',
        titulo: 'Área externa',
        itens: [
          { id: 'portas', label: 'Portas e grades conferidas' },
          { id: 'lixo_externo', label: 'Área externa limpa' },
        ],
        permite_nota: true,
      },
    ],
  },
  {
    tipo: 'fechamento_geral',
    titulo: 'Fechamento geral',
    descricao: 'Fechamento completo da unidade (atendimento, balcão, salão e externo).',
    turnos: ['manha', 'tarde'],
    secoes: [
      {
        id: 'atendimento',
        titulo: 'Fechamento geral do atendimento',
        itens: [
          { id: 'caixa', label: 'Caixa / fechamento operacional conferido' },
          { id: 'sistema', label: 'Sistemas e PDV encerrados conforme procedimento' },
        ],
      },
      {
        id: 'balcao',
        titulo: 'Balcão e cozinha',
        itens: [
          { id: 'limpeza_balcao', label: 'Balcão e cozinha limpos' },
          { id: 'alimentos', label: 'Alimentos armazenados corretamente' },
          { id: 'equipamentos', label: 'Equipamentos desligados' },
        ],
        permite_nota: true,
      },
      {
        id: 'salao',
        titulo: 'Salão',
        itens: [
          { id: 'mesas', label: 'Mesas e cadeiras organizadas' },
          { id: 'piso_salao', label: 'Piso do salão limpo' },
        ],
        permite_nota: true,
      },
      {
        id: 'externo',
        titulo: 'Área externa',
        itens: [
          { id: 'fechamento_portas', label: 'Portas e acessos conferidos' },
          { id: 'iluminacao', label: 'Iluminação externa conforme padrão' },
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
