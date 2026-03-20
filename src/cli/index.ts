#!/usr/bin/env node
import type { ExitCode } from './types';
import { printHelp } from './command-support';
import { getCommandRegistry } from './command-registry';

async function run(): Promise<ExitCode> {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }

  if (command === 'version') {
    process.stdout.write('textui-cli 0.1.0\n');
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
