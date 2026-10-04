'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const shell = process.env.AE_TEST_POWERSHELL || 'powershell.exe';
const examples = fs.readdirSync(path.join(root, 'examples')).filter(name => name.endsWith('.jsx')).map(name => 'examples/' + name);
for (const name of ['Start-Bridge.jsx', 'Stop-Bridge.jsx', 'project-info.jsx', 'scripts/request-wrapper.jsx', ...examples]) {
  new vm.Script(fs.readFileSync(path.join(root, name), 'utf8'), { filename: name });
}
const server = spawnSync(process.execPath, ['--check', path.join(root, 'mcp/server.cjs')], { encoding: 'utf8' });
if (server.status !== 0) { process.stderr.write(server.stderr); process.exit(1); }
const result = spawnSync(shell, ['-NoProfile', '-File', path.join(root, 'scripts/Check-Syntax.ps1')], { encoding: 'utf8' });
if (result.error) throw result.error;
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status || 1);
console.log('JSX syntax parsed (Node parser; actual ExtendScript compatibility needs Adobe verification).');
