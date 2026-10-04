# Using the bridge from Claude Code

## With MCP (recommended)

`Setup.ps1` registers the server at user scope, so it works in every Claude Code project:

```
claude mcp add after-effects-bridge --scope user -- node "<repo>\mcp\server.cjs"
```

Restart Claude Code. `/mcp` (CLI) shows the server and its four tools. Each tool call starts the matching PowerShell client from this checkout, so the MCP server and the scripts always behave the same way.

| Tool | Arguments | Client it runs |
| --- | --- | --- |
| `ae_status` | none | `Test-Connection.ps1` |
| `ae_project_info` | `timeoutSeconds?` | `Invoke-AfterEffects.ps1` (runs `project-info.jsx`) |
| `ae_run_script` | `code` **or** `scriptPath`, `timeoutSeconds?` | `Invoke-AfterEffects.ps1 -ScriptPath` |
| `ae_get_result` | `requestId` | `Get-BridgeResult.ps1` |

`ae_run_script` with `code` writes the source to `local/scripts/<uuid>.jsx`, submits it, and deletes it afterwards. The client keeps its own snapshot in `local/requests`.

To use PowerShell 7 instead of Windows PowerShell, register the server with `-e AE_BRIDGE_POWERSHELL=pwsh.exe`.

## Without MCP

Claude Code can call the clients through its shell tool. Open this folder in Claude Code, where `CLAUDE.md` is picked up automatically, and allow PowerShell commands:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Test-Connection.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Invoke-AfterEffects.ps1 -ScriptPath 'C:\Work\edit.jsx' -TimeoutSeconds 120
```

Run the clients as child processes, because they report status with `exit` codes.

## Script contract

`app` is the After Effects application object. The value of the script's last evaluated expression becomes `data` in the response. Use an IIFE that returns plain data. `undefined` and non-finite numbers become `null`. Cycles, functions, or nesting deeper than 50 levels produce an error response. Reduce host objects to primitive fields before returning them.

Responses look like this:

```json
{"ok": true,  "requestId": "<32 hex>", "data": { ... }}
{"ok": false, "requestId": "<32 hex>", "error": "Error: ...", "line": 12}
```

## Exit codes (PowerShell clients)

| Command | Exit 0 | Exit 1 | Exit 2 |
| --- | --- | --- | --- |
| `Invoke-AfterEffects.ps1` | `ok: true` result | Script error, offline, validation failure, or timeout | — |
| `Get-BridgeResult.ps1` | Saved successful result | Saved failure or invalid input | No completed result yet |
| `Test-Connection.ps1` | Fresh heartbeat | No fresh heartbeat | — |

Status lines (the request ID and result path) go to stderr. stdout carries only JSON. In MCP, an exit 1 becomes `isError: true`, and the saved JSON or a short error message is returned.

## Heartbeat

The heartbeat is refreshed about every 5 seconds while the bridge is idle, and counts as stale after 15 seconds. During a long script, a render, or a modal dialog it can go stale even though the bridge is fine. A completed `ae_project_info` call is the stronger connection check.
