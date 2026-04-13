import { resolveDslFile, resolveDslFiles } from '../io';
import type { ExitCode } from '../types';
import { hasFlag, printJson, validateAcrossFiles } from '../command-support';
import type { FileTargetArgs } from './types';

function runValidation(args: FileTargetArgs): void {
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
}

export function handleValidateCommand(args: FileTargetArgs): ExitCode {
  if (hasFlag('--watch')) {
    if (!args.fileArg) {
      process.stderr.write('--watch requires --file <path>\n');
      return 1;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chokidar = require('chokidar') as typeof import('chokidar');
    const filePath = resolveDslFile(args.fileArg);
    process.stdout.write(`Watching: ${filePath}\n`);
    runValidation(args);

    const watcher = chokidar.watch(filePath, { ignoreInitial: true });
    watcher.on('change', () => {
      if (hasFlag('--json')) {
        // NDJSON: one JSON object per line
        process.stdout.write('\n');
      } else {
        process.stdout.write(`\n[change detected] re-validating...\n`);
      }
      runValidation(args);
    });

    process.on('SIGINT', () => {
      void watcher.close();
      process.exit(0);
    });

    // keep process alive
    return 0;
  }

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
