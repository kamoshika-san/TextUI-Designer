#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectoryForFile, loadDslFromFile, resolveDslFile } from './io';
import { validateDsl } from './validator';
import { buildPlan } from './planner';
import { buildState, DEFAULT_STATE_PATH, loadState, saveState, stateToStableJson } from './state-manager';
import { getProviderExtension, runExport, type CliProvider } from './exporter-runner';
import type { ExitCode } from './types';

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

async function run(): Promise<ExitCode> {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write('Usage: textui <validate|plan|apply|export|state|version> ...\n');
    return 0;
  }

  if (command === 'version') {
    process.stdout.write('textui-cli 0.1.0\n');
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

    process.stderr.write(`unsupported state command: ${sub}\n`);
    return 1;
  }

  const filePath = resolveDslFile(getArg('--file'));
  const loaded = loadDslFromFile(filePath);

  if (command === 'validate') {
    const validation = validateDsl(loaded.dsl);
    if (hasFlag('--json')) {
      printJson(validation);
    } else if (validation.valid) {
      process.stdout.write(`✔ valid: ${loaded.sourcePath}\n`);
    } else {
      validation.issues.forEach(issue => {
        process.stderr.write(`✖ ${issue.path ?? '/'} ${issue.message}\n`);
      });
    }
    return validation.valid ? 0 : 2;
  }

  const statePath = path.resolve(getArg('--state') ?? DEFAULT_STATE_PATH);
  const state = loadState(statePath);

  if (command === 'plan') {
    const validation = validateDsl(loaded.dsl);
    if (!validation.valid) {
      if (hasFlag('--json')) {
        printJson(validation);
      }
      return 2;
    }

    const plan = buildPlan(loaded.dsl, state);
    if (hasFlag('--json')) {
      printJson(plan);
    } else if (!plan.hasChanges) {
      process.stdout.write('No changes.\n');
    } else {
      plan.changes.forEach(change => {
        process.stdout.write(`${change.op} ${change.type}[id=${change.id}] @ ${change.path}${change.details ? ` (${change.details})` : ''}\n`);
      });
    }
    const out = getArg('--out');
    if (out) {
      ensureDirectoryForFile(path.resolve(out));
      fs.writeFileSync(path.resolve(out), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    }
    return plan.hasChanges ? 3 : 0;
  }

  const provider = (getArg('--provider') ?? 'html') as CliProvider;
  if (!['html', 'react', 'pug'].includes(provider)) {
    process.stderr.write(`unsupported provider: ${provider}\n`);
    return 1;
  }

  if (command === 'export') {
    const validation = validateDsl(loaded.dsl);
    if (!validation.valid) {
      return 2;
    }

    const content = await runExport(loaded.dsl, provider);
    const output = path.resolve(getArg('--output') ?? `generated/textui${getProviderExtension(provider)}`);
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, content, 'utf8');

    if (hasFlag('--json')) {
      printJson({ output, provider, bytes: Buffer.byteLength(content, 'utf8') });
    } else {
      process.stdout.write(`Exported: ${output}\n`);
    }
    return 0;
  }

  if (command === 'apply') {
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

    const content = await runExport(loaded.dsl, provider);
    const output = path.resolve(getArg('--output') ?? `generated/textui${getProviderExtension(provider)}`);
    ensureDirectoryForFile(output);
    fs.writeFileSync(output, content, 'utf8');

    const nextState = buildState({
      entry: path.relative(process.cwd(), loaded.sourcePath),
      provider,
      dsl: loaded.dsl,
      dslRaw: loaded.raw,
      artifacts: [{ file: path.relative(process.cwd(), output), content }]
    });
    saveState(statePath, nextState);

    if (hasFlag('--json')) {
      printJson({ applied: true, output, state: statePath, changes: plan.changes.length });
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
