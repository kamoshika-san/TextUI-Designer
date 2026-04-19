#!/usr/bin/env node
/**
 * T-011: Git diff summary for package-contributes/ (fragment-level changes).
 * Usage: node scripts/diff-contributes-fragments.cjs [--markdown] [--base=branch]
 */
/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');

function parseBase(argv) {
  const hit = argv.find((a) => a.startsWith('--base='));
  if (hit) return hit.slice('--base='.length);
  const idx = argv.indexOf('--base');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return '';
}

function gitDiff(argsSuffix) {
  return execSync(`git ${argsSuffix}`, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024
  });
}

function main() {
  const argv = process.argv.slice(2);
  const markdown = argv.includes('--markdown') || argv.includes('--md');
  const base = parseBase(argv);

  const statSuffix = base
    ? `diff --stat ${base}...HEAD -- package-contributes/`
    : 'diff --stat -- package-contributes/';
  const patchSuffix = base ? `diff ${base}...HEAD -- package-contributes/` : 'diff -- package-contributes/';
  const statOut = gitDiff(statSuffix).trimEnd();
  const patchOut = gitDiff(patchSuffix).trimEnd();

  if (markdown) {
    console.log('## `package-contributes/` 差分');
    console.log('');
    if (base) console.log(`base: \`${base}\``);
    console.log('');
    console.log('```');
    console.log(statOut || '(変更なし)');
    console.log('```');
    console.log('');
    if (patchOut) {
      console.log('<details><summary>パッチ（折りたたみ）</summary>');
      console.log('');
      console.log('```diff');
      console.log(patchOut);
      console.log('```');
      console.log('');
      console.log('</details>');
    }
    return;
  }

  console.log('git diff package-contributes/');
  if (base) console.log(`(base: ${base})`);
  console.log('');
  console.log(statOut || '(変更なし)');
  if (patchOut) {
    console.log('');
    console.log('---');
    console.log(patchOut);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('[diff-contributes-fragments]', e.message || e);
    process.exitCode = 1;
  }
}
