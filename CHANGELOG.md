# Changelog

## 1.0.0 - 2026-10-04

- Claude Code edition of the local After Effects ExtendScript/PowerShell file bridge (based on the Codex connector 1.1.0).
- New dependency-free MCP server (`mcp/server.cjs`) with `ae_status`, `ae_project_info`, `ae_run_script` and `ae_get_result`. It drives the same PowerShell clients, so both paths share one protocol.
- `Setup.ps1` registers the MCP server with Claude Code (`-SkipMcp` to skip) and writes `local/CLAUDE-SETUP.md`.
- `CLAUDE.md` with After Effects ExtendScript rules and safe timeout handling for Claude.
- New examples: add a title layer, fade in selected layers (each a single undo step).
- MCP tests run against the mocked After Effects host. CI covers Windows PowerShell 5.1 and PowerShell 7 on Node 20 and 22.
- Bridge global renamed to `$.global.__claudeAEBridge`, so it can run alongside the Codex bridge in the same After Effects session.

## Inherited from the original connector

- Request source snapshots and atomically published responses.
- Blocking of concurrent clients and of resubmission while a request is unresolved; startup is refused when unresolved inbox work exists.
- Handling of circular results, Unicode output, saved-result lookup, and source ZIP packaging.
