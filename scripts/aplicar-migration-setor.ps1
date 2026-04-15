# Aplica migration 016 (coluna setor). Uso:
#   .\aplicar-migration-setor.ps1
#   .\aplicar-migration-setor.ps1 -DatabaseUrl "postgresql://postgres:...@db.xxx.supabase.co:5432/postgres"
# Requisito: psql no PATH. DATABASE_URL: Supabase -> Project Settings -> Database -> Connection string -> URI

param(
  [Parameter(Mandatory = $false)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = 'Stop'
$portalRoot = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $portalRoot 'supabase\migrations\016_colaboradores_setor_garantir.sql'

function Unquote-EnvValue {
  param([string]$Val)
  $v = $Val.Trim()
  $q = [char]34
  $sq = [char]39
  if ($v.Length -ge 2) {
    if (($v.StartsWith($q) -and $v.EndsWith($q)) -or ($v.StartsWith($sq) -and $v.EndsWith($sq))) {
      return $v.Substring(1, $v.Length - 2)
    }
  }
  return $v
}

function Read-DatabaseUrlFromFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $raw = [System.IO.File]::ReadAllText($Path, $utf8)
  if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) {
    $raw = $raw.Substring(1)
  }
  foreach ($line in ($raw -split "`r?`n")) {
    $t = $line.Trim()
    if ($t -match '^\s*#' -or $t -eq '') { continue }
    if ($t -match '^\s*DATABASE_URL\s*=\s*(.+)$') {
      return (Unquote-EnvValue $Matches[1])
    }
  }
  return $null
}

if (-not (Test-Path $sqlFile)) {
  Write-Error 'Ficheiro SQL da migration nao encontrado.'
}

$dbUrl = $null
if (-not [string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $dbUrl = $DatabaseUrl.Trim()
}

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
  $envLocal = Join-Path $portalRoot '.env.local'
  $envPlain = Join-Path $portalRoot '.env'
  $dbUrl = Read-DatabaseUrlFromFile $envLocal
  if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    $dbUrl = Read-DatabaseUrlFromFile $envPlain
  }
}

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
  Write-Host ''
  Write-Host 'Nao encontrei DATABASE_URL.'
  Write-Host 'Opcao A - Coloque no .env.local na raiz do Portal (uma linha):'
  Write-Host '  DATABASE_URL=postgresql://postgres.[ref]:[SUA_SENHA]@aws-0-...pooler.supabase.com:6543/postgres'
  Write-Host '  (prefira URI "Direct" porta 5432 se o pooler falhar no psql)'
  Write-Host ''
  Write-Host 'Opcao B - Passe a URI na linha de comando:'
  Write-Host '  .\aplicar-migration-setor.ps1 -DatabaseUrl "postgresql://..."'
  Write-Host ''
  Write-Error 'DATABASE_URL obrigatorio.'
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Host 'psql nao encontrado. winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements'
  exit 1
}

Write-Host 'A executar migration (colaboradores.setor)...'
& psql $dbUrl -v ON_ERROR_STOP=1 -f $sqlFile
if ($LASTEXITCODE -ne 0) {
  Write-Error "psql falhou codigo $LASTEXITCODE. Tente URI Direct (porta 5432) no Supabase."
}

Write-Host 'OK. Cadastre o colaborador de novo no portal.'
