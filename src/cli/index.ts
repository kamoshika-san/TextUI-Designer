#!/usr/bin/env node
import type { ExitCode } from './types';
import { getArg, printHelp } from './command-support';

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
    const { handleImportCommand } = await import('./commands/import-command');
    return handleImportCommand();
  }

  if (command === 'providers') {
    const { handleProvidersCommand } = await import('./commands/providers-command');
    return handleProvidersCommand();
  }

  if (command === 'state') {
    const { handleStateCommand } = await import('./commands/state-command');
    return handleStateCommand();
  }

  if (command === 'capture') {
    const { handleCaptureCommand } = await import('./commands/capture-command');
    const fileArg = getArg('--file');
    const dirArg = getArg('--dir');
    return handleCaptureCommand({ fileArg, dirArg });
  }

  if (command === 'validate') {
    const { handleValidateCommand } = await import('./commands/validate-command');
    const fileArg = getArg('--file');
    const dirArg = getArg('--dir');
    return handleValidateCommand({ fileArg, dirArg });
  }

  if (command === 'export') {
    const { handleExportCommand } = await import('./commands/export-command');
    const fileArg = getArg('--file');
    return handleExportCommand(fileArg);
  }

  if (command === 'plan') {
    const { handlePlanCommand } = await import('./commands/plan-command');
    const fileArg = getArg('--file');
    const dirArg = getArg('--dir');
    return handlePlanCommand({ fileArg, dirArg });
  }

  if (command === 'apply') {
    const { handleApplyCommand } = await import('./commands/apply-command');
    const fileArg = getArg('--file');
    const dirArg = getArg('--dir');
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
