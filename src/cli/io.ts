import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { LoadedDsl } from './types';

export function resolveDslFile(fileArg?: string): string {
  if (fileArg) {
    return path.resolve(fileArg);
  }
  throw new Error('`--file <path>` は必須です');
}

export function loadDslFromFile(filePath: string): LoadedDsl {
  const sourcePath = path.resolve(filePath);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const dsl = YAML.parse(raw);
  return { dsl, sourcePath, raw };
}

export function ensureDirectoryForFile(targetPath: string): void {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
}

export function atomicWriteJson(targetPath: string, payload: unknown): void {
  ensureDirectoryForFile(targetPath);
  const tmp = `${targetPath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, targetPath);
}
