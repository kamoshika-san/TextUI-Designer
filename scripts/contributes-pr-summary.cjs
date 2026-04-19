#!/usr/bin/env node
/**
 * T-011: Single stdout block for pasting into a PR (inspect + fragment diff, Markdown).
 */
/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function runNode(rel) {
  return execSync(`node ${rel}`, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

const argv = process.argv.slice(2);
const basePair = (() => {
  const eq = argv.find((a) => a.startsWith('--base='));
  if (eq) return eq;
  const i = argv.indexOf('--base');
  if (i >= 0 && argv[i + 1]) return `--base=${argv[i + 1]}`;
  return '';
})();
const diffArgs = basePair
  ? `./scripts/diff-contributes-fragments.cjs --markdown ${basePair}`
  : './scripts/diff-contributes-fragments.cjs --markdown';

console.log(runNode('./scripts/inspect-contributes.cjs --markdown').trimEnd());
console.log('\n---\n');
console.log(runNode(diffArgs).trimEnd());
