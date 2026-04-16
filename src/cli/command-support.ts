import * as fs from 'fs';
import * as path from 'path';
import { loadDslFromFile } from './io';
import { buildPlan } from './planner';
import {
  getArg,
  hasFlag,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parseOptionalPositiveNumber,
  parseThemePath,
  parseTokenErrorMode
} from './arg-options';
import type { CliState, PlanSummary } from './types';
import {
  findStateForFile,
  getStateFingerprint,
  printJson,
  validateAcrossFiles
} from './command-support-shared';

export {
  getArg,
  hasFlag,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parseOptionalPositiveNumber,
  parseThemePath,
  parseTokenErrorMode
};

export {
  findStateForFile,
  getStateFingerprint,
  printJson,
  validateAcrossFiles
};

export {
  applyAcrossFiles,
  applyForFile,
  renderWithDeterministicCheck,
  type ApplyForFileParams,
  type ApplyForFileResult
} from './apply-service';

export function emitTokenWarnings(warnings: Array<{ path: string; message: string }>): void {
  warnings.forEach(warning => {
    process.stderr.write(`⚠ token ${warning.path} ${warning.message}\n`);
  });
}

export function planAcrossFiles(filePaths: string[], state: CliState | null): PlanSummary {
  const files = filePaths.map(filePath => {
    const loaded = loadDslFromFile(filePath);
    const plan = buildPlan(loaded.dsl, findStateForFile(state, loaded.sourcePath));
    return {
      file: loaded.sourcePath,
      hasChanges: plan.hasChanges,
      changes: plan.changes
    };
  });

  return {
    hasChanges: files.some(file => file.hasChanges),
    changes: files.flatMap(file => file.changes.map(change => ({ ...change, path: `${file.file}::${change.path}` }))),
    files
  };
}

export function loadStatePayload(inputArg?: string): unknown {
  if (inputArg) {
    return JSON.parse(fs.readFileSync(path.resolve(inputArg), 'utf8'));
  }

  const stdin = fs.readFileSync(0, 'utf8').trim();
  if (!stdin) {
    throw new Error('state push requires JSON input from --input or stdin');
  }

  return JSON.parse(stdin);
}

export function printHelp(): void {
  process.stdout.write('Usage: textui <validate|plan|apply|export|capture|compare|flow|import|state|providers|lint|scaffold|version> ...\n');
  process.stdout.write('Options: --provider <name> --provider-module <path> --theme <path> --file <path> --dir <path> --json --token-on-error <error|warn|ignore>\n');
  process.stdout.write('Guide: docs/cli-user-guide.md\n');
  process.stdout.write('Workflows:\n');
  process.stdout.write('  Validate: textui validate --file <path> [--json]\n');
  process.stdout.write('  Plan: textui plan --file <path> [--state .textui/state.json] [--json]\n');
  process.stdout.write('  Apply: textui apply --file <path> --state .textui/state.json --auto-approve [--output <file>] [--provider <name>] [--json]\n');
  process.stdout.write('  Export: textui export --file <path> [--provider <name>] [--output <file>] [--json]\n');
  process.stdout.write('  Lint: textui lint --file <path> [--json]\n');
  process.stdout.write('  Scaffold: textui scaffold --screens <id1,id2,...> [--title <name>] [--output-dir <dir>] [--json]\n');
  process.stdout.write('Capture: textui capture --file <path> [--output <png>] [--theme <path>] [--use-webview-theme] [--extension-path <dir>] [--width <px>] [--height <px>] [--scale <n>] [--wait-ms <ms>] [--browser <path|name>] [--allow-no-sandbox] [--json]\n');
  process.stdout.write('Compare: textui compare --base <ref> --head <ref> --file <path> [--mode <human-readable|machine-readable>] [--output <file>] [--json]\n');
  process.stdout.write('Flow: textui flow <validate|compare|export> --file <path> [--json]\n');
  process.stdout.write('Import: textui import openapi --input <openapi.(yml|yaml|json)> [--operation <operationId>] [--all] [--output <file>|--output-dir <dir>] [--json]\n');
}
