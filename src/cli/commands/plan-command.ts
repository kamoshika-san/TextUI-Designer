import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectoryForFile, resolveDslFiles } from '../io';
import { DEFAULT_STATE_PATH, loadState } from '../state-manager';
import type { ExitCode } from '../types';
import { getArg, hasFlag, planAcrossFiles, printJson, validateAcrossFiles } from '../command-support';
import type { FileTargetArgs } from './types';

export function handlePlanCommand(args: FileTargetArgs): ExitCode {
  const statePath = path.resolve(getArg('--state') ?? DEFAULT_STATE_PATH);
  const state = loadState(statePath);
  const filePaths = resolveDslFiles(args.fileArg, args.dirArg);
  const validation = validateAcrossFiles(filePaths);
  if (!validation.valid) {
    if (hasFlag('--json')) {
      printJson(validation);
    }
    return 2;
  }

  const plan = planAcrossFiles(filePaths, state);

  if (hasFlag('--json')) {
    if (args.fileArg) {
      printJson({ hasChanges: plan.hasChanges, changes: plan.files[0]?.changes ?? [] });
    } else {
      printJson(plan);
    }
  } else if (args.fileArg) {
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
