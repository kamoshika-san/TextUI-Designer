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

function isDslFile(filePath: string): boolean {
  return filePath.endsWith('.tui.yml') || filePath.endsWith('.tui.yaml');
}

export function resolveDslFiles(fileArg?: string, dirArg?: string): string[] {
  if (fileArg && dirArg) {
    throw new Error('`--file` と `--dir` は同時に指定できません');
  }

  if (fileArg) {
    return [resolveDslFile(fileArg)];
  }

  if (!dirArg) {
    throw new Error('`--file <path>` または `--dir <path>` は必須です');
  }

  const rootDir = path.resolve(dirArg);
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error(`ディレクトリが見つかりません: ${rootDir}`);
  }

  const queue: string[] = [rootDir];
  const files: string[] = [];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        return;
      }

      if (entry.isFile() && isDslFile(fullPath)) {
        files.push(fullPath);
      }
    });
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
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
