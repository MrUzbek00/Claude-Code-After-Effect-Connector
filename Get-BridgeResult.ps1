#Requires -Version 5.1
param([Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{32}$')][string]$RequestId)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$RequestId = $RequestId.ToLowerInvariant()
$runtime = Join-Path $PSScriptRoot 'local'
$responsePath = Join-Path $runtime ('requests\' + $RequestId + '.json')
if (Test-Path -LiteralPath $responsePath) {
    $text = [IO.File]::ReadAllText($responsePath)
    $result = $text | ConvertFrom-Json
    if ($result.requestId -ne $RequestId -or $result.ok -isnot [bool]) { throw 'Malformed or mismatched saved response.' }
    $text
    if (-not $result.ok) { exit 1 }
    exit 0
}
$state = 'not_found'
if (Test-Path -LiteralPath (Join-Path $runtime ('inbox\' + $RequestId + '.jsx'))) { $state = 'queued' }
elseif (Test-Path -LiteralPath (Join-Path $runtime ('inbox\' + $RequestId + '.jsx.running'))) { $state = 'running_or_interrupted' }
elseif (Test-Path -LiteralPath (Join-Path $runtime ('requests\' + $RequestId + '.jsx'))) { $state = 'unknown' }
@{requestId = $RequestId; state = $state; message = 'No completed result. Inspect project state before retrying.'} | ConvertTo-Json -Compress
exit 2
