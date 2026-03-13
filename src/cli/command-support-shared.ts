import * as path from 'path';
import { loadDslFromFile } from './io';
import { validateDsl } from './validator';
import { validateIncludeReferences } from './include-validator';
import type { CliState, ValidationSummary } from './types';
import { stateToStableJson } from './state-manager';
import { sha256 } from './utils';

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function validateAcrossFiles(filePaths: string[], skipTokenValidation: boolean = false): ValidationSummary {
  const files = filePaths.map(filePath => {
    const loaded = loadDslFromFile(filePath);
    const result = validateDsl(loaded.dsl, {
      sourcePath: loaded.sourcePath,
      skipTokenValidation
    });
    const includeIssues = validateIncludeReferences(loaded.dsl, loaded.sourcePath);
    const issues = [...result.issues, ...includeIssues].map(issue => ({ ...issue, file: loaded.sourcePath }));
    return {
      file: loaded.sourcePath,
      valid: result.valid && includeIssues.length === 0,
      issues
    };
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
