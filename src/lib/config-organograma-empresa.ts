/**
 * Estrutura de organograma da empresa (modelo Alan — jun/2026).
 * Funções/cargos em árvore; nomes vêm do cadastro quando há match por cargo/setor.
 */

export type AreaOrganogramaId =
  | 'cozinha'
  | 'fabrica_prep'
  | 'fabrica_doce'
  | 'financeiro'
  | 'marketing'
  | 'delivery'
  | 'administrativo'
  | 'comercial'
  | 'atendimento'
  | 'manutencao'
  | 'rh';

export type NoOrganogramaConfig = {
  id: string;
  titulo: string;
  area: AreaOrganogramaId;
  /** Palavras-chave para cruzar com `cargo` ou `setor` no cadastro. */
  match?: { cargos?: string[]; setores?: string[] };
  filhos?: NoOrganogramaConfig[];
};

export const ESTILO_AREA: Record<
  AreaOrganogramaId,
  { label: string; box: string; legenda: string }
> = {
  cozinha: {
    label: 'Cozinha',
    box: 'bg-amber-100 border-amber-500 text-amber-950',
    legenda: 'Cozinha loja — copeiro, auxiliar, fiscal de produção',
  },
  fabrica_prep: {
    label: 'Fábrica de Prep',
    box: 'bg-sky-100 border-sky-500 text-sky-950',
    legenda: 'Fábrica de preparos — auxiliar, fiscal de produção',
  },
  fabrica_doce: {
    label: 'Fábrica de Doce',
    box: 'bg-stone-200 border-stone-500 text-stone-900',
    legenda: 'Fábrica de doces — chefe, confeiteiro, auxiliar',
  },
  financeiro: {
    label: 'Financeiro',
    box: 'bg-blue-900 border-blue-950 text-blue-50',
    legenda: 'ADM/Financeiro — direção e gestão',
  },
  marketing: {
    label: 'Marketing',
    box: 'bg-red-100 border-red-500 text-red-950',
    legenda: 'Marketing',
  },
  delivery: {
    label: 'Delivery',
    box: 'bg-orange-50 border-orange-300 text-orange-950',
    legenda: 'Delivery / iFood',
  },
  administrativo: {
    label: 'Administrativo',
    box: 'bg-emerald-100 border-emerald-600 text-emerald-950',
    legenda: 'Escritório, CD, motorista',
  },
  comercial: {
    label: 'Comercial',
    box: 'bg-pink-100 border-pink-500 text-pink-950',
    legenda: 'Comercial',
  },
  atendimento: {
    label: 'Atendimento',
    box: 'bg-orange-200 border-orange-500 text-orange-950',
    legenda: 'Salão — balconista, caixa, barista, ASG…',
  },
  manutencao: {
    label: 'Manutenção',
    box: 'bg-yellow-200 border-yellow-500 text-yellow-950',
    legenda: 'Manutenção predial e equipamentos',
  },
  rh: {
    label: 'RH',
    box: 'bg-amber-50 border-amber-400 text-amber-950',
    legenda: 'Recursos humanos',
  },
};

/** Pilares horizontais (esquerda → direita), como no desenho da empresa. */
export const PILARES_ORGANOGRAMA_EMPRESA: { id: string; tituloPilar?: string; raiz: NoOrganogramaConfig }[] =
  [
    {
      id: 'alimentos',
      tituloPilar: 'Alimentos',
      raiz: {
        id: 'dir-alimentos',
        titulo: 'Diretor de Alimentos',
        area: 'cozinha',
        match: { cargos: ['diretor', 'gerente'], setores: ['Cozinha loja', 'Fábrica de preparos'] },
        filhos: [
          {
            id: 'coz-fiscal',
            titulo: 'Fiscal de produção',
            area: 'cozinha',
            match: { setores: ['Cozinha loja'], cargos: ['fiscal', 'gerente'] },
            filhos: [
              {
                id: 'coz-aux',
                titulo: 'Auxiliar de cozinha',
                area: 'cozinha',
                match: { setores: ['Cozinha loja'], cargos: ['auxiliar', 'cozinha'] },
              },
            ],
          },
          {
            id: 'prep-fiscal',
            titulo: 'Fiscal de produção',
            area: 'fabrica_prep',
            match: { setores: ['Fábrica de preparos'], cargos: ['fiscal'] },
            filhos: [
              {
                id: 'prep-aux',
                titulo: 'Auxiliar de cozinha',
                area: 'fabrica_prep',
                match: { setores: ['Fábrica de preparos'], cargos: ['auxiliar'] },
              },
            ],
          },
          {
            id: 'doce-chefe',
            titulo: 'Chefe de confeitaria',
            area: 'fabrica_doce',
            match: { setores: ['Fábrica de doces'], cargos: ['chefe', 'gerente', 'sabrina'] },
            filhos: [
              {
                id: 'doce-conf',
                titulo: 'Confeiteiro',
                area: 'fabrica_doce',
                match: { setores: ['Fábrica de doces'], cargos: ['confeiteiro', 'henrique'] },
                filhos: [
                  {
                    id: 'doce-aux',
                    titulo: 'Auxiliar de cozinha',
                    area: 'fabrica_doce',
                    match: { setores: ['Fábrica de doces'], cargos: ['auxiliar'] },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'comercial',
      raiz: {
        id: 'comercial-staff',
        titulo: 'Comercial',
        area: 'comercial',
        match: { setores: ['Comercial', 'Marketing'] },
      },
    },
    {
      id: 'marketing',
      raiz: {
        id: 'marketing-staff',
        titulo: 'Marketing',
        area: 'marketing',
        match: { setores: ['Marketing'] },
      },
    },
    {
      id: 'atendimento',
      tituloPilar: 'Atendimento',
      raiz: {
        id: 'ger-atendimento',
        titulo: 'Gerente de Atendimento',
        area: 'atendimento',
        match: { setores: ['Atendimento', 'Caixa'], cargos: ['gerente'] },
        filhos: [
          {
            id: 'sup-atendimento',
            titulo: 'Supervisor de Atendimento',
            area: 'atendimento',
            match: { setores: ['Atendimento'], cargos: ['supervisor', 'gerente'] },
            filhos: [
              {
                id: 'balconista',
                titulo: 'Balconista',
                area: 'atendimento',
                match: { cargos: ['balconista', 'atendimento'] },
                filhos: [
                  {
                    id: 'copeiro',
                    titulo: 'Copeiro',
                    area: 'atendimento',
                    match: { setores: ['Copa'], cargos: ['copeiro', 'copa'] },
                  },
                ],
              },
              { id: 'caixa', titulo: 'Caixa', area: 'atendimento', match: { setores: ['Caixa'] } },
              {
                id: 'barista',
                titulo: 'Barista',
                area: 'atendimento',
                match: { cargos: ['barista'] },
                filhos: [
                  { id: 'cumim', titulo: 'Cumim', area: 'atendimento', match: { cargos: ['cumim', 'garçom'] } },
                ],
              },
              {
                id: 'atendente',
                titulo: 'Atendente',
                area: 'atendimento',
                match: { setores: ['Atendimento'], cargos: ['atendente'] },
              },
              {
                id: 'recepcionista',
                titulo: 'Recepcionista',
                area: 'atendimento',
                match: { cargos: ['recepcionista'] },
              },
            ],
          },
          {
            id: 'fiscal-ifood',
            titulo: 'Fiscal do iFood',
            area: 'delivery',
            match: { cargos: ['ifood', 'delivery'] },
          },
          {
            id: 'asg',
            titulo: 'ASG',
            area: 'atendimento',
            match: { setores: ['ASG'] },
          },
        ],
      },
    },
    {
      id: 'manutencao',
      raiz: {
        id: 'dir-manutencao',
        titulo: 'Diretor Manutenção',
        area: 'manutencao',
        filhos: [
          {
            id: 'ger-manutencao',
            titulo: 'Gerente de Manutenção',
            area: 'manutencao',
            match: { cargos: ['manutenção', 'manutencao'] },
          },
        ],
      },
    },
    {
      id: 'adm-financeiro',
      tituloPilar: 'ADM / Financeiro',
      raiz: {
        id: 'dir-adm',
        titulo: 'Diretor ADM/Financeiro',
        area: 'financeiro',
        match: { setores: ['Administração', 'Escritório'], cargos: ['diretor', 'administrador', 'daniel'] },
        filhos: [
          {
            id: 'ger-adm',
            titulo: 'Gerente ADM/Financeiro',
            area: 'administrativo',
            match: { setores: ['Administração', 'Escritório'], cargos: ['gerente', 'administrador'] },
            filhos: [
              {
                id: 'ass-adm',
                titulo: 'Assistente ADM/Financeiro',
                area: 'administrativo',
                match: { setores: ['Escritório', 'Administração'], cargos: ['assistente'] },
                filhos: [
                  {
                    id: 'aux-adm',
                    titulo: 'Auxiliar administrativo',
                    area: 'administrativo',
                    match: { setores: ['Escritório'], cargos: ['auxiliar', 'administrativo'] },
                  },
                ],
              },
              {
                id: 'enc-estoque',
                titulo: 'Encarregado de estoque',
                area: 'administrativo',
                match: { setores: ['CD'], cargos: ['encarregado', 'estoquista', 'cd'] },
                filhos: [
                  {
                    id: 'estoquista',
                    titulo: 'Estoquista',
                    area: 'administrativo',
                    match: { setores: ['CD'], cargos: ['estoquista'] },
                    filhos: [
                      {
                        id: 'motorista',
                        titulo: 'Motorista',
                        area: 'administrativo',
                        match: { setores: ['Motorista'], cargos: ['motorista'] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'rh',
      tituloPilar: 'RH',
      raiz: {
        id: 'dir-rh',
        titulo: 'Diretor de RH',
        area: 'rh',
        match: { setores: ['RH'], cargos: ['diretor', 'keila', 'gabriela'] },
        filhos: [
          {
            id: 'ger-rh',
            titulo: 'Gerente de RH',
            area: 'rh',
            match: { setores: ['RH'], cargos: ['gerente', 'rh'] },
            filhos: [
              {
                id: 'ass-rh',
                titulo: 'Assistente de RH',
                area: 'rh',
                match: { setores: ['RH'], cargos: ['assistente'] },
                filhos: [
                  {
                    id: 'aux-rh',
                    titulo: 'Auxiliar de RH',
                    area: 'rh',
                    match: { setores: ['RH'], cargos: ['auxiliar'] },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ];
