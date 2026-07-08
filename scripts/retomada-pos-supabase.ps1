# Retomada após Supabase voltar ao normal (Disk IO / manutenção).
# Uso: .\scripts\retomada-pos-supabase.ps1
# Não faz push sozinho; só valida e mostra os passos.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== 1. Build local (mesmo que a Vercel) ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build falhou — corrija antes de publicar." }

Write-Host "`n=== 2. Supabase: migrations (SQL Editor ou npm run db:apply-*) ===" -ForegroundColor Cyan
Write-Host @"
  a) 055_emocional_motivo.sql  (coluna motivo no termômetro) — se ainda não rodou
  b) 056_io_indexes.sql        — UM índice por vez, de madrugada:
     - idx_emocional_colaborador_data
     - idx_avaliacoes_lideranca_semana_avaliado
     - idx_avaliacoes_diarias_data_referencia
  Se timeout: use CREATE INDEX CONCURRENTLY ... (um por vez).
"@

Write-Host "`n=== 3. Vercel: republicar commit d4af3e5 ===" -ForegroundColor Cyan
Write-Host @"
  Opção A — Dashboard Vercel → Deployments → commit d4af3e5 → Redeploy
  Opção B — Push vazio: git commit --allow-empty -m "chore: redeploy após Supabase" ; git push origin main
  Produção hoje ainda está em ba8c407 (antes termômetro/nav/perf).
"@

Write-Host "`n=== 4. Testar em produção ===" -ForegroundColor Cyan
Write-Host @"
  - Login portal
  - Termômetro: emoção → Quer falar sobre isso? → Sim/Não
  - Mobile: Mais → Aniversários / Comunicação
  - Desktop: menu sem Treinamento duplicado
"@

Write-Host "`nOK — build local passou. Siga passos 2–4 quando Supabase estiver estável." -ForegroundColor Green
