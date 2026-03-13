import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectoryForFile, loadDslFromFile } from './io';
import { buildPlan } from './planner';
import { buildState, loadState, saveState } from './state-manager';
import {
  getProviderExtension,
  getProviderVersion,
  runExport,
  type CliProvider
} from './exporter-runner';
import { resolveDslTokens, type TokenErrorMode } from './theme-token-resolver';
import { resolveBatchOutputPath, resolveBatchStatePath } from './batch-path-resolver';
import type { CliState, ExitCode } from './types';
import { stableStringify } from './utils';
import { createApplyReporter, type ApplyFileReport } from './apply-reporter';
import { findStateForFile, getStateFingerprint, printJson, validateAcrossFiles } from './command-support-shared';

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
  onTokenWarnings?: (warnings: Array<{ path: string; message: string }>) => void;
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
  if (params.tokenOnError === 'warn' && tokenResolution.issues.length > 0 && params.onTokenWarnings) {
    params.onTokenWarnings(tokenResolution.issues);
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
  const reporter = createApplyReporter();
  const providerVersion = await getProviderVersion(params.provider, { providerModulePath: params.providerModulePath });
  const validation = validateAcrossFiles(params.filePaths, params.tokenOnError !== 'error');
  if (!validation.valid) {
    if (params.json) {
      printJson(validation);
    } else {
      reporter.printValidationErrors(validation);
    }
    return 2;
  }

  if (!params.autoApprove) {
    process.stderr.write('apply requires --auto-approve in non-interactive mode\n');
    return 1;
  }

  if (params.filePaths.length === 0) {
    reporter.printNoFiles(params.json);
    return 0;
  }

  const providerExtension = await getProviderExtension(params.provider, { providerModulePath: params.providerModulePath });
  const results: ApplyFileReport[] = [];
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
      tokenOnError: params.tokenOnError,
      onTokenWarnings: reporter.emitTokenWarnings
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
      reporter.printConflict(loaded.sourcePath);
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

  reporter.printResults(params.json, {
    files: results,
    changes: totalChanges,
    tokenWarnings: totalTokenWarnings
  }, {
    deterministic: params.deterministic,
    themePath: params.themePath,
    tokenOnError: params.tokenOnError
  });

  return 0;
}
