import type { TokenErrorMode } from './theme-token-resolver';
import type { ValidationSummary } from './types';
import { printJson } from './command-support-shared';

export interface ApplyFileReport {
  file: string;
  output: string;
  state: string;
  changes: number;
  applied: boolean;
  tokenWarnings: number;
}

export interface ApplyExecutionSummary {
  files: ApplyFileReport[];
  changes: number;
  tokenWarnings: number;
}

export interface ApplyReporter {
  printValidationErrors: (validation: ValidationSummary) => void;
  printNoFiles: (json: boolean) => void;
  printConflict: (filePath: string) => void;
  printResults: (json: boolean, result: ApplyExecutionSummary, context: {
    deterministic: boolean;
    themePath?: string;
    tokenOnError: TokenErrorMode;
  }) => void;
  emitTokenWarnings: (warnings: Array<{ path: string; message: string }>) => void;
}

function emitTokenWarnings(warnings: Array<{ path: string; message: string }>): void {
  warnings.forEach(warning => {
    process.stderr.write(`⚠ token ${warning.path} ${warning.message}\n`);
  });
}

export function createApplyReporter(): ApplyReporter {
  return {
    printValidationErrors: validation => {
      validation.files.forEach(file => {
        process.stderr.write(`✖ invalid: ${file.file}\n`);
        file.issues.forEach(issue => {
          process.stderr.write(`  - ${issue.path ?? '/'} ${issue.message}\n`);
        });
      });
    },
    printNoFiles: json => {
      if (json) {
        printJson({ applied: false, files: [], changes: 0 });
      } else {
        process.stdout.write('No DSL files found.\n');
      }
    },
    printConflict: filePath => {
      process.stderr.write(`state conflict detected: ${filePath}\n`);
    },
    printResults: (json, result, context) => {
      if (json) {
        printJson({
          applied: true,
          files: result.files,
          changes: result.changes,
          deterministic: context.deterministic,
          themePath: context.themePath,
          tokenOnError: context.tokenOnError,
          tokenWarnings: result.tokenWarnings
        });
        return;
      }

      result.files.forEach(file => {
        if (file.applied) {
          process.stdout.write(`Applied ${file.changes} change(s): ${file.file}\n`);
        } else {
          process.stdout.write(`No changes: ${file.file}\n`);
        }
        process.stdout.write(`  output: ${file.output}\n`);
        process.stdout.write(`  state: ${file.state}\n`);
        if (file.tokenWarnings > 0) {
          process.stdout.write(`  token-warnings: ${file.tokenWarnings}\n`);
        }
      });
    },
    emitTokenWarnings: warnings => {
      emitTokenWarnings(warnings);
    }
  };
}
