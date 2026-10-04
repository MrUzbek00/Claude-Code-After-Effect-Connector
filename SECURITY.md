# Security and privacy

The bridge runs ExtendScript in After Effects under your user account. Scripts can modify projects and access any file Adobe's scripting preferences allow. Save copies of your projects, and run only operations you asked for and reviewed.

The connector communicates only through local files. It opens no network listener and makes no external API calls. The MCP server talks to Claude Code over stdio and starts local PowerShell processes. There is no authentication token: file system permissions are the security boundary. Keep the folder private and writable only by you. Never run the live inbox from a shared or publicly writable folder.

`local/requests` holds executable source snapshots and JSON results that contain project names, paths, text and other project metadata. `local/inbox` keeps processed wrappers. `.gitignore` excludes all runtime data, so never force-add it. To share the project, use `scripts/Package.ps1` (which builds from an explicit file allowlist) or a GitHub source archive. Review custom scripts before committing them, since they can contain private paths or data.

Results returned through MCP are sent to Claude as tool output, under your Claude account's normal data handling. The bridge doesn't bundle Adobe software or copy any credentials.

Timeouts and interrupted clients don't cancel operations. Never retry an edit automatically just because its response is missing. Stop polling and inspect the project before clearing unresolved work by hand.

Report security issues privately to the repository owner, or through GitHub private vulnerability reporting if it is enabled. Don't include private project data in public issues.
