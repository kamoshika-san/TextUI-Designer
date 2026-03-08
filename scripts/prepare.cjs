#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const requiredOutputs = ['out/cli/index.js', 'out/extension.js', 'out/mcp/server.js'];

const missingOutputs = requiredOutputs.filter(file => !fs.existsSync(path.resolve(file)));

if (missingOutputs.length === 0) {
  console.log('[prepare] Build outputs already exist. Skipping compile.');
  process.exit(0);
}

console.log(`[prepare] Missing build outputs: ${missingOutputs.join(', ')}`);
console.log('[prepare] Running compile...');

const result = spawnSync('npm', ['run', 'compile'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
