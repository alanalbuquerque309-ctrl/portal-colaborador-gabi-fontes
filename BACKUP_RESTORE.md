# Backup e Restore — Portal do Colaborador (Gabi Fontes)

## 1. Backup da ESTRUTURA (schema)

A estrutura do banco está **versionada no Git** em `supabase/migrations/*.sql` (de `001_` a `035_`).
Isso é o backup canônico do schema: aplicando as migrations em ordem num projeto Supabase vazio,
o schema é recriado de forma idêntica.

- Validação rápida (sem tocar produção): o build do projeto passa (`npm run build`), e as migrations
  são idempotentes (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).

## 2. Backup dos DADOS (produção) — requer acesso Supabase

O backup dos dados reais **não** pode ser feito pelo código do app; faça pelo Supabase:

### Opção A — Backups gerenciados (recomendado)
1. Supabase → projeto → **Database → Backups**.
2. Confirmar que **backups automáticos diários** estão ativos.
3. Anotar a janela de retenção do plano.

### Opção B — Dump manual (pg_dump) com DATABASE_URL
No PC (com `DATABASE_URL` da URI **Direct**, porta 5432):

```powershell
# estrutura + dados
pg_dump "postgresql://postgres:SENHA@db.SEUREF.supabase.co:5432/postgres" `
  --no-owner --no-privileges -F c -f "backup_portal_$(Get-Date -Format yyyyMMdd_HHmm).dump"
```

Somente estrutura (schema):

```powershell
pg_dump "postgresql://postgres:SENHA@db.SEUREF.supabase.co:5432/postgres" `
  --schema-only --no-owner --no-privileges -f "schema_portal.sql"
```

## 3. Validar que o banco PODE ser restaurado

Restaure num projeto Supabase de teste (NUNCA na produção):

```powershell
# restore do dump custom (-F c)
pg_restore --no-owner --no-privileges -d "postgresql://postgres:SENHA@db.TESTE.supabase.co:5432/postgres" `
  "backup_portal_AAAAMMDD_HHMM.dump"
```

Checklist de validação após restore:
- [ ] Tabelas presentes: `colaboradores`, `unidades`, `avaliacoes_diarias`, `avaliacoes_lideranca`,
      `trofeus_entre_pares`, `lideres_por_setor`, `ajuda_chat`, `equipe_chat_mensagens`, `portal_presenca`, `avisos`.
- [ ] Contagem de `colaboradores` bate com produção.
- [ ] Login de teste funciona apontando o app para o projeto de teste.

## 4. Procedimento de rollback de CÓDIGO (produção)

- `git revert <commit>` + push → a Vercel reimplanta a versão anterior.
- Migrations são **aditivas** (sem DROP), então rollback de código não exige rollback de schema.
