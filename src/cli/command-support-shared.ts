import * as path from 'path';
import { loadDslFromFile } from './io';
import { validateDsl } from './validator';
import type { CliState, ValidationIssue, ValidationSummary } from './types';
import { stateToStableJson } from './state-manager';
import { sha256 } from './utils';

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function loadErrorToIssues(filePath: string, error: unknown): ValidationIssue[] {
  const message = error instanceof Error ? error.message : String(error);
  return [
    {
      level: 'error',
      path: '/',
      message,
      file: path.resolve(filePath)
    }
  ];
}

export function validateAcrossFiles(filePaths: string[], skipTokenValidation: boolean = false): ValidationSummary {
  const files = filePaths.map(filePath => {
    try {
      const loaded = loadDslFromFile(filePath);
      const result = validateDsl(loaded.dsl, {
        sourcePath: loaded.sourcePath,
        skipTokenValidation,
        schemaKind: loaded.kind === 'navigation-flow' ? 'navigation' : 'main'
      });
      const issues = result.issues.map(issue => ({ ...issue, file: loaded.sourcePath }));
      return {
        file: loaded.sourcePath,
        valid: result.valid,
        issues
      };
    } catch (error: unknown) {
      const resolvedPath = path.resolve(filePath);
      const issues = loadErrorToIssues(filePath, error);
      return {
        file: resolvedPath,
        valid: false,
        issues
      };
    }
  });

  return {
    valid: files.every(file => file.valid),
    issues: files.flatMap(file => file.issues),
    files
  };
}

export function findStateForFile(state: CliState | null, filePath: string): CliState | null {
  if (!state) {
    return null;
  }
  const stateEntryPath = path.resolve(state.dsl.entry);
  if (stateEntryPath !== filePath) {
    return null;
  }
  return state;
}

export function getStateFingerprint(state: CliState | null): string {
  if (!state) {
    return 'absent';
  }
  return sha256(stateToStableJson(state));
}
