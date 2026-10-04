#Requires -Version 5.1
# Prepares local runtime folders and registers the MCP server with Claude Code.
#   -SkipMcp   do not run `claude mcp add` (the PowerShell clients still work on their own)
[CmdletBinding()]
param([switch]$SkipMcp)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$runtime = Join-Path $PSScriptRoot 'local'
foreach ($folder in @($runtime, (Join-Path $runtime 'inbox'), (Join-Path $runtime 'requests'), (Join-Path $runtime 'scripts'))) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}
$server = Join-Path $PSScriptRoot 'mcp\server.cjs'
$rootLiteral = "'" + $PSScriptRoot.Replace("'", "''") + "'"
$guide = @'
# Connect this checkout to Claude Code

In After Effects, enable Allow Scripts to Write Files and Access Network under
Scripting & Expressions preferences. Run this checkout's Start-Bridge.jsx using
File > Scripts > Run Script File. Repeat after restarting After Effects.

MCP server (registered by Setup.ps1 unless -SkipMcp was used):

```powershell
claude mcp add after-effects-bridge --scope user -- node __SERVER__
```

Without MCP, Claude Code can call the PowerShell client directly:

```powershell
Set-Location -LiteralPath __ROOT__
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Invoke-AfterEffects.ps1
```

First ask for read-only project inspection. A timeout does not cancel the request;
use ae_get_result (or Get-BridgeResult.ps1) and inspect the project before retrying.
See docs/CLAUDE-CODE.md for the workflow and exit codes.
'@
$guide = $guide.Replace('__ROOT__', $rootLiteral).Replace('__SERVER__', '"' + $server + '"')
[IO.File]::WriteAllText((Join-Path $runtime 'CLAUDE-SETUP.md'), $guide, [Text.UTF8Encoding]::new($false))
Write-Output 'Local folders ready. No third-party dependencies are required.'

if (-not $SkipMcp) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Output 'Node.js 18+ not found: skipped MCP registration. Install Node.js and re-run Setup.ps1.'
    } elseif (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        Write-Output 'Claude Code CLI not found. Register the MCP server manually:'
        Write-Output ('  claude mcp add after-effects-bridge --scope user -- node "' + $server + '"')
    } else {
        # Native stderr would become a terminating error under "Stop".
        $ErrorActionPreference = 'Continue'
        & claude mcp remove after-effects-bridge --scope user 2>&1 | Out-Null
        & claude mcp add after-effects-bridge --scope user -- node "$server"
        if ($LASTEXITCODE -ne 0) { throw ('claude mcp add failed (exit ' + $LASTEXITCODE + ').') }
        $ErrorActionPreference = 'Stop'
        Write-Output "Registered MCP server 'after-effects-bridge' with Claude Code (user scope). Restart Claude Code to load it."
    }
}

Write-Output ('In After Effects, run: ' + (Join-Path $PSScriptRoot 'Start-Bridge.jsx'))
Write-Output ('Setup notes: ' + (Join-Path $runtime 'CLAUDE-SETUP.md'))
