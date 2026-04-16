#!/usr/bin/env node
import type { ExitCode } from './types';
import { printHelp } from './command-support';
import { getCommandRegistry } from './command-registry';
import { installUnhandledRejectionLogger } from '../utils/runtime-error-observability';
import * as fs from 'fs';
import * as path from 'path';

installUnhandledRejectionLogger('CLI');

function resolveCliVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function run(): Promise<ExitCode> {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }

  if (command === 'version') {
    process.stdout.write(`textui-cli ${resolveCliVersion()}\n`);
    return 0;
  }

  // help/version 以外はレジストリで lazy-load dispatch
  const registry = getCommandRegistry();
  const handler = registry[command];
  if (!handler) {
    process.stderr.write(`unknown command: ${command}\n`);
    return 1;
  }

  return handler();
}

run()
  .then(code => {
    process.exitCode = code;
  })
  .catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
