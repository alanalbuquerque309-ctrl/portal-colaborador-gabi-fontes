# Bootstrap do Banco — "Unidades não configuradas"

O `BOOTSTRAP_SECRET` já está configurado. Falta apenas **um passo**:

## 1. Adicionar DATABASE_URL no Vercel

1. Abra **[supabase.com/dashboard](https://supabase.com/dashboard)** → seu projeto
2. **Settings** (⚙️) → **Database**
3. Em **Connection string**, escolha **URI** (modo Session ou Transaction)
4. Copie a URL e **substitua `[YOUR-PASSWORD]`** pela senha do banco (definida ao criar o projeto; pode resetar em "Reset database password" se esqueceu)
5. Em **[vercel.com](https://vercel.com)** → projeto **portal-colaborador-gabi-fontes** → **Settings** → **Environment Variables**
6. Adicione `DATABASE_URL` com a URL completa e escolha **Production** e **Preview**
7. Faça **Redeploy** (Deployments → ⋮ → Redeploy)

## 2. Executar o bootstrap

No PowerShell:

```powershell
Invoke-RestMethod -Uri "https://portal-colaborador-gabi-fontes.vercel.app/api/admin/bootstrap-db" -Method POST -Headers @{"x-bootstrap-secret"="bootstrap-2025-secreto"}
```

Resposta esperada: `ok: true, msg: "Bootstrap concluído. Faça login."`

## 3. Testar o login

Acesse o portal e faça login. O erro "Unidades não configuradas" deve desaparecer.
