#!/usr/bin/env node
import type { ExitCode } from './types';
import { getArg, printHelp } from './command-support';
import { handleImportCommand } from './commands/import-command';
import { handleProvidersCommand } from './commands/providers-command';
import { handleStateCommand } from './commands/state-command';
import { handleCaptureCommand } from './commands/capture-command';
import { handleValidateCommand } from './commands/validate-command';
import { handlePlanCommand } from './commands/plan-command';
import { handleExportCommand } from './commands/export-command';
import { handleApplyCommand } from './commands/apply-command';

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

  if (command === 'import') {
    return handleImportCommand();
  }



  if (command === 'providers') {
    return handleProvidersCommand();
  }

  if (command === 'state') {
    return handleStateCommand();
  }

  const fileArg = getArg('--file');
  const dirArg = getArg('--dir');

  if (command === 'capture') {
    return handleCaptureCommand({ fileArg, dirArg });
  }

  if (command === 'validate') {
    return handleValidateCommand({ fileArg, dirArg });
  }

  if (command === 'export') {
    return handleExportCommand(fileArg);
  }

  if (command === 'plan') {
    return handlePlanCommand({ fileArg, dirArg });
  }

  if (command === 'apply') {
    return handleApplyCommand({ fileArg, dirArg });
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
