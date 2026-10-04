# Architecture

```text
Claude Code
    | MCP stdio (tools/call)
mcp/server.cjs
    | spawns
Invoke-AfterEffects.ps1 / Test-Connection.ps1 / Get-BridgeResult.ps1
    | snapshot + wrapper, atomically stage request
local/inbox/<id>.jsx
    | app.scheduleTask polls every 500 ms
Start-Bridge.jsx inside After Effects
    | rename to .running, evaluate wrapper + snapshot
local/requests/<id>.json
    | read result
PowerShell -> mcp/server.cjs -> Claude Code
```

The MCP server is a thin, dependency-free adapter. All protocol rules (locking, heartbeat validation, snapshots, result publishing) live in the PowerShell clients and the ExtendScript files. That keeps one implementation, whether Claude goes through MCP or calls PowerShell directly.

The source root comes from each script's own path. All transient files live under `local/`:

- `heartbeat.txt`: Unix milliseconds, refreshed every ten polling ticks (about five seconds while idle).
- `client.lock`: an exclusive OS file handle held while a client is submitting or waiting. An empty leftover lock file is normal; the open handle is what provides the lock.
- `scripts/<uuid>.jsx`: temporary source written by `ae_run_script`, deleted after the call.
- `inbox/<id>.tmp`: staging file, renamed to `.jsx` only after writing finishes.
- `inbox/<id>.jsx`: queued wrapper.
- `inbox/<id>.jsx.running`: claimed by After Effects before execution.
- `inbox/<id>.jsx.running.done`: processed wrapper, kept for inspection.
- `requests/<id>.source.jsx`: frozen copy of the submitted source.
- `requests/<id>.jsx`: the generated wrapper, preserved.
- `requests/<id>.json`: the JSON success or error envelope, published atomically from a temporary file.

The client rejects stale or future-dated heartbeats and refuses to submit while a request is queued or running. A second client can't get the lock while the first is active. Timeouts leave work in place; they never cancel or replay it. A `.done` file alone doesn't prove success. The saved response and the actual project state are authoritative.

Only one active bridge is supported per After Effects process (global `$.global.__claudeAEBridge`). Starting a fresh bridge cancels the previous scheduled task in that process, but refuses to start if its inbox has unresolved work. `Stop-Bridge.jsx` cancels polling and removes the heartbeat. It can't interrupt a script that is already running.

The file protocol has no network transport and no shared token. Its trust boundary is operating-system access to the connector folder. Anyone who can write requests there can act with After Effects scripting privileges.
