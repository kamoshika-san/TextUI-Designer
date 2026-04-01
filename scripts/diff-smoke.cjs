/**
 * diff-smoke.cjs — Smoke script for the diff workflow config pipeline (T-20260401-009).
 *
 * Usage:
 *   node scripts/diff-smoke.cjs --axis=<local-only|ci-only|pr-enabled> [--dry-run]
 *
 * Selects the matching sample config file, loads it, resolves it, validates it,
 * and prints the result to stdout.
 *
 * --dry-run: skips any file writes and prints output only.
 * --axis:    which sample config to use (local-only, ci-only, pr-enabled).
 */

'use strict';

const path = require('path');
const {
  loadDiffWorkflowConfig,
  resolveDiffWorkflowConfig,
} = require('../out/workflow/diff/config/load-diff-workflow-config');
const {
  validateDiffWorkflowConfig,
} = require('../out/workflow/diff/config/validate-diff-workflow-config');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getFlag(name) {
  const prefix = `--${name}=`;
  for (const arg of args) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
    if (arg === `--${name}`) {
      return true;
    }
  }
  return undefined;
}

const axis = getFlag('axis');
const dryRun = getFlag('dry-run') !== undefined;

const VALID_AXES = ['local-only', 'ci-only', 'pr-enabled'];

if (!axis || !VALID_AXES.includes(axis)) {
  console.error(`ERROR: --axis must be one of: ${VALID_AXES.join(', ')}`);
  console.error('Usage: node scripts/diff-smoke.cjs --axis=<local-only|ci-only|pr-enabled> [--dry-run]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config file selection
// ---------------------------------------------------------------------------

const SAMPLE_CONFIG_MAP = {
  'local-only': 'config/diff-workflow.local-only.sample.json',
  'ci-only':    'config/diff-workflow.ci-only.sample.json',
  'pr-enabled': 'config/diff-workflow.pr-enabled.sample.json',
};

const configFilePath = path.resolve(__dirname, '..', SAMPLE_CONFIG_MAP[axis]);

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

console.log('=== diff-smoke: TextUI Diff Workflow Config Smoke Test ===');
console.log(`axis      : ${axis}`);
console.log(`dry-run   : ${dryRun}`);
console.log(`configFile: ${configFilePath}`);
console.log('');

// Step 1: Load raw file config.
const fileConfig = loadDiffWorkflowConfig(configFilePath);
console.log('[1] loadDiffWorkflowConfig result:');
console.log(JSON.stringify(fileConfig, null, 2));
console.log('');

// Step 2: Resolve — apply CLI/ENV overrides on top.
// In this smoke script, we pass --axis as a CLI override to demonstrate priority.
const resolved = resolveDiffWorkflowConfig({
  enablementAxis: axis,
  configFilePath,
});
console.log('[2] resolveDiffWorkflowConfig result:');
console.log(JSON.stringify(resolved, null, 2));
console.log('');

// Step 3: Validate for axis/feature consistency.
const validated = validateDiffWorkflowConfig(resolved);
console.log('[3] validateDiffWorkflowConfig result:');
console.log(JSON.stringify(validated, null, 2));
console.log('');

// Step 4: Summary.
if (validated.warnings.length > 0) {
  console.log('[!] Warnings:');
  for (const w of validated.warnings) {
    console.log(`    - ${w}`);
  }
} else {
  console.log('[OK] No warnings — config is consistent.');
}

if (dryRun) {
  console.log('');
  console.log('[dry-run] File writes skipped. Output printed above.');
}
