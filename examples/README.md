# Examples

ExtendScript snippets for the `ae_run_script` MCP tool or `Invoke-AfterEffects.ps1 -ScriptPath`. You usually don't run these yourself. Ask Claude in plain language and it writes similar code. They're here as references and for testing the bridge.

| File | Changes the project? | What it does |
| --- | --- | --- |
| `../project-info.jsx` | No | Default connection check: version, project path, compositions |
| `active-composition.jsx` | No | Active composition's size, duration, frame rate and layer names |
| `add-title-layer.jsx` | Yes (one undo step) | Adds a centered white text layer |
| `fade-in-selected-layers.jsx` | Yes (one undo step) | Opacity fade-in on each selected layer |

Run one from PowerShell in the repository:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Invoke-AfterEffects.ps1 -ScriptPath .\examples\active-composition.jsx
```

Script rules: use an immediately invoked function that returns a plain object, use `var` and regular functions (ExtendScript is ES3), wrap edits in `app.beginUndoGroup` / `app.endUndoGroup`, and use absolute paths for assets. The bridge executes a snapshot copy in `local/requests`.
