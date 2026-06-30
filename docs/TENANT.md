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

## Fase 2.4 — wrappers regras liderança/avaliação (concluída)

Porta única para regras por nome (hoje = TS legado Gabi Fontes; futuro = espelho DB):

| Função síncrona (client-safe) | Função servidor (async) |
|-------------------------------|-------------------------|
| `carregarRegrasLiderancaLegado()` | `carregarRegrasLiderancaLegadoResolvido()` |
| `carregarRegrasAvaliacaoDiretaLegado()` | `carregarRegrasAvaliacaoDiretaResolvido()` |

- `src/lib/tenant/regras-legado.ts` — legado TS, sem `server-only`
- `src/lib/tenant/regras-legado-server.ts` — resolução com `USE_TENANT_DB` (hoje ainda devolve legado)
- `aplicar-config-lideranca.ts` e `avaliacao-direta.ts` usam as versões **resolvidas** no servidor
- `setores-fabrica-lideranca.ts` / `resolver-unidades-equipe-avaliacao.ts` mantêm derivados estáticos do config (sem mudança de comportamento)

`GET /api/tenant/branding` expõe `espelho_061_disponivel` (probe tabela `tenants`; não liga espelho sozinho).

## Inventário: ainda hardcoded (próximas fases)

- `src/lib/config-lideranca-operacional.ts` e afins — nomes de pessoas (fonte legado dos wrappers)
- `src/lib/config-avaliacao-direta.ts` — avaliadores por nome
- `public/manuais/` — conteúdo de cultura Gabi Fontes
- Repo / domínio / PWA `manifest.json` estático

## Fase 2.3 — termos na UI (concluída)

Rótulos visíveis usam `getTermo()` / `getTermoCurto()`:

- `reconhecimento` — gamificação (nav, páginas, contagem)
- `cafe_conecta` — sorteio semanal
- `quinta_treino` — treinos de quinta

Override via `NEXT_PUBLIC_TERMO_*` (ver `.env.local.example`). Lógica de missões/pendências **não** alterada.

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

## Fase 2.6 — admin read-only tenant (concluída)

- `GET /api/admin/tenant-espelho` — sócios, admin (Daniel) ou login por senha (mesmo gate da auditoria)
- `/admin/tenant-espelho` — compara **runtime efetivo**, **legado TS** e **espelho Supabase (061)**
- Somente leitura; não edita banco nem liga `USE_TENANT_DB`

## Fases seguintes (não implementadas)

1. **2.5** — espelho operacional (migration 062: regras no DB)
2. **2.7** — PWA dinâmico (`manifest` por tenant)
3. **2.8** — staging com `USE_TENANT_DB=true` e segundo tenant fake
4. Admin CRUD setores/unidades só do banco
5. `tenant_id` + RLS multi-tenant
6. Provisionamento e billing
