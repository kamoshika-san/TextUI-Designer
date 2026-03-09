#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import {
  ensureDirectoryForFile,
  loadDslFromFile,
  resolveDslFile,
  resolveDslFiles
} from './io';
import { validateDsl } from './validator';
import { validateIncludeReferences } from './include-validator';
import { buildPlan } from './planner';
import { buildState, DEFAULT_STATE_PATH, loadState, saveState, stateToStableJson } from './state-manager';
import { importAllOpenApiToDsl, importOpenApiToDsl } from './openapi-importer';
import {
  getProviderExtension,
  getProviderVersion,
  getSupportedProviderNames,
  isSupportedProvider,
  loadExternalProvider,
  runExport,
  type CliProvider
} from './exporter-runner';
import { resolveDslTokens, type TokenErrorMode } from './theme-token-resolver';
import type { CliState, ExitCode, PlanSummary, ValidationSummary } from './types';
import { sha256, stableStringify } from './utils';
import { capturePreviewImageFromDsl } from '../utils/preview-capture';

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function parseTokenErrorMode(): TokenErrorMode {
  const mode = (getArg('--token-on-error') ?? 'error').toLowerCase();
  if (mode === 'error' || mode === 'warn' || mode === 'ignore') {
    return mode;
  }
  throw new Error(`invalid --token-on-error value: ${mode}. expected: error|warn|ignore`);
}

function parseOptionalPositiveInt(flag: string): number | undefined {
  const value = getArg(flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid ${flag} value: ${value}. expected positive integer`);
  }
  return parsed;
}

function parseOptionalPositiveNumber(flag: string): number | undefined {
  const value = getArg(flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid ${flag} value: ${value}. expected positive number`);
  }
  return parsed;
}

function parseOptionalNonNegativeInt(flag: string): number | undefined {
  const value = getArg(flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid ${flag} value: ${value}. expected non-negative integer`);
  }
  return parsed;
}

function emitTokenWarnings(warnings: Array<{ path: string; message: string }>): void {
  warnings.forEach(warning => {
    process.stderr.write(`⚠ token ${warning.path} ${warning.message}\n`);
  });
}

function validateAcrossFiles(filePaths: string[], skipTokenValidation: boolean = false): ValidationSummary {
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

function findStateForFile(state: CliState | null, filePath: string): CliState | null {
  if (!state) {
    return null;
  }
  const stateEntryPath = path.resolve(state.dsl.entry);
  if (stateEntryPath !== filePath) {
    return null;
  }
  return state;
}

function planAcrossFiles(filePaths: string[], state: CliState | null): PlanSummary {
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

function loadStatePayload(inputArg?: string): unknown {
  if (inputArg) {
    return JSON.parse(fs.readFileSync(path.resolve(inputArg), 'utf8'));
  }

  const stdin = fs.readFileSync(0, 'utf8').trim();
  if (!stdin) {
    throw new Error('state push requires JSON input from --input or stdin');
  }

  return JSON.parse(stdin);
}

function getStateFingerprint(state: CliState | null): string {
  if (!state) {
    return 'absent';
  }
  return sha256(stateToStableJson(state));
}

function toDeterministicDsl<T>(dsl: T): T {
  return JSON.parse(stableStringify(dsl)) as T;
}

function stripDslExtension(filePath: string): string {
  return filePath.replace(/\.tui\.ya?ml$/i, '');
}

function assertDirectoryTarget(targetPath: string, flagName: '--output' | '--state'): void {
  if (fs.existsSync(targetPath) && !fs.statSync(targetPath).isDirectory()) {
    throw new Error(`${flagName} must be a directory when used with --dir: ${targetPath}`);
  }
}

function resolveBatchOutputPath(params: {
  filePath: string;
  rootDir: string;
  providerExtension: string;
  outputArg?: string;
}): string {
  const outputRoot = path.resolve(params.outputArg ?? 'generated');
  assertDirectoryTarget(outputRoot, '--output');
  const relativeDslPath = path.relative(params.rootDir, params.filePath);
  const outputBase = stripDslExtension(relativeDslPath);
  return path.join(outputRoot, `${outputBase}${params.providerExtension}`);
}

function resolveBatchStatePath(params: {
  filePath: string;
  rootDir: string;
  stateArg?: string;
}): string {
  const stateRoot = path.resolve(params.stateArg ?? '.textui/state');
  assertDirectoryTarget(stateRoot, '--state');
  const relativeDslPath = path.relative(params.rootDir, params.filePath);
  const stateBase = stripDslExtension(relativeDslPath);
  return path.join(stateRoot, `${stateBase}.state.json`);
}

async function renderWithDeterministicCheck(params: {
  dsl: Parameters<typeof runExport>[0];
  provider: CliProvider;
  providerModulePath?: string;
  deterministic: boolean;
}): Promise<string> {
  if (!params.deterministic) {
    return runExport(params.dsl, params.provider, { providerModulePath: params.providerModulePath });
  }

  const deterministicDsl = toDeterministicDsl(params.dsl);
  const first = await runExport(deterministicDsl, params.provider, { providerModulePath: params.providerModulePath });
  const second = await runExport(deterministicDsl, params.provider, { providerModulePath: params.providerModulePath });
  if (first !== second) {
    throw new Error('deterministic export check failed: provider output is not stable');
  }
  return first;
}

async function applyAcrossFiles(params: {
  filePaths: string[];
  rootDir: string;
  provider: CliProvider;
  providerModulePath?: string;
  deterministic: boolean;
  tokenOnError: TokenErrorMode;
  autoApprove: boolean;
  outputArg?: string;
  stateArg?: string;
  json: boolean;
}): Promise<ExitCode> {
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
    const plan = buildPlan(loaded.dsl, findStateForFile(state, loaded.sourcePath));

    if (!plan.hasChanges) {
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

    const tokenResolution = resolveDslTokens({
      dsl: loaded.dsl,
      sourcePath: loaded.sourcePath,
      onError: params.tokenOnError
    });
    if (params.tokenOnError === 'warn' && tokenResolution.issues.length > 0) {
      emitTokenWarnings(tokenResolution.issues);
    }

    const content = await renderWithDeterministicCheck({
      dsl: tokenResolution.dsl,
      provider: params.provider,
      providerModulePath: params.providerModulePath,
      deterministic: params.deterministic
    });
    ensureDirectoryForFile(outputPath);
    fs.writeFileSync(outputPath, content, 'utf8');

    const nextState = buildState({
      entry: path.relative(process.cwd(), loaded.sourcePath),
      provider: params.provider,
      providerVersion: await getProviderVersion(params.provider, { providerModulePath: params.providerModulePath }),
      dsl: tokenResolution.dsl,
      dslRaw: loaded.raw,
      artifacts: [{ file: path.relative(process.cwd(), outputPath), content }]
    });

    const latestState = loadState(statePath);
    const latestStateFingerprint = getStateFingerprint(latestState);
    if (latestStateFingerprint !== initialStateFingerprint) {
      process.stderr.write(`state conflict detected: ${loaded.sourcePath}\n`);
      return 4;
    }

    saveState(statePath, nextState);
    totalChanges += plan.changes.length;
    totalTokenWarnings += tokenResolution.issues.length;
    results.push({
      file: loaded.sourcePath,
      output: outputPath,
      state: statePath,
      changes: plan.changes.length,
      applied: true,
      tokenWarnings: tokenResolution.issues.length
    });
  }

  if (params.json) {
    printJson({
      applied: true,
      files: results,
      changes: totalChanges,
      deterministic: params.deterministic,
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


async function run(): Promise<ExitCode> {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write('Usage: textui <validate|plan|apply|export|capture|import|state|providers|version> ...\n');
    process.stdout.write('Options: --provider <name> --provider-module <path> --file <path> --dir <path> --json --token-on-error <error|warn|ignore>\n');
    process.stdout.write('Capture: textui capture --file <path> [--output <png>] [--width <px>] [--height <px>] [--scale <n>] [--wait-ms <ms>] [--browser <path|name>] [--allow-no-sandbox] [--json]\n');
    process.stdout.write('Import: textui import openapi --input <openapi.(yml|yaml|json)> [--operation <operationId>] [--all] [--output <file>|--output-dir <dir>] [--json]\n');
    return 0;
  }

  if (command === 'version') {
    process.stdout.write('textui-cli 0.1.0\n');
    return 0;
  }

  if (command === 'import') {
    const sub = process.argv[3];
    if (sub !== 'openapi') {
      process.stderr.write(`unsupported import target: ${sub ?? '(missing)'}\n`);
      return 1;
    }

    const inputPathArg = getArg('--input');
    if (!inputPathArg) {
      process.stderr.write('import openapi requires --input <path>\n');
      return 1;
    }

    const inputPath = path.resolve(inputPathArg);
    const importAll = hasFlag('--all');
    const operationId = getArg('--operation');
    if (importAll && operationId) {
      process.stderr.write('import openapi: --all and --operation cannot be used together\n');
      return 1;
    }

    if (importAll) {
      const outputDir = path.resolve(getArg('--output-dir') ?? getArg('--output') ?? 'generated/from-openapi');
      fs.mkdirSync(outputDir, { recursive: true });
      const importedList = importAllOpenApiToDsl({ inputPath });
      const files = importedList.map(item => {
        const safeName = item.operationId.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
        const filePath = path.join(outputDir, `${safeName || 'operation'}.tui.yml`);
        ensureDirectoryForFile(filePath);
        fs.writeFileSync(filePath, item.yaml, 'utf8');
        return {
          operationId: item.operationId,
          sourceOperation: item.sourceOperation,
          fields: item.fields,
          output: filePath
        };
      });

      if (hasFlag('--json')) {
        printJson({
          imported: true,
          mode: 'all',
          input: inputPath,
          generated: files.length,
          files
        });
      } else {
        process.stdout.write(`Imported ${files.length} OpenAPI operations -> ${outputDir}\n`);
        files.forEach(file => {
          process.stdout.write(`  - ${file.operationId} (${file.sourceOperation}) -> ${file.output} [fields=${file.fields}]\n`);
        });
      }
      return 0;
    }

    const imported = importOpenApiToDsl({
      inputPath,
      operationId
    });
    const output = path.resolve(getArg('--output') ?? 'generated/from-openapi.tui.yml');
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, imported.yaml, 'utf8');

    if (hasFlag('--json')) {
      printJson({
        imported: true,
        mode: 'single',
        input: inputPath,
        output,
        operationId: imported.operationId,
        sourceOperation: imported.sourceOperation,
        fields: imported.fields
      });
    } else {
      process.stdout.write(`Imported OpenAPI operation ${imported.operationId} -> ${output}\n`);
      process.stdout.write(`  source: ${imported.sourceOperation}\n`);
      process.stdout.write(`  fields: ${imported.fields}\n`);
    }

    return 0;
  }



  if (command === 'providers') {
    const providerModulePath = getArg('--provider-module');
    const builtinNames = await getSupportedProviderNames();
    const providers = await Promise.all(
      builtinNames.map(async name => ({
        name,
        extension: await getProviderExtension(name),
        version: await getProviderVersion(name),
        source: 'builtin'
      }))
    );

    if (providerModulePath) {
      const externalProvider = await loadExternalProvider(providerModulePath);
      providers.push({
        name: externalProvider.name,
        extension: externalProvider.extension,
        version: externalProvider.version,
        source: 'external'
      });
      providers.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (hasFlag('--json')) {
      printJson({ providers });
    } else {
      providers.forEach(provider => {
        process.stdout.write(`${provider.name}\t${provider.extension}\t${provider.version}\n`);
      });
    }

    return 0;
  }

  if (command === 'state') {
    const sub = process.argv[3] ?? 'show';
    const statePath = path.resolve(getArg('--state') ?? DEFAULT_STATE_PATH);
    const state = loadState(statePath);

    if (sub === 'show' || sub === 'pull') {
      if (!state) {
        process.stderr.write(`state not found: ${statePath}\n`);
        return 1;
      }
      if (hasFlag('--json')) {
        printJson(state);
      } else {
        process.stdout.write(`${stateToStableJson(state)}\n`);
      }
      return 0;
    }

    if (sub === 'push') {
      const payload = loadStatePayload(getArg('--input')) as CliState;
      saveState(statePath, payload);
      if (hasFlag('--json')) {
        printJson({ pushed: true, state: statePath, resources: payload.resources?.length ?? 0 });
      } else {
        process.stdout.write(`state pushed: ${statePath}\n`);
      }
      return 0;
    }

    if (sub === 'rm') {
      if (!state) {
        process.stderr.write(`state not found: ${statePath}\n`);
        return 1;
      }
      const id = getArg('--id');
      if (!id) {
        process.stderr.write('state rm requires --id <resource-id>\n');
        return 1;
      }
      const before = state.resources.length;
      state.resources = state.resources.filter(resource => resource.id !== id);
      saveState(statePath, state);
      const removed = before - state.resources.length;
      if (hasFlag('--json')) {
        printJson({ removed, id, state: statePath });
      } else {
        process.stdout.write(`removed ${removed} resource(s): ${id}\n`);
      }
      return 0;
    }

    process.stderr.write(`unsupported state command: ${sub}\n`);
    return 1;
  }

  const fileArg = getArg('--file');
  const dirArg = getArg('--dir');

  if (command === 'capture') {
    if (dirArg) {
      process.stderr.write('capture does not support --dir. use --file <path>\n');
      return 1;
    }

    const filePath = resolveDslFile(fileArg);
    const loaded = loadDslFromFile(filePath);
    const validation = validateDsl(loaded.dsl, {
      sourcePath: loaded.sourcePath,
      skipTokenValidation: true
    });
    if (!validation.valid) {
      if (hasFlag('--json')) {
        printJson({ valid: false, issues: validation.issues });
      } else {
        validation.issues.forEach(issue => {
          process.stderr.write(`✖ ${issue.path ?? '/'} ${issue.message}\n`);
        });
      }
      return 2;
    }

    const output = path.resolve(getArg('--output') ?? `generated/${stripDslExtension(path.basename(filePath))}.preview.png`);
    const width = parseOptionalPositiveInt('--width');
    const height = parseOptionalPositiveInt('--height');
    const scale = parseOptionalPositiveNumber('--scale');
    const waitMs = parseOptionalNonNegativeInt('--wait-ms');
    const browserPath = getArg('--browser');
    const allowNoSandbox = hasFlag('--allow-no-sandbox');
    ensureDirectoryForFile(output);

    const result = await capturePreviewImageFromDsl(loaded.dsl, {
      outputPath: output,
      width,
      height,
      scale,
      waitMs,
      browserPath,
      allowNoSandbox
    });
    const bytes = fs.statSync(output).size;

    if (hasFlag('--json')) {
      printJson({
        captured: true,
        file: loaded.sourcePath,
        output,
        bytes,
        width: result.width,
        height: result.height,
        browserPath: result.browserPath
      });
    } else {
      process.stdout.write(`Captured preview image: ${output}\n`);
      process.stdout.write(`  file: ${loaded.sourcePath}\n`);
      process.stdout.write(`  size: ${result.width}x${result.height}\n`);
      process.stdout.write(`  bytes: ${bytes}\n`);
      process.stdout.write(`  browser: ${result.browserPath}\n`);
    }
    return 0;
  }

  if (command === 'validate') {
    const filePaths = resolveDslFiles(fileArg, dirArg);
    const summary = validateAcrossFiles(filePaths);

    if (hasFlag('--json')) {
      if (fileArg) {
        printJson({ valid: summary.valid, issues: summary.issues });
      } else {
        printJson(summary);
      }
    } else if (fileArg) {
      const filePath = resolveDslFile(fileArg);
      if (summary.valid) {
        process.stdout.write(`✔ valid: ${filePath}\n`);
      } else {
        summary.issues.forEach(issue => {
          process.stderr.write(`✖ ${issue.path ?? '/'} ${issue.message}\n`);
        });
      }
    } else {
      if (summary.files.length === 0) {
        process.stdout.write('No DSL files found.\n');
      }
      summary.files.forEach(file => {
        if (file.valid) {
          process.stdout.write(`✔ valid: ${file.file}\n`);
        } else {
          process.stderr.write(`✖ invalid: ${file.file}\n`);
          file.issues.forEach(issue => {
            process.stderr.write(`  - ${issue.path ?? '/'} ${issue.message}\n`);
          });
        }
      });
    }

    return summary.valid ? 0 : 2;
  }

  const statePath = path.resolve(getArg('--state') ?? DEFAULT_STATE_PATH);
  const state = loadState(statePath);
  const initialStateFingerprint = getStateFingerprint(state);

  if (command === 'plan') {
    const filePaths = resolveDslFiles(fileArg, dirArg);
    const validation = validateAcrossFiles(filePaths);
    if (!validation.valid) {
      if (hasFlag('--json')) {
        printJson(validation);
      }
      return 2;
    }

    const plan = planAcrossFiles(filePaths, state);

    if (hasFlag('--json')) {
      if (fileArg) {
        printJson({ hasChanges: plan.hasChanges, changes: plan.files[0]?.changes ?? [] });
      } else {
        printJson(plan);
      }
    } else if (fileArg) {
      const filePlan = plan.files[0];
      if (!filePlan || !filePlan.hasChanges) {
        process.stdout.write('No changes.\n');
      } else {
        filePlan.changes.forEach(change => {
          process.stdout.write(`${change.op} ${change.type}[id=${change.id}] @ ${change.path}${change.details ? ` (${change.details})` : ''}\n`);
        });
      }
    } else {
      if (plan.files.length === 0) {
        process.stdout.write('No DSL files found.\n');
      }
      plan.files.forEach(filePlan => {
        if (!filePlan.hasChanges) {
          process.stdout.write(`No changes: ${filePlan.file}\n`);
          return;
        }
        process.stdout.write(`Changes: ${filePlan.file}\n`);
        filePlan.changes.forEach(change => {
          process.stdout.write(`  ${change.op} ${change.type}[id=${change.id}] @ ${change.path}${change.details ? ` (${change.details})` : ''}\n`);
        });
      });
    }

    const out = getArg('--out');
    if (out) {
      ensureDirectoryForFile(path.resolve(out));
      fs.writeFileSync(path.resolve(out), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    }
    return plan.hasChanges ? 3 : 0;
  }

  const providerModulePath = getArg('--provider-module');
  const provider = (getArg('--provider') ?? 'html') as CliProvider;

  if (command === 'export') {
    const filePath = resolveDslFile(fileArg);
    const loaded = loadDslFromFile(filePath);
    if (!await isSupportedProvider(provider, { providerModulePath })) {
      process.stderr.write(`unsupported provider: ${provider}\n`);
      const supportedProviders = await getSupportedProviderNames({ providerModulePath });
      process.stderr.write(`supported providers: ${supportedProviders.join(', ')}\n`);
      return 1;
    }
    const deterministic = hasFlag('--deterministic');
    const tokenOnError = parseTokenErrorMode();
    const validation = validateDsl(loaded.dsl, {
      sourcePath: loaded.sourcePath,
      skipTokenValidation: tokenOnError !== 'error'
    });
    if (!validation.valid) {
      return 2;
    }

    const tokenResolution = resolveDslTokens({
      dsl: loaded.dsl,
      sourcePath: loaded.sourcePath,
      onError: tokenOnError
    });
    if (tokenOnError === 'warn' && tokenResolution.issues.length > 0) {
      emitTokenWarnings(tokenResolution.issues);
    }

    const content = await renderWithDeterministicCheck({
      dsl: tokenResolution.dsl,
      provider,
      providerModulePath,
      deterministic
    });
    const providerExtension = await getProviderExtension(provider, { providerModulePath });
    const output = path.resolve(getArg('--output') ?? `generated/textui${providerExtension}`);
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, content, 'utf8');

    if (hasFlag('--json')) {
      printJson({
        output,
        provider,
        bytes: Buffer.byteLength(content, 'utf8'),
        deterministic,
        tokenOnError,
        tokenWarnings: tokenResolution.issues.length
      });
    } else {
      process.stdout.write(`Exported: ${output}\n`);
      if (tokenResolution.issues.length > 0) {
        process.stdout.write(`token-warnings: ${tokenResolution.issues.length}\n`);
      }
    }
    return 0;
  }

  if (command === 'apply') {
    if (!await isSupportedProvider(provider, { providerModulePath })) {
      process.stderr.write(`unsupported provider: ${provider}\n`);
      const supportedProviders = await getSupportedProviderNames({ providerModulePath });
      process.stderr.write(`supported providers: ${supportedProviders.join(', ')}\n`);
      return 1;
    }
    const deterministic = hasFlag('--deterministic');
    const tokenOnError = parseTokenErrorMode();
    if (dirArg) {
      const filePaths = resolveDslFiles(fileArg, dirArg);
      return applyAcrossFiles({
        filePaths,
        rootDir: path.resolve(dirArg),
        provider,
        providerModulePath,
        deterministic,
        tokenOnError,
        autoApprove: hasFlag('--auto-approve'),
        outputArg: getArg('--output'),
        stateArg: getArg('--state'),
        json: hasFlag('--json')
      });
    }
    const filePath = resolveDslFile(fileArg);
    const loaded = loadDslFromFile(filePath);
    const validation = validateDsl(loaded.dsl, {
      sourcePath: loaded.sourcePath,
      skipTokenValidation: tokenOnError !== 'error'
    });
    if (!validation.valid) {
      return 2;
    }

    const plan = buildPlan(loaded.dsl, state);
    if (!plan.hasChanges) {
      process.stdout.write('No changes. apply skipped.\n');
      return 0;
    }

    if (!hasFlag('--auto-approve')) {
      process.stderr.write('apply requires --auto-approve in non-interactive mode\n');
      return 1;
    }

    const tokenResolution = resolveDslTokens({
      dsl: loaded.dsl,
      sourcePath: loaded.sourcePath,
      onError: tokenOnError
    });
    if (tokenOnError === 'warn' && tokenResolution.issues.length > 0) {
      emitTokenWarnings(tokenResolution.issues);
    }

    const content = await renderWithDeterministicCheck({
      dsl: tokenResolution.dsl,
      provider,
      providerModulePath,
      deterministic
    });
    const providerExtension = await getProviderExtension(provider, { providerModulePath });
    const output = path.resolve(getArg('--output') ?? `generated/textui${providerExtension}`);
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, content, 'utf8');

    const nextState = buildState({
      entry: path.relative(process.cwd(), loaded.sourcePath),
      provider,
      providerVersion: await getProviderVersion(provider, { providerModulePath }),
      dsl: tokenResolution.dsl,
      dslRaw: loaded.raw,
      artifacts: [{ file: path.relative(process.cwd(), output), content }]
    });

    const latestState = loadState(statePath);
    const latestStateFingerprint = getStateFingerprint(latestState);
    if (latestStateFingerprint !== initialStateFingerprint) {
      process.stderr.write('state conflict detected: state changed since plan calculation\n');
      return 4;
    }

    saveState(statePath, nextState);

    if (hasFlag('--json')) {
      printJson({
        applied: true,
        output,
        state: statePath,
        changes: plan.changes.length,
        deterministic,
        tokenOnError,
        tokenWarnings: tokenResolution.issues.length
      });
    } else {
      process.stdout.write(`Applied ${plan.changes.length} change(s). state: ${statePath}\n`);
      if (tokenResolution.issues.length > 0) {
        process.stdout.write(`token-warnings: ${tokenResolution.issues.length}\n`);
      }
    }
    return 0;
  }

  process.stderr.write(`unknown command: ${command}\n`);
  return 1;
}

run()
  .then(code => {
    process.exitCode = code;
  })
  .catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
