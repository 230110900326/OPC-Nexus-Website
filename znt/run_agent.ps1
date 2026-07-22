param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [ValidateSet("none", "openai", "ollama")]
    [string]$Provider = "none",

    [string]$Model = "",

    [string]$OutputDir = "",

    [switch]$NoFetch,

    [ValidateSet("candidates", "all")]
    [string]$FetchScope = "all",

    [int]$MaxPages = 0,

    [int]$Workers = 6
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Arguments = @(
    (Join-Path $ScriptDir "news_agent.py"),
    $InputPath,
    "--provider", $Provider
)

if ($Model) {
    $Arguments += @("--model", $Model)
}

if ($OutputDir) {
    $Arguments += @("--output-dir", $OutputDir)
}

if (-not $NoFetch) {
    $Arguments += @("--fetch-pages", "--fetch-scope", $FetchScope, "--max-pages", $MaxPages, "--workers", $Workers)
}

& python @Arguments
exit $LASTEXITCODE
