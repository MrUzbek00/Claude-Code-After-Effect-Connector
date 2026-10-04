# Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `after-effects-bridge` missing in Claude Code | Run `Setup.ps1` again (or `claude mcp add after-effects-bridge --scope user -- node "<repo>\mcp\server.cjs"`), then restart Claude Code. Check with `claude mcp list`. |
| MCP server fails to start | `node` must be on the PATH Claude Code sees. Use the full path to `node.exe` in `claude mcp add` if it isn't. |
| Bridge is offline | Keep After Effects open, and run this checkout's `Start-Bridge.jsx` from **File → Scripts → Run Script File** |
| Scripting access warning | Turn on **Allow Scripts to Write Files and Access Network** in Scripting & Expressions preferences |
| File access denied | Use a private writable folder and check Windows permissions |
| PowerShell blocks scripts | Review the scripts and use the process-scoped `-ExecutionPolicy Bypass` as documented. Organization policy may require your administrator. |
| Another client is active | Wait for the first client to finish. A leftover `client.lock` file on its own is harmless. |
| Unresolved request | Inspect the saved result and the project state, then follow the recovery steps below |
| Heartbeat goes stale during an edit | Long scripts, renders and modal dialogs block the polling task. Don't submit a duplicate edit. |
| Timed out | Use the request ID with `ae_get_result` / `Get-BridgeResult.ps1`. The operation may still run. |
| Script reports a syntax or API error | Use After Effects ExtendScript (ES3), not modern JavaScript or Node. Check the API for your installed version. |
| Relative include or media file missing | Requests run from a snapshot. Use absolute paths. |
| Moved the repository | Stop the old bridge, re-run `Setup.ps1` from the new location (this re-registers MCP), then run the new location's `Start-Bridge.jsx` |

## Recover unresolved work

1. Read the request's result with `ae_get_result` or `Get-BridgeResult.ps1`, and inspect the After Effects project. A missing result is not evidence that the edit didn't happen.
2. Close any modal dialogs, and let the original bridge finish if it's still active. Don't run another copy of the request.
3. If the original process is gone or can't finish, work out whether project changes happened. Save a recovery copy if appropriate. Run `Stop-Bridge.jsx` once After Effects responds again, or close After Effects normally.
4. Only once you know what happened to the request, manually move that specific unresolved `.jsx` or `.running` file out of `local/inbox` to a private archive. Keep the `requests/` files for investigation. Stop the bridge first: moving a queued file while the bridge is polling races its execution.
5. Restart the bridge and do a read-only inspection before making further edits.

Don't clear the whole inbox as a routine fix, and don't replay `.running` or `.done` files. Restarting After Effects doesn't undo an edit or automatically recover an unsaved project.

## Stop and remove

Run `Stop-Bridge.jsx` inside After Effects to stop polling, or close After Effects. Then run `claude mcp remove after-effects-bridge --scope user` and delete the folder. There are no services, registry settings or Adobe extension packages to remove. Setup doesn't change After Effects preferences; restore the scripting preference by hand if you want to.
