# Deploy — Portal do Colaborador Gabi Fontes

> **Git:** este projeto é um repo **separado** da pasta raiz `ISA AI/`. Commit, push e Vercel = **sempre aqui** (`portal-colaborador-gabi-fontes`, branch `main`). O Commit & Push do Cursor na raiz `ISA AI` **não** publica o portal.

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
| `NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID` | UUID do colaborador que responde o chat de ajuda (ex.: Daniel) | Production, Preview, Development |
| `NEXT_PUBLIC_AJUDA_RESPONSAVEL_NOME` | (Opcional) Nome no texto do botão flutuante | Production, Preview, Development |

5. Clique em **Save**

**Nota:** `ADMIN_ALAN_LOGIN` e `ADMIN_ALAN_PASSWORD` permitem acesso administrativo com usuário e senha. Defina apenas nas variáveis da Vercel — nunca no código.

**Canal de ajuda:** com `NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID` definido, esse colaborador é o atendimento principal; **sócios** e **admin** também podem **responder** no Inbox ajuda (fica registrado quem respondeu). Sem essa variável, o comportamento legado permanece (admin/RH respondem).

**Apagar mensagens:** só **sócios** e **admin** podem remover registros do canal de ajuda (botão **Apagar** na página **Inbox ajuda** e no **atalho** do botão dourado flutuante, modo “Canal de ajuda (atalho)”).

---

### 6. Fazer redeploy após alterações no código ou nas variáveis

Sempre que mudar rotas/API, componentes ou variáveis de ambiente, gere um novo deploy de produção; senão o browser (ou PWA) pode continuar a mostrar uma versão antiga sem o botão **Apagar** ou sem o atalho atualizado.

Depois de salvar as variáveis no dashboard ou após `git pull` com alterações:

```powershell
cd "C:\Users\EU\Desktop\ALAN\ISA AI\ALAN.IA\Portal do Colaborador - Gabi Fontes"
npm run build
npx vercel --prod
```

Se instalou o portal como **PWA** e a interface não reflete o deploy novo: nas definições do site no telemóvel, **limpar dados / cache** ou remover a app e voltar a abrir pelo URL.

Isso faz o deploy para produção com o build e as variáveis atualizadas.

---

## Configurar Supabase (se ainda não tiver)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Em **Settings** → **API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (mantenha em segredo)
3. Execute os scripts de migração em **SQL Editor** (em ordem; ver também `supabase/migrations/`):
   - `001_initial_schema.sql`, `002_rls_policies.sql`, …
   - **Liderança por setor (obrigatório para o mapa operacional):** `032_lideres_por_setor.sql`

### Mapa de liderança no admin (sem SQL manual depois da 032)

1. Entrar no admin do portal (sessão admin).
2. Menu lateral → **Liderança por setor** (`/admin/lideres-por-setor`).
3. A página mostra se a tabela existe no Supabase (verde = OK; amarelo = falta a 032).
4. Se faltar: **Copiar SQL da migration 032** → colar no Supabase SQL Editor → Run → **Verificar de novo**.
5. Clicar **Aplicar mapa operacional e vincular todos** (Joyce/Silvia Mesquita, gerentes Barra/Nova Iguaçu, Daniel em CD/Motorista/Administração/RH, etc.).

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
npm run build
npx vercel --prod
```
