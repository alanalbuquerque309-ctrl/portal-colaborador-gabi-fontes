# Tenant e caminho SaaS (Fase 1)

Preparação **sem risco** para white-label / multi-tenant. A operação da Gabi Fontes **não muda** até `USE_TENANT_DB=true` na Vercel.

## Princípio: fallback em cascata

```
USE_TENANT_DB=true?  →  Supabase (tenants / tenant_settings / tenant_setores)
        ↓ não
Variáveis de ambiente (NEXT_PUBLIC_TENANT_*)
        ↓ não
Defaults legado (Gabi Fontes em src/lib/tenant/defaults.ts)
        ↓
Constantes em src/lib/constants/colaborador-org.ts (unidades/setores)
```

## Onde ler no código

| Necessidade | Import |
|-------------|--------|
| Logo, nome, título | `getTenantBranding()` de `@/lib/tenant` |
| «Grãos», Café Conecta, etc. | `getTermo('reconhecimento')` etc. |
| Unidades / setores na UI | `listarUnidadesCadastro()`, `listarSetoresCadastro()` ou hook `useUnidadesCadastro()` |
| Servidor com espelho DB | `getTenantBrandingServer()`, `listarSetoresCadastroServer()` |
| Servidor unidades Supabase | `listarUnidadesCadastroServer()`, `GET /api/tenant/org` |

## Variáveis de ambiente (opcionais)

Ver `.env.local.example` — secção **Tenant / white-label**.

Com tudo vazio, produção continua idêntica à Gabi Fontes.

## Banco (espelho)

Migration `061_tenant_saas_foundation.sql`:

- `tenants` — cliente (`gabi-fontes` seed)
- `tenant_settings` — branding, termos, módulos (JSON)
- `tenant_setores` — cópia dos setores predefinidos

Aplicar: `npm run db:apply-061` (requer `DATABASE_URL`).

**Importante:** com `USE_TENANT_DB` desligado (padrão), o app **ignora** essas tabelas na leitura.

## Inventário: ainda hardcoded (próximas fases)

- `src/lib/config-lideranca-operacional.ts` e afins — nomes de pessoas
- `src/lib/config-avaliacao-direta.ts` — avaliadores por nome
- `public/manuais/` — conteúdo de cultura Gabi Fontes
- Repo / domínio / PWA `manifest.json` estático
- Termos de cultura na UI («Grãos», etc.) ainda fixos em vários componentes

## Critério de sucesso Fase 1

- [x] Novo branding só com env, sem editar TS
- [x] Nenhum import novo direto a `UNIDADES_CADASTRO` em telas novas (usar `@/lib/tenant`)
- [ ] Migration 061 aplicada em staging/prod (espelho; runtime inalterado)
- [x] `GET /api/tenant/branding` retorna defaults em produção atual

## Fase 2.1 — centralização org (concluída)

Todo o `src/` (exceto `colaborador-org.ts` e `tenant/org-catalog.ts`) usa:

- `listarUnidadesCadastro()` / `listarUnidadesRelatorioFiliais()`
- `listarSetoresCadastro()` / `listarSetoresAvaliacaoEquipeBackoffice()`
- `isSetorCadastroValido()` / `slugUnidadeAdministrativo()` / `setorEstoqueLegado()`

`ROLES_CADASTRO` permanece em `colaborador-org` (perfis, não estrutura org).

## Fase 2.2 — unidades do Supabase (concluída)

- `listarUnidadesCadastroServer()` lê tabela `unidades` (exclui `matriz`); fallback à constante
- `GET /api/tenant/org` expõe unidades + setores para o cliente
- Hook `useUnidadesCadastro()` nos selects (constante imediata → atualiza do Supabase)
- APIs e libs servidor usam lista resolvida (`listarUnidadesCadastroResolvido`)

## Fases seguintes (não implementadas)

1. Admin CRUD setores/unidades só do banco
2. `USE_TENANT_DB=true` em staging com segundo tenant fake
3. `tenant_id` + RLS multi-tenant
4. Provisionamento e billing
