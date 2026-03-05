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
import { buildPlan } from './planner';
import { buildState, DEFAULT_STATE_PATH, loadState, saveState, stateToStableJson } from './state-manager';
import {
  getProviderExtension,
  getProviderVersion,
  getSupportedProviderNames,
  isSupportedProvider,
  loadExternalProvider,
  runExport,
  type CliProvider
} from './exporter-runner';
import type { CliState, ExitCode, PlanSummary, ValidationSummary } from './types';
import { sha256, stableStringify } from './utils';

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

function validateAcrossFiles(filePaths: string[]): ValidationSummary {
  const files = filePaths.map(filePath => {
    const loaded = loadDslFromFile(filePath);
    const result = validateDsl(loaded.dsl);
    const issues = result.issues.map(issue => ({ ...issue, file: loaded.sourcePath }));
    return {
      file: loaded.sourcePath,
      valid: result.valid,
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


async function run(): Promise<ExitCode> {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write('Usage: textui <validate|plan|apply|export|state|providers|version> ...\n');
    process.stdout.write('Options: --provider <name> --provider-module <path> --file <path> --dir <path> --json\n');
    return 0;
  }

  if (command === 'version') {
    process.stdout.write('textui-cli 0.1.0\n');
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

  const filePath = resolveDslFile(fileArg);
  const loaded = loadDslFromFile(filePath);

  const providerModulePath = getArg('--provider-module');
  const provider = (getArg('--provider') ?? 'html') as CliProvider;
  if (!await isSupportedProvider(provider, { providerModulePath })) {
    process.stderr.write(`unsupported provider: ${provider}\n`);
    const supportedProviders = await getSupportedProviderNames({ providerModulePath });
    process.stderr.write(`supported providers: ${supportedProviders.join(', ')}\n`);
    return 1;
  }

  if (command === 'export') {
    const deterministic = hasFlag('--deterministic');
    const validation = validateDsl(loaded.dsl);
    if (!validation.valid) {
      return 2;
    }

    const content = await renderWithDeterministicCheck({ dsl: loaded.dsl, provider, providerModulePath, deterministic });
    const providerExtension = await getProviderExtension(provider, { providerModulePath });
    const output = path.resolve(getArg('--output') ?? `generated/textui${providerExtension}`);
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, content, 'utf8');

    if (hasFlag('--json')) {
      printJson({ output, provider, bytes: Buffer.byteLength(content, 'utf8'), deterministic });
    } else {
      process.stdout.write(`Exported: ${output}\n`);
    }
    return 0;
  }

  if (command === 'apply') {
    const deterministic = hasFlag('--deterministic');
    const validation = validateDsl(loaded.dsl);
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

    const content = await renderWithDeterministicCheck({ dsl: loaded.dsl, provider, providerModulePath, deterministic });
    const providerExtension = await getProviderExtension(provider, { providerModulePath });
    const output = path.resolve(getArg('--output') ?? `generated/textui${providerExtension}`);
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, content, 'utf8');

    const nextState = buildState({
      entry: path.relative(process.cwd(), loaded.sourcePath),
      provider,
      providerVersion: await getProviderVersion(provider, { providerModulePath }),
      dsl: loaded.dsl,
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
      printJson({ applied: true, output, state: statePath, changes: plan.changes.length, deterministic });
    } else {
      process.stdout.write(`Applied ${plan.changes.length} change(s). state: ${statePath}\n`);
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
