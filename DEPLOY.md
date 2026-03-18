# Deploy — Portal do Colaborador Gabi Fontes

## O que já está pronto

- Build passando
- `vercel.json` configurado para Next.js
- Estrutura pronta para produção

---

## Passo a passo no PowerShell

### 1. Abrir o PowerShell

- Pressione `Win + X` e escolha **Windows PowerShell** ou **Terminal**
- Ou abra o Cursor e use o terminal integrado (Ctrl+`)

---

### 2. Ir até a pasta do projeto

```powershell
cd "C:\Users\EU\Desktop\ALAN\ISA AI\ALAN.IA\Portal do Colaborador - Gabi Fontes"
```

---

### 3. Fazer login na Vercel

```powershell
npx vercel login
```

- O navegador será aberto
- Entre com sua conta Vercel ou crie uma em [vercel.com](https://vercel.com)
- Volte ao terminal ao concluir o login

---

### 4. Fazer o deploy

```powershell
npx vercel
```

Na primeira execução:

- **Set up and deploy?** → `Y`
- **Which scope?** → sua conta (Enter)
- **Link to existing project?** → `N`
- **Project name?** → `portal-colaborador-gabi-fontes` (ou Enter para o padrão)
- **Directory?** → `./` (Enter)

Quando terminar, aparecerá uma URL (ex.: `https://portal-colaborador-gabi-fontes-xxx.vercel.app`).

---

### 5. Definir variáveis de ambiente na Vercel

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Abra o projeto **portal-colaborador-gabi-fontes**
3. Vá em **Settings** → **Environment Variables**
4. Cadastre as variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key do Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_VIDEO_BOAS_VINDAS` | (Opcional) URL do vídeo de boas-vindas | Production, Preview, Development |
| `ADMIN_ALAN_LOGIN` | (Opcional) Login do admin Alan | Production, Preview, Development |
| `ADMIN_ALAN_PASSWORD` | (Opcional) Senha do admin Alan | Production, Preview, Development |

5. Clique em **Save**

**Nota:** `ADMIN_ALAN_LOGIN` e `ADMIN_ALAN_PASSWORD` permitem acesso administrativo com usuário e senha. Defina apenas nas variáveis da Vercel — nunca no código.

---

### 6. Fazer redeploy após definir as variáveis

Depois de salvar as variáveis:

```powershell
npx vercel --prod
```

Isso faz o deploy para produção com as variáveis atualizadas.

---

## Configurar Supabase (se ainda não tiver)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Em **Settings** → **API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (mantenha em segredo)
3. Execute os scripts de migração em **SQL Editor**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

---

## Deploy contínuo via Git

Depois de conectar o repositório no dashboard da Vercel, cada push na branch principal gera um novo deploy automaticamente.

---

## Resumo rápido

```powershell
cd "C:\Users\EU\Desktop\ALAN\ISA AI\ALAN.IA\Portal do Colaborador - Gabi Fontes"
npx vercel login
npx vercel
# Defina as variáveis no dashboard
npx vercel --prod
```
