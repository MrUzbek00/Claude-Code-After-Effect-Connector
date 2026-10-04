#!/usr/bin/env node
'use strict';
// Dependency-free MCP stdio server for Claude Code. Each tool runs this checkout's PowerShell client,
// so the file protocol (locking, heartbeat, snapshots, saved results) lives in one place.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SHELL = process.env.AE_BRIDGE_POWERSHELL || 'powershell.exe';
const OFFLINE_HINT = 'In After Effects, run File > Scripts > Run Script File and select ' + path.join(ROOT, 'Start-Bridge.jsx');

function runClient(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(SHELL, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, script), ...args], { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('error', (e) => resolve({ code: -1, stdout: '', stderr: `Cannot start ${SHELL}: ${e.message}` }));
    child.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

// PowerShell prints exceptions with position info (5.1 "At ... +" lines, 7.x "Line | ~~~" view); keep the message.
function errorText(stderr) {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const request = lines.find((l) => /^Request [0-9a-f]{32};/.test(l));
  const tilde = lines.findIndex((l) => /^\|\s*~+$/.test(l));
  const message = tilde >= 0
    ? lines.slice(tilde + 1).filter((l) => l.startsWith('|')).map((l) => l.replace(/^\|\s*/, '')).join(' ')
    : lines
    .filter((l) => !/^(Request [0-9a-f]{32};|At |\+|CategoryInfo|FullyQualifiedErrorId|Exception:|Line \||\d+ \|)/.test(l))
    .map((l) => l.replace(/^\|\s*/, ''))
    .find((l) => l && !/^~+$/.test(l));
  return [message || stderr || 'Unknown error', request].filter(Boolean).join('\n');
}

function fromInvoke(r) {
  if (r.code === 0) return { text: r.stdout };
  if (r.stdout) return { text: r.stdout, isError: true };
  return { text: errorText(r.stderr), isError: true };
}

function timeoutArgs(a) {
  const t = a.timeoutSeconds === undefined ? 120 : Number(a.timeoutSeconds);
  if (!Number.isInteger(t) || t < 1 || t > 3600) throw new Error('timeoutSeconds must be an integer from 1 to 3600.');
  return ['-TimeoutSeconds', String(t)];
}

const TOOLS = [
  {
    name: 'ae_status',
    description: 'Check whether the After Effects bridge is running (heartbeat age) and list unresolved requests. Does not touch the project.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: async () => {
      const r = await runClient('Test-Connection.ps1');
      if (!r.stdout) return { text: errorText(r.stderr), isError: true };
      return { text: r.code === 0 ? r.stdout : `${r.stdout}\n\nBridge offline. ${OFFLINE_HINT}` };
    },
  },
  {
    name: 'ae_project_info',
    description: 'Read-only: After Effects version, project path, active item, and every composition (id, name, size, duration, frame rate, layer count).',
    inputSchema: { type: 'object', properties: { timeoutSeconds: { type: 'integer', minimum: 1, maximum: 3600 } } },
    annotations: { readOnlyHint: true },
    run: async (a) => fromInvoke(await runClient('Invoke-AfterEffects.ps1', timeoutArgs(a))),
  },
  {
    name: 'ae_run_script',
    description: 'Run ExtendScript (ES3) inside After Effects and return the value of the last evaluated expression as JSON. ' +
      'Pass `code`, or `scriptPath` for an existing .jsx file. Can modify the project: wrap edits in app.beginUndoGroup/endUndoGroup. ' +
      'A timeout does NOT cancel the script; never retry automatically, use ae_get_result with the request ID.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'ExtendScript source. Prefer an IIFE that returns plain data.' },
        scriptPath: { type: 'string', description: 'Absolute path to a .jsx file (alternative to code).' },
        timeoutSeconds: { type: 'integer', minimum: 1, maximum: 3600, description: 'Wait time, default 120.' },
      },
    },
    run: async (a) => {
      if ((typeof a.code === 'string') === (typeof a.scriptPath === 'string')) throw new Error('Pass exactly one of code or scriptPath.');
      const args = timeoutArgs(a);
      let temp = null;
      let scriptPath = a.scriptPath;
      if (typeof a.code === 'string') {
        const dir = path.join(ROOT, 'local', 'scripts');
        fs.mkdirSync(dir, { recursive: true });
        temp = path.join(dir, crypto.randomUUID() + '.jsx');
        fs.writeFileSync(temp, a.code, 'utf8');
        scriptPath = temp;
      }
      try {
        // The client snapshots the source before queuing, so the temp file can go afterwards.
        return fromInvoke(await runClient('Invoke-AfterEffects.ps1', ['-ScriptPath', scriptPath, ...args]));
      } finally {
        if (temp) fs.rmSync(temp, { force: true });
      }
    },
  },
  {
    name: 'ae_get_result',
    description: 'Look up the saved result of an earlier request by its 32-character ID (e.g. after a timeout). Never re-executes anything.',
    inputSchema: { type: 'object', properties: { requestId: { type: 'string', pattern: '^[a-fA-F0-9]{32}$' } }, required: ['requestId'] },
    annotations: { readOnlyHint: true },
    run: async (a) => {
      if (!/^[a-fA-F0-9]{32}$/.test(String(a.requestId))) throw new Error('requestId must be 32 hex characters.');
      const r = await runClient('Get-BridgeResult.ps1', ['-RequestId', a.requestId]);
      if (r.code === 0) return { text: r.stdout };
      if (r.code === 2) return { text: r.stdout };
      return { text: r.stdout || errorText(r.stderr), isError: true };
    },
  },
];

function reply(id, result, error) {
  process.stdout.write(JSON.stringify(error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result }) + '\n');
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notification
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'after-effects-bridge', version: '1.0.0' },
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return reply(id, null, { code: -32602, message: 'Unknown tool' });
      try {
        const out = await tool.run(params.arguments || {});
        return reply(id, { content: [{ type: 'text', text: out.text }], isError: !!out.isError });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: String(e.message) }], isError: true });
      }
    }
    default:
      return reply(id, null, { code: -32601, message: 'Method not found' });
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});
