import * as fs from 'fs';
import * as path from 'path';
import type { TokenErrorMode } from './theme-token-resolver';

export function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

export function parseTokenErrorMode(): TokenErrorMode {
  const mode = (getArg('--token-on-error') ?? 'error').toLowerCase();
  if (mode === 'error' || mode === 'warn' || mode === 'ignore') {
    return mode;
  }
  throw new Error(`invalid --token-on-error value: ${mode}. expected: error|warn|ignore`);
}

export function parseThemePath(): string | undefined {
  const raw = getArg('--theme');
  if (!raw) {
    return undefined;
  }
  const resolved = path.resolve(raw);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`theme file not found: ${resolved}`);
  }
  return resolved;
}

export function parseOptionalPositiveInt(flag: string): number | undefined {
  const value = getArg(flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid ${flag} value: ${value}. expected positive integer`);
  }
  return parsed;
}

export function parseOptionalPositiveNumber(flag: string): number | undefined {
  const value = getArg(flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid ${flag} value: ${value}. expected positive number`);
  }
  return parsed;
}

export function parseOptionalNonNegativeInt(flag: string): number | undefined {
  const value = getArg(flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid ${flag} value: ${value}. expected non-negative integer`);
  }
  return parsed;
}
