import { resolveDslFile, resolveDslFiles } from '../io';
import type { ExitCode } from '../types';
import { hasFlag, printJson, validateAcrossFiles } from '../command-support';
import type { FileTargetArgs } from './types';

export function handleValidateCommand(args: FileTargetArgs): ExitCode {
  const filePaths = resolveDslFiles(args.fileArg, args.dirArg);
  const summary = validateAcrossFiles(filePaths);

  if (hasFlag('--json')) {
    if (args.fileArg) {
      printJson({ valid: summary.valid, issues: summary.issues });
    } else {
      printJson(summary);
    }
  } else if (args.fileArg) {
    const filePath = resolveDslFile(args.fileArg);
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
