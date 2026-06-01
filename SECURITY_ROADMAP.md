# SECURITY_ROADMAP — Portal do Colaborador (Gabi Fontes)

> Documento de planejamento. **Nada aqui foi implementado** (exceto o que está marcado como concluído em "Correções já aplicadas"). Cada item é uma melhoria futura priorizada.

Legenda:
- **Prioridade:** P0 (crítico) · P1 (alto) · P2 (médio) · P3 (baixo/futuro)
- **Complexidade:** Baixa · Média · Alta
- **Risco de implementação:** Baixo · Médio · Alto (chance de quebrar algo em produção)

---

## Correções já aplicadas (pré-produção)

- **Remoção de credenciais hardcoded** em `src/app/api/admin/auth/route.ts` (sem `admin/gabifontes2019|2024` e sem default de `ADMIN_PASSWORD`). Admin por senha agora exige env; acesso admin continua via login do portal (role socio/admin).
- Confirmado: **`SUPABASE_SERVICE_ROLE_KEY` não é exposta ao frontend** (nenhum `NEXT_PUBLIC_*` de service role).
- Confirmado: **todas as rotas `/api/admin/*` exigem autorização** (`isAdminAuthorized`, `isMasterPortalSession`, `canResponderAjudaFinal`, `canViewReclamacoesAdmin`); `logout` não requer.

---

## Backlog de segurança (a implementar nas próximas janelas)

### 1. Cookies HttpOnly (sessão do portal)
- **Descrição:** tornar `portal_colaborador_id`/`portal_unidade_id`/`portal_role` httpOnly, gravados só no servidor; UI passa a usar `/api/portal/perfil` como fonte do role.
- **Prioridade:** P1
- **Complexidade:** Alta
- **Risco de implementação:** Médio/Alto (muitos componentes leem `document.cookie` via `getPortalSession`).
- **Benefício esperado:** impede roubo de sessão por XSS (mitiga o maior risco estrutural).

### 2. Rate Limiting
- **Descrição:** limitar tentativas por IP/login em `/api/login/portal` e `/api/admin/auth` (Vercel KV ou Upstash Redis), com lockout temporário.
- **Prioridade:** P1
- **Complexidade:** Baixa/Média
- **Risco de implementação:** Baixo (calibrar limites).
- **Benefício esperado:** trava brute force e abuso.

### 3. Proteção CSRF
- **Descrição:** validar Origin/Referer + token CSRF (double-submit) nas rotas mutáveis (`operacao-apto`, `avaliacao-master`, `ajuda-chat`, `equipe-chat`, upload de foto, admin).
- **Prioridade:** P1
- **Complexidade:** Média
- **Risco de implementação:** Baixo/Médio (incluir domínios de preview da Vercel na allowlist).
- **Benefício esperado:** impede ações forjadas com a sessão da vítima.

### 4. Auditoria e Logs
- **Descrição:** tabela `audit_log` (aditiva) + registro de ações sensíveis (login admin, alterar role, marcar apto, aplicar migration, responder/excluir ajuda). Logs sem PII.
- **Prioridade:** P1
- **Complexidade:** Baixa/Média
- **Risco de implementação:** Baixo (aditivo).
- **Benefício esperado:** rastreabilidade e resposta a incidentes.

### 5. RLS Hardening (Supabase)
- **Descrição:** substituir políticas permissivas (`USING (true)`) por regras por unidade/dono; revisar filtros nas rotas.
- **Prioridade:** P1
- **Complexidade:** Alta
- **Risco de implementação:** Médio (depende de migrar leituras para anon key).
- **Benefício esperado:** banco vira barreira real, não só o código.

### 6. Redução gradual do uso de Service Role
- **Descrição:** criar client anônimo server-side; migrar leituras do próprio usuário/unidade para anon + RLS; manter service role só no administrativo.
- **Prioridade:** P1
- **Complexidade:** Alta
- **Risco de implementação:** Médio (rota a rota, validando).
- **Benefício esperado:** reduz o "raio de explosão" de qualquer falha de gate.

### 7. Bucket privado para fotos
- **Descrição:** tornar `fotos-perfil` privado, servir via signed URL temporária, nome de arquivo não enumerável.
- **Prioridade:** P2
- **Complexidade:** Média
- **Risco de implementação:** Médio (migrar URLs existentes).
- **Benefício esperado:** protege PII (imagem) — LGPD.

### 8. CSP e Security Headers
- **Descrição:** CSP (report-only → enforce), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options/frame-ancestors` em `next.config.js`.
- **Prioridade:** P2
- **Complexidade:** Média
- **Risco de implementação:** Médio (CSP pode bloquear vídeo/iframe de manuais).
- **Benefício esperado:** reduz impacto de XSS e clickjacking.

### 9. Anti-enumeração de login
- **Descrição:** respostas uniformes no login (não revelar se o login existe ou se falta senha).
- **Prioridade:** P2
- **Complexidade:** Baixa
- **Risco de implementação:** Baixo (ajustar fluxo "primeira senha" internamente).
- **Benefício esperado:** dificulta phishing/brute force direcionado.

### 10. MFA para administradores
- **Descrição:** segundo fator para sócio/admin.
- **Prioridade:** P2
- **Complexidade:** Média/Alta
- **Risco de implementação:** Médio.
- **Benefício esperado:** protege contas com maior poder.

### 11. Migração para Supabase Auth
- **Descrição:** trocar auth por cookies caseiros por Supabase Auth (JWT/claims), habilitando RLS por claim.
- **Prioridade:** P3 (estrutural/futuro)
- **Complexidade:** Alta
- **Risco de implementação:** Alto.
- **Benefício esperado:** base de segurança robusta e padrão.

### 12. Rotação de chaves
- **Descrição:** rotacionar `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_ALAN_PASSWORD`, `BOOTSTRAP_SECRET`; processo periódico.
- **Prioridade:** P1 (primeira rotação) / P3 (recorrência)
- **Complexidade:** Baixa
- **Risco de implementação:** Baixo (atualizar env na Vercel).
- **Benefício esperado:** reduz janela de exposição de segredos.

### 13. Hardening GitHub
- **Descrição:** 2FA obrigatório, branch protection na `main`, secret scanning + push protection, varredura do histórico por segredos.
- **Prioridade:** P1
- **Complexidade:** Baixa
- **Risco de implementação:** Baixo.
- **Benefício esperado:** protege a cadeia de deploy.

### 14. Hardening Vercel
- **Descrição:** 2FA na conta, escopo mínimo de envs, observabilidade/logs, confirmar HSTS no domínio.
- **Prioridade:** P1
- **Complexidade:** Baixa
- **Risco de implementação:** Baixo.
- **Benefício esperado:** protege hospedagem e segredos.

### 15. Hardening Supabase
- **Descrição:** RLS forte, backups automáticos confirmados, restrição do endpoint que executa SQL (`aplicar-migration-035`), revisão de buckets públicos.
- **Prioridade:** P1
- **Complexidade:** Média
- **Risco de implementação:** Médio.
- **Benefício esperado:** protege o dado na origem.

### 16. Atualização de dependências (Next.js e libs)
- **Descrição:** subir Next para 14.2.x corrigido e ajustar `next-pwa`/workbox; testar build/PWA em branch.
- **Prioridade:** P1
- **Complexidade:** Média
- **Risco de implementação:** Médio (PWA pode exigir ajuste).
- **Benefício esperado:** corrige CVEs de runtime (Next) e build.
- **Nota:** adiado para janela pós-lançamento por ser breaking (não fazer na véspera).

---

## Ordem sugerida de execução (pós-lançamento)

1. Hardening GitHub/Vercel/Supabase (P1, risco baixo, fora do código).
2. Rate Limiting + Anti-enumeração + primeira rotação de chaves.
3. Auditoria/Logs.
4. CSRF.
5. Upgrade de dependências (branch testada).
6. RLS hardening + redução de service role (juntos).
7. Cookies HttpOnly.
8. Bucket privado + CSP enforce.
9. MFA admin.
10. Supabase Auth (estrutural).
