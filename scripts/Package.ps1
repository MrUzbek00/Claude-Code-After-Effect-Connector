#Requires -Version 5.1
# Builds a shareable source ZIP from an explicit allowlist, so local/ runtime data can never be included.
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -Raw (Join-Path $root 'package.json') | ConvertFrom-Json).version
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$output = Join-Path $dist ('Claude-After-Effects-Bridge-' + $version + '-source.zip')
$names = @('.gitignore', '.gitattributes', 'LICENSE', 'CLAUDE.md', 'README.md', 'SECURITY.md', 'CHANGELOG.md',
    'requirements.txt', 'package.json', 'Setup.ps1', 'Start-Bridge.jsx', 'Stop-Bridge.jsx',
    'Invoke-AfterEffects.ps1', 'Test-Connection.ps1', 'Get-BridgeResult.ps1', 'project-info.jsx', 'mcp/server.cjs',
    'scripts/Package.ps1', 'scripts/Check-Syntax.ps1', 'scripts/check.cjs', 'scripts/request-wrapper.jsx',
    'test/bridge.test.cjs', 'examples/README.md', 'examples/active-composition.jsx', 'examples/add-title-layer.jsx',
    'examples/fade-in-selected-layers.jsx', 'docs/CLAUDE-CODE.md', 'docs/ARCHITECTURE.md', 'docs/TROUBLESHOOTING.md',
    'docs/images/banner.jpg', '.github/workflows/ci.yml')
foreach ($name in $names) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $name) -PathType Leaf)) { throw ('Missing source file: ' + $name) }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [IO.File]::Open($output, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
$archive = $null
try {
    $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
    foreach ($name in $names) {
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root $name), $name, [IO.Compression.CompressionLevel]::Optimal)
    }
} finally {
    if ($null -ne $archive) { $archive.Dispose() }
    $stream.Dispose()
}
Write-Output ('Shareable source archive: ' + $output)
