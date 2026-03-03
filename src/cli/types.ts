import type { TextUIDSL } from '../renderer/types';

export type ExitCode = 0 | 1 | 2 | 3 | 4;

export interface CliState {
  version: 1;
  dsl: {
    entry: string;
    hash: string;
    updatedAt: string;
  };
  provider: {
    name: 'html' | 'react' | 'pug';
    version: string;
  };
  resources: Array<{
    id: string;
    type: string;
    path: string;
    hash: string;
    snapshot?: Record<string, unknown>;
  }>;
  artifacts: Array<{
    file: string;
    hash: string;
    size: number;
  }>;
  meta: {
    cliVersion: string;
    lastApply: string;
  };
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  path?: string;
  file?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationSummary {
  valid: boolean;
  issues: ValidationIssue[];
  files: Array<{
    file: string;
    valid: boolean;
    issues: ValidationIssue[];
  }>;
}

export interface PlanChange {
  op: '+' | '~' | '-';
  id: string;
  type: string;
  path: string;
  details?: string;
}

export interface ComponentResourceRecord {
  id: string;
  type: string;
  path: string;
  hash: string;
  snapshot?: Record<string, unknown>;
}

export interface PlanResult {
  hasChanges: boolean;
  changes: PlanChange[];
}

export interface PlanSummary {
  hasChanges: boolean;
  changes: PlanChange[];
  files: Array<{
    file: string;
    hasChanges: boolean;
    changes: PlanChange[];
  }>;
}

export interface LoadedDsl {
  dsl: TextUIDSL;
  sourcePath: string;
  raw: string;
}
