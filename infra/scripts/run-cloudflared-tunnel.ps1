[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$configPath = Join-Path $projectRoot '.cloudflared\config.yml'
$cloudflaredPath = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'

if (-not (Test-Path -LiteralPath $cloudflaredPath)) {
  throw "cloudflared was not found at $cloudflaredPath. Install the Cloudflare connector first."
}

if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Tunnel configuration was not found at $configPath."
}

& $cloudflaredPath --config $configPath tunnel --no-autoupdate run
exit $LASTEXITCODE
