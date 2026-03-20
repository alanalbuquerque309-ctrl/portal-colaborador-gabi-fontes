# Git e GitHub — apontar o `origin` certo

## O que deu errado antes

Se o `git remote -v` mostrar um endereço com texto de **exemplo** (tipo `USUARIO_COPIADO_DA_VERCEL`), isso **não é um repositório real**. Alguém colou o modelo sem trocar pelo endereço verdadeiro.

## O que está funcionando

- **Código na sua pasta** + commits locais = ok.
- **Site na Vercel** = deploy já existente (independente do `origin` do seu PC estar certo ou errado).

O `origin` só precisa estar certo para **`git push`** enviar o código para o **mesmo** repositório que a Vercel usa.

## Passo único: copiar o repositório na Vercel

1. Acesse [vercel.com](https://vercel.com) → projeto **portal-colaborador-gabi-fontes**.
2. **Settings** → **Git**.
3. Veja **Connected Git Repository** (algo como `usuario/nome-do-repo`).
4. No GitHub, abra esse repositório → botão verde **Code** → copie a URL **HTTPS** (termina em `.git`).

## No PowerShell (na pasta do projeto)

```powershell
Set-Location "C:\Users\EU\Desktop\ALAN\ISA AI\ALAN.IA\Portal do Colaborador - Gabi Fontes"

git remote set-url origin COLE_AQUI_A_URL_HTTPS_COPIADA_DO_GITHUB

git remote -v

git push -u origin main
```

Troque `COLE_AQUI_A_URL_HTTPS_COPIADA_DO_GITHUB` pela URL real (ex.: `https://github.com/seu-usuario/portal-colaborador-gabi-fontes.git`).

## Se ainda der “Repository not found”

- Confirme que abre o mesmo link no navegador logado no GitHub.
- Repo **privado**: use a conta GitHub que é **dona** do repositório ao autenticar o Git.
