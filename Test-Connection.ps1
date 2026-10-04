#Requires -Version 5.1
param()
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$runtime = Join-Path $PSScriptRoot 'local'
$heartbeat = Join-Path $runtime 'heartbeat.txt'
$online = $false
$age = $null
if (Test-Path -LiteralPath $heartbeat) {
    try {
        $age = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - [long]([IO.File]::ReadAllText($heartbeat))
        $online = $age -ge 0 -and $age -lt 15000
    } catch { }
}
$pending = @()
$inbox = Join-Path $runtime 'inbox'
if (Test-Path -LiteralPath $inbox) {
    $pending = @(Get-ChildItem -LiteralPath $inbox -File | Where-Object { $_.Name -match '\.(jsx|running)$' } | ForEach-Object { $_.Name })
}
@{online = $online; heartbeatAgeMs = $age; pendingRequests = $pending; root = $PSScriptRoot} | ConvertTo-Json -Depth 4
if (-not $online) { exit 1 }
