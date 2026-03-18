# Análise Técnica: Segurança e Novas Funcionalidades

## 1. Controle de Acesso (Admin vs Colaborador)

### Estado Atual

| Aspecto | Situação | Observação |
|---------|----------|------------|
| **Admin** | Autenticação por **senha** (`ADMIN_PASSWORD`) | Cookie `admin_session` (8h). Não usa `role` no banco. |
| **Colaborador** | Autenticação por **CPF** | Cookie `portal_colaborador_id` + `portal_unidade_id`. Tabela `colaboradores` **não possui** coluna `role`. |

⚠️ **Lacuna:** Não há `role` em `colaboradores`. A distinção Admin vs Colaborador hoje é feita por rotas separadas (/admin com senha vs /portal com CPF).

### Páginas e Botões Exclusivos do Admin (atual)

| Rota | Página | Ações exclusivas |
|------|--------|------------------|
| `/admin` | Login administrativo | Digitar senha e acessar |
| `/admin/dashboard` | Dashboard | Ver estatísticas (total colaboradores, pendentes onboarding) |
| `/admin/colaboradores` | Cadastro de equipe | **Criar** e **editar** colaboradores |
| `/admin/avisos` | Avisos do mural | **Criar**, **editar** e **excluir** avisos |
| `/admin/perdas` | Relatos de perdas | **Consultar** relatos (apenas leitura gerencial) |

**Proteção:** Layout de `/admin/*` (exceto `/admin` login) verifica cookie `admin_session`. Sem cookie → redireciona para `/admin`.

### Recomendação para role no banco

Para atender ao requisito *"apenas usuários com role: 'admin' no banco"*:

1. **Migration:** Adicionar coluna `role TEXT` em `colaboradores` (valores: `'colaborador'`, `'gerente'`, `'admin'`).
2. **Autenticação Admin:** Duas opções:
   - **A)** Manter senha `ADMIN_PASSWORD` e usar apenas para “super admin”. Admin de conteúdo continua por senha.
   - **B)** Migrar para login por CPF: ao logar com CPF, verificar `role === 'admin'`; se sim, permitir acesso a `/admin` e criar sessão admin.
3. **Autorização:** Em todas as APIs/actions que criam/editam/excluem conteúdo, validar que o usuário tem `role = 'admin'` antes de executar.

---

## 2. Locais de Interação do Colaborador (Interface)

### Atualmente implementados

| Local | Tipo de interação | Detalhes |
|-------|-------------------|----------|
| **`/login`** | Digitar CPF | Campo de texto, máscara e validação |
| **`/onboarding`** | Quiz (múltipla escolha) | 3 perguntas, clique em opções |
| **`/onboarding`** | Checkbox | Aceite do Termo de Compromisso |
| **`/onboarding`** | Botões | Voltar, Próximo, Finalizar e Entrar |
| **`/portal`** | Leitura | Dashboard: mural + aniversariantes |
| **`/portal/mural`** | Leitura | Visualização do mural da unidade |
| **`/portal/aniversariantes`** | Leitura | Visualização do mural da família |
| **`/portal/perdas`** | Formulário | Select (item, motivo), textarea (observação), upload de foto, botão Enviar |

### Ainda não implementados (solicitados)

| Local | Tipo de interação | Observação |
|-------|-------------------|------------|
| **Meu Perfil** | Upload de foto | Nova página `/portal/perfil` |
| **Caixa de Sugestões** | Formulário (texto) | Não anônima, pública |
| **Caixa de Reclamações** | Formulário (texto) | Anônima, visível só para Admin |
| **Espaço do Elogio** | Formulário (elogio) | Público |
| **Checklists** | Marcar itens concluídos | Gerentes marcam itens diariamente |

---

## 3. Novas Funcionalidades Operacionais (a implementar)

### 3.1 Módulo de Reconhecimento

| Funcionalidade | Descrição | Visibilidade |
|----------------|-----------|--------------|
| **Espaço do Elogio** | Formulário para enviar elogios a colegas | Público (todos veem) |
| **Mural da Excelência** | Exibição de destaques/destaques do mês | Público |

### 3.2 Sugestões e Reclamações

| Funcionalidade | Descrição | Anonimato | Quem vê |
|----------------|-----------|-----------|---------|
| **Caixa de Sugestões** | Colaborador envia sugestões | Não anônima | Pública (ou só Admin) |
| **Caixa de Reclamações** | Colaborador envia reclamações | Anônima | Apenas Admin |

### 3.3 Checklists Editáveis

| Funcionalidade | Descrição | Quem usa |
|----------------|-----------|----------|
| **Admin** | Colar checklists por setor | Admin cadastra/edita checklist |
| **Gerente** | Marcar itens concluídos | Gerentes marcam diariamente |

### 3.4 Perfil Personalizado

| Funcionalidade | Descrição |
|----------------|-----------|
| **Upload de foto** | Colaborador faz upload no cadastro (Admin) ou em “Meu Perfil” |

### 3.5 Limpeza

| Ação | Status |
|------|--------|
| Remover funcionalidades financeiras | Nenhuma encontrada no app. Foco em Cultura, Operação e Pessoas. |

---

## 4. Separación de Poderes (Resumo Proposto)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADMIN (role: 'admin')                          │
├─────────────────────────────────────────────────────────────────────────┤
│ • Cadastrar/editar/excluir colaboradores                                 │
│ • Criar/editar/excluir avisos do mural                                   │
│ • Criar/editar checklists por setor                                      │
│ • Ver Caixa de Reclamações (anônima)                                     │
│ • Ver Sugestões, Elogios, Relatos de perdas                              │
│ • Ver e moderar Mural da Excelência                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    GERENTE (role: 'gerente')                             │
├─────────────────────────────────────────────────────────────────────────┤
│ • Marcar itens dos checklists como concluídos diariamente                │
│ • Leitura: mural da unidade, aniversariantes                             │
│ • Enviar: sugestões, elogios, relatos de perdas                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   COLABORADOR (role: 'colaborador')                      │
├─────────────────────────────────────────────────────────────────────────┤
│ • Leitura: mural da unidade, aniversariantes, Espaço do Elogio,          │
│   Mural da Excelência, Caixa de Sugestões (se pública)                   │
│ • Enviar: sugestões, elogios, relatos de perdas, reclamações (anônimo)    │
│ • Meu Perfil: upload de foto                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Próximos Passos Técnicos

1. Migration: adicionar `role` e `foto_url` em `colaboradores`.
2. Migration: tabelas `sugestoes`, `reclamacoes`, `elogios`, `checklists`, `checklist_itens`, `checklist_respostas`, `mural_excelencia`.
3. Atualizar Admin para suportar `role` e definir quem é admin na criação/edição de colaboradores.
4. Criar páginas: Meu Perfil, Caixa de Sugestões, Caixa de Reclamações, Espaço do Elogio, Mural da Excelência, Checklists.
5. Implementar storage (Supabase Storage) para fotos de perfil e de relatos.
6. Garantir que todas as mutações (CREATE/UPDATE/DELETE) validem `role === 'admin'` no backend.
