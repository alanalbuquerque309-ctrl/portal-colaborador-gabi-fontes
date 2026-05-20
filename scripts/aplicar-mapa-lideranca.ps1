# Aplica o mapa operacional de lideranca na API do portal (producao ou local).
# Uso:
#   .\scripts\aplicar-mapa-lideranca.ps1 -PortalUrl "https://seu-app.vercel.app"
#   .\scripts\aplicar-mapa-lideranca.ps1 -PortalUrl "http://127.0.0.1:3001" -AdminLogin "admin" -AdminSenha "sua_senha"

param(
  [Parameter(Mandatory = $true)]
  [string]$PortalUrl,
  [string]$AdminLogin = "admin",
  [string]$AdminSenha = ""
)

$ErrorActionPreference = 'Stop'
$base = $PortalUrl.TrimEnd('/')
$jar = Join-Path $env:TEMP "portal-admin-cookies.txt"

if ([string]::IsNullOrWhiteSpace($AdminSenha)) {
  $portalRoot = Split-Path -Parent $PSScriptRoot
  foreach ($envFile in @('.env.local', '.env')) {
    $p = Join-Path $portalRoot $envFile
    if (-not (Test-Path $p)) { continue }
    foreach ($line in (Get-Content $p -Encoding UTF8)) {
      if ($line -match '^\s*ADMIN_ALAN_PASSWORD\s*=\s*(.+)$') {
        $AdminSenha = $Matches[1].Trim().Trim('"').Trim("'")
        break
      }
    }
    if ($AdminSenha) { break }
  }
}

if ([string]::IsNullOrWhiteSpace($AdminSenha)) {
  Write-Error 'Passe -AdminSenha ou defina ADMIN_ALAN_PASSWORD no .env.local'
}

if (Test-Path $jar) { Remove-Item $jar -Force }

$loginBody = @{ login = $AdminLogin; senha = $AdminSenha } | ConvertTo-Json
Write-Host "Login admin em $base ..."
$login = Invoke-WebRequest -Uri "$base/api/admin/auth" -Method POST `
  -UseBasicParsing -ContentType "application/json" -Body $loginBody -SessionVariable sess
if ($login.StatusCode -ne 200) { Write-Error "Login falhou: $($login.StatusCode)" }
$loginJson = $login.Content | ConvertFrom-Json
if (-not $loginJson.ok) { Write-Error 'Credenciais admin invalidas.' }

Write-Host 'Aplicar mapa operacional (lideres_por_setor + vinculos)...'
$mapa = Invoke-WebRequest -Uri "$base/api/admin/lideres-por-setor/aplicar-padrao" -Method POST `
  -UseBasicParsing -WebSession $sess
$mapaJson = $mapa.Content | ConvertFrom-Json
if (-not $mapaJson.ok) {
  Write-Error "API retornou erro: $($mapaJson.erro)"
}
Write-Host 'OK.'
$mapa.Content
