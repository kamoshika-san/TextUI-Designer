import * as fs from 'fs';
import * as path from 'path';
import {
  ensureDirectoryForFile,
  loadDslFromFile
} from './io';
import { validateDsl } from './validator';
import { validateIncludeReferences } from './include-validator';
import { buildPlan } from './planner';
import { buildState, loadState, saveState, stateToStableJson } from './state-manager';
import {
  getProviderExtension,
  getProviderVersion,
  runExport,
  type CliProvider
} from './exporter-runner';
import { resolveDslTokens, type TokenErrorMode } from './theme-token-resolver';
import { resolveBatchOutputPath, resolveBatchStatePath } from './batch-path-resolver';
import {
  getArg,
  hasFlag,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parseOptionalPositiveNumber,
  parseThemePath,
  parseTokenErrorMode
} from './arg-options';
import type { CliState, ExitCode, PlanSummary, ValidationSummary } from './types';
import { sha256, stableStringify } from './utils';

export {
  getArg,
  hasFlag,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parseOptionalPositiveNumber,
  parseThemePath,
  parseTokenErrorMode
};


export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function emitTokenWarnings(warnings: Array<{ path: string; message: string }>): void {
  warnings.forEach(warning => {
    process.stderr.write(`⚠ token ${warning.path} ${warning.message}\n`);
  });
}

export function validateAcrossFiles(filePaths: string[], skipTokenValidation: boolean = false): ValidationSummary {
  const files = filePaths.map(filePath => {
    const loaded = loadDslFromFile(filePath);
    const result = validateDsl(loaded.dsl, {
      sourcePath: loaded.sourcePath,
      skipTokenValidation
    });
    const includeIssues = validateIncludeReferences(loaded.dsl, loaded.sourcePath);
    const issues = [...result.issues, ...includeIssues].map(issue => ({ ...issue, file: loaded.sourcePath }));
    return {
      file: loaded.sourcePath,
      valid: result.valid && includeIssues.length === 0,
      issues
    };
  });

  return {
    valid: files.every(file => file.valid),
    issues: files.flatMap(file => file.issues),
    files
  };
}

export function findStateForFile(state: CliState | null, filePath: string): CliState | null {
  if (!state) {
    return null;
  }
  const stateEntryPath = path.resolve(state.dsl.entry);
  if (stateEntryPath !== filePath) {
    return null;
  }
  return state;
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

export function getStateFingerprint(state: CliState | null): string {
  if (!state) {
    return 'absent';
  }
  return sha256(stateToStableJson(state));
}

function toDeterministicDsl<T>(dsl: T): T {
  return JSON.parse(stableStringify(dsl)) as T;
}

export async function renderWithDeterministicCheck(params: {
  dsl: Parameters<typeof runExport>[0];
  provider: CliProvider;
  providerModulePath?: string;
  themePath?: string;
  deterministic: boolean;
}): Promise<string> {
  if (!params.deterministic) {
    return runExport(params.dsl, params.provider, {
      providerModulePath: params.providerModulePath,
      themePath: params.themePath
    });
  }

  const deterministicDsl = toDeterministicDsl(params.dsl);
  const first = await runExport(deterministicDsl, params.provider, {
    providerModulePath: params.providerModulePath,
    themePath: params.themePath
  });
  const second = await runExport(deterministicDsl, params.provider, {
    providerModulePath: params.providerModulePath,
    themePath: params.themePath
  });
  if (first !== second) {
    throw new Error('deterministic export check failed: provider output is not stable');
  }
  return first;
}

export interface ApplyForFileParams {
  loaded: ReturnType<typeof loadDslFromFile>;
  statePath: string;
  outputPath: string;
  planState: CliState | null;
  expectedStateFingerprint: string;
  provider: CliProvider;
  providerVersion: string;
  providerModulePath?: string;
  themePath?: string;
  deterministic: boolean;
  tokenOnError: TokenErrorMode;
}

export interface ApplyForFileResult {
  applied: boolean;
  conflict: boolean;
  changes: number;
  tokenWarnings: number;
}

export async function applyForFile(params: ApplyForFileParams): Promise<ApplyForFileResult> {
  const plan = buildPlan(params.loaded.dsl, params.planState);
  if (!plan.hasChanges) {
    return {
      applied: false,
      conflict: false,
      changes: 0,
      tokenWarnings: 0
    };
  }

  const tokenResolution = resolveDslTokens({
    dsl: params.loaded.dsl,
    sourcePath: params.loaded.sourcePath,
    onError: params.tokenOnError
  });
  if (params.tokenOnError === 'warn' && tokenResolution.issues.length > 0) {
    emitTokenWarnings(tokenResolution.issues);
  }

  const content = await renderWithDeterministicCheck({
    dsl: tokenResolution.dsl,
    provider: params.provider,
    providerModulePath: params.providerModulePath,
    themePath: params.themePath,
    deterministic: params.deterministic
  });
  ensureDirectoryForFile(params.outputPath);
  fs.writeFileSync(params.outputPath, content, 'utf8');

  const nextState = buildState({
    entry: path.relative(process.cwd(), params.loaded.sourcePath),
    provider: params.provider,
    providerVersion: params.providerVersion,
    dsl: tokenResolution.dsl,
    dslRaw: params.loaded.raw,
    artifacts: [{ file: path.relative(process.cwd(), params.outputPath), content }]
  });

  const latestState = loadState(params.statePath);
  const latestStateFingerprint = getStateFingerprint(latestState);
  if (latestStateFingerprint !== params.expectedStateFingerprint) {
    return {
      applied: true,
      conflict: true,
      changes: 0,
      tokenWarnings: 0
    };
  }

  saveState(params.statePath, nextState);
  return {
    applied: true,
    conflict: false,
    changes: plan.changes.length,
    tokenWarnings: tokenResolution.issues.length
  };
}

export async function applyAcrossFiles(params: {
  filePaths: string[];
  rootDir: string;
  provider: CliProvider;
  providerModulePath?: string;
  themePath?: string;
  deterministic: boolean;
  tokenOnError: TokenErrorMode;
  autoApprove: boolean;
  outputArg?: string;
  stateArg?: string;
  json: boolean;
}): Promise<ExitCode> {
  const providerVersion = await getProviderVersion(params.provider, { providerModulePath: params.providerModulePath });
  const validation = validateAcrossFiles(params.filePaths, params.tokenOnError !== 'error');
  if (!validation.valid) {
    if (params.json) {
      printJson(validation);
    } else {
      validation.files.forEach(file => {
        process.stderr.write(`✖ invalid: ${file.file}\n`);
        file.issues.forEach(issue => {
          process.stderr.write(`  - ${issue.path ?? '/'} ${issue.message}\n`);
        });
      });
    }
    return 2;
  }

  if (!params.autoApprove) {
    process.stderr.write('apply requires --auto-approve in non-interactive mode\n');
    return 1;
  }

  if (params.filePaths.length === 0) {
    if (params.json) {
      printJson({ applied: false, files: [], changes: 0 });
    } else {
      process.stdout.write('No DSL files found.\n');
    }
    return 0;
  }

  const providerExtension = await getProviderExtension(params.provider, { providerModulePath: params.providerModulePath });
  const results: Array<{
    file: string;
    output: string;
    state: string;
    changes: number;
    applied: boolean;
    tokenWarnings: number;
  }> = [];
  let totalChanges = 0;
  let totalTokenWarnings = 0;

  for (const filePath of params.filePaths) {
    const loaded = loadDslFromFile(filePath);
    const outputPath = resolveBatchOutputPath({
      filePath: loaded.sourcePath,
      rootDir: params.rootDir,
      providerExtension,
      outputArg: params.outputArg
    });
    const statePath = resolveBatchStatePath({
      filePath: loaded.sourcePath,
      rootDir: params.rootDir,
      stateArg: params.stateArg
    });
    const state = loadState(statePath);
    const initialStateFingerprint = getStateFingerprint(state);
    const execution = await applyForFile({
      loaded,
      statePath,
      outputPath,
      planState: findStateForFile(state, loaded.sourcePath),
      expectedStateFingerprint: initialStateFingerprint,
      provider: params.provider,
      providerVersion,
      providerModulePath: params.providerModulePath,
      themePath: params.themePath,
      deterministic: params.deterministic,
      tokenOnError: params.tokenOnError
    });

    if (!execution.applied) {
      results.push({
        file: loaded.sourcePath,
        output: outputPath,
        state: statePath,
        changes: 0,
        applied: false,
        tokenWarnings: 0
      });
      continue;
    }

    if (execution.conflict) {
      process.stderr.write(`state conflict detected: ${loaded.sourcePath}\n`);
      return 4;
    }
    totalChanges += execution.changes;
    totalTokenWarnings += execution.tokenWarnings;
    results.push({
      file: loaded.sourcePath,
      output: outputPath,
      state: statePath,
      changes: execution.changes,
      applied: true,
      tokenWarnings: execution.tokenWarnings
    });
  }

  if (params.json) {
    printJson({
      applied: true,
      files: results,
      changes: totalChanges,
      deterministic: params.deterministic,
      themePath: params.themePath,
      tokenOnError: params.tokenOnError,
      tokenWarnings: totalTokenWarnings
    });
  } else {
    results.forEach(result => {
      if (result.applied) {
        process.stdout.write(`Applied ${result.changes} change(s): ${result.file}\n`);
      } else {
        process.stdout.write(`No changes: ${result.file}\n`);
      }
      process.stdout.write(`  output: ${result.output}\n`);
      process.stdout.write(`  state: ${result.state}\n`);
      if (result.tokenWarnings > 0) {
        process.stdout.write(`  token-warnings: ${result.tokenWarnings}\n`);
      }
    });
  }

  return 0;
}

export function printHelp(): void {
  process.stdout.write('Usage: textui <validate|plan|apply|export|capture|import|state|providers|version> ...\n');
  process.stdout.write('Options: --provider <name> --provider-module <path> --theme <path> --file <path> --dir <path> --json --token-on-error <error|warn|ignore>\n');
  process.stdout.write('Capture: textui capture --file <path> [--output <png>] [--theme <path>] [--width <px>] [--height <px>] [--scale <n>] [--wait-ms <ms>] [--browser <path|name>] [--allow-no-sandbox] [--json]\n');
  process.stdout.write('Import: textui import openapi --input <openapi.(yml|yaml|json)> [--operation <operationId>] [--all] [--output <file>|--output-dir <dir>] [--json]\n');
}
