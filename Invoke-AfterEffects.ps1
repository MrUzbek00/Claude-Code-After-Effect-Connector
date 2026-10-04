#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ScriptPath,
    [ValidateRange(1, 3600)][int]$TimeoutSeconds = 120
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
if ([string]::IsNullOrWhiteSpace($ScriptPath)) { $ScriptPath = Join-Path $PSScriptRoot 'project-info.jsx' }
$sourcePath = (Resolve-Path -LiteralPath $ScriptPath).Path
if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw 'ScriptPath must name a file.' }
$runtime = Join-Path $PSScriptRoot 'local'
$requestDirectory = Join-Path $runtime 'requests'
$inboxPath = Join-Path $runtime 'inbox'
foreach ($directory in @($runtime, $requestDirectory, $inboxPath)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}
$lock = $null
try {
    try { $lock = [IO.File]::Open((Join-Path $runtime 'client.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None) }
    catch { throw 'Another bridge client is active. Wait for it to finish before sending another request.' }
    $pending = @(Get-ChildItem -LiteralPath $inboxPath -File | Where-Object { $_.Name -match '\.(jsx|running)$' })
    if ($pending.Count -gt 0) { throw ('Unresolved request(s): ' + (($pending | ForEach-Object { $_.Name }) -join ', ') + '. Inspect saved results and project state before sending more work.') }
    $bridgeOnline = $false
    $heartbeatPath = Join-Path $runtime 'heartbeat.txt'
    if (Test-Path -LiteralPath $heartbeatPath) {
        try {
            $heartbeatMs = [long]([IO.File]::ReadAllText($heartbeatPath))
            $age = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $heartbeatMs
            $bridgeOnline = $age -ge 0 -and $age -lt 15000
        } catch { }
    }
    if (-not $bridgeOnline) { throw ('Bridge is offline. In After Effects, use File > Scripts > Run Script File and select ' + (Join-Path $PSScriptRoot 'Start-Bridge.jsx')) }
    $requestId = [guid]::NewGuid().ToString('N')
    $responsePath = Join-Path $requestDirectory ($requestId + '.json')
    $wrapperPath = Join-Path $requestDirectory ($requestId + '.jsx')
    $snapshotPath = Join-Path $requestDirectory ($requestId + '.source.jsx')
    # Snapshot the request so later edits to the source cannot change queued work.
    Copy-Item -LiteralPath $sourcePath -Destination $snapshotPath
    $values = @{
        '__SOURCE__' = ConvertTo-Json -InputObject ($snapshotPath.Replace('\', '/')) -Compress
        '__RESPONSE__' = ConvertTo-Json -InputObject ($responsePath.Replace('\', '/')) -Compress
        '__REQUEST_ID__' = ConvertTo-Json -InputObject $requestId -Compress
    }
    $template = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'scripts\request-wrapper.jsx'))
    $wrapper = [regex]::Replace($template, '__SOURCE__|__RESPONSE__|__REQUEST_ID__', [Text.RegularExpressions.MatchEvaluator]{ param($match) $values[$match.Value] })
    [IO.File]::WriteAllText($wrapperPath, $wrapper, [Text.UTF8Encoding]::new($false))
    $stagedPath = Join-Path $inboxPath ($requestId + '.tmp')
    [IO.File]::WriteAllText($stagedPath, $wrapper, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $stagedPath -Destination (Join-Path $inboxPath ($requestId + '.jsx'))
    [Console]::Error.WriteLine(('Request {0}; result: {1}' -f $requestId, $responsePath))
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Test-Path -LiteralPath $responsePath) {
            $responseText = [IO.File]::ReadAllText($responsePath)
            $response = $responseText | ConvertFrom-Json
            if ($response.requestId -ne $requestId -or $response.ok -isnot [bool]) { throw 'Malformed or mismatched bridge response.' }
            $responseText
            if (-not $response.ok) { exit 1 }
            exit 0
        }
        Start-Sleep -Milliseconds 100
    }
    throw ('Request ' + $requestId + ' timed out. It may still execute. Do not retry automatically. Inspect project state and run Get-BridgeResult.ps1 -RequestId ' + $requestId)
} finally {
    if ($null -ne $lock) { $lock.Dispose() }
}
