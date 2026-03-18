# Portal do Colaborador - Gabi Fontes

Portal de Cultura e Comunicação Interna. Next.js, Tailwind, Supabase. Estilo Premium/Cafeteria.

## Estrutura de pastas

```
Portal do Colaborador - Gabi Fontes/
├── src/
│   ├── app/                      # Rotas (App Router)
│   │   ├── (auth)/               # Grupo: autenticação
│   │   │   ├── login/
│   │   │   ├── onboarding/       # Fluxo de onboarding
│   │   │   └── layout.tsx
│   │   ├── (portal)/             # Grupo: área logada
│   │   │   ├── portal/
│   │   │   │   ├── mural/        # Mural da Unidade
│   │   │   │   ├── perdas/       # Relato de Perdas
│   │   │   │   ├── aniversariantes/ # Mural da Família
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                   # Componentes base (Button, Input...)
│   │   ├── layout/               # Header, Sidebar, Footer
│   │   ├── auth/                 # Formulário de login
│   │   ├── onboarding/           # Etapas do onboarding
│   │   ├── mural/                # Cards de avisos
│   │   ├── perdas/               # Formulário de relato
│   │   └── aniversariantes/      # Lista de aniversariantes
│   ├── lib/
│   │   └── supabase/             # Cliente Supabase (client + server)
│   ├── hooks/                    # Hooks customizados
│   └── types/                    # Tipos TypeScript
├── supabase/
│   └── migrations/               # SQL de schema
├── public/                        # Assets estáticos
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## Configuração

1. Copie `.env.local.example` para `.env.local`
2. Preencha as variáveis do Supabase
3. Execute as migrations no Supabase Dashboard

## Scripts

```bash
npm install
npm run dev
```

## Funcionalidades

- **Login por CPF**: Primeiro acesso redireciona para Onboarding
- **Onboarding**: Manual do Colaborador + Termo de Compromisso
- **Mural da Unidade**: Avisos da loja do colaborador
- **Relato de Perdas**: Item, motivo, foto (apenas registro)
- **Mural da Família**: Aniversariantes do mês de todas as unidades

**Privacidade**: Colaborador acessa apenas dados da sua unidade (Mesquita, Barra ou Nova Iguaçu).
