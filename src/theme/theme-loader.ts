import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { isThemeDefinition } from '../types';
import { ThemeUtils } from './theme-utils';

interface ParsedThemeCacheEntry {
  mtimeMs: number;
  data: unknown;
}

export class ThemeLoader {
  private readonly parseCache = new Map<string, ParsedThemeCacheEntry>();

  /**
   * 同一パス・同一 mtime の再読込を避ける軽量キャッシュ（継承チェーン内の重複読込抑止・T-307）
   */
  private async loadParsedThemeFile(normalizedPath: string): Promise<unknown> {
    let mtimeMs: number;
    try {
      const stat = await fs.promises.stat(normalizedPath);
      mtimeMs = stat.mtimeMs;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new Error(`[ThemeManager] Extended theme file not found: ${normalizedPath}`);
      }
      throw e;
    }

    const cached = this.parseCache.get(normalizedPath);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.data;
    }

    const content = await fs.promises.readFile(normalizedPath, 'utf-8');
    const data = await new Promise<unknown>((resolve, reject) => {
      setImmediate(() => {
        try {
          resolve(YAML.parse(content));
        } catch (error) {
          reject(error);
        }
      });
    });

    this.parseCache.set(normalizedPath, { mtimeMs, data });
    return data;
  }

  async resolveThemeDefinition(themeFilePath: string, chain: string[] = []): Promise<unknown> {
    const normalizedPath = path.resolve(themeFilePath);
    if (chain.includes(normalizedPath)) {
      throw new Error(`[ThemeManager] Circular theme inheritance detected: ${[...chain, normalizedPath].join(' -> ')}`);
    }

    const data = await this.loadParsedThemeFile(normalizedPath);

    if (!isThemeDefinition(data)) {
      return data;
    }

    const extendsPath = typeof data.theme.extends === 'string' ? data.theme.extends.trim() : '';
    if (!extendsPath) {
      return data;
    }

    if (extendsPath.startsWith('npm:')) {
      throw new Error(`[ThemeManager] Unsupported extends path: ${extendsPath}`);
    }

    const parentPath = path.resolve(path.dirname(normalizedPath), extendsPath);
    const parentData = await this.resolveThemeDefinition(parentPath, [...chain, normalizedPath]);
    if (!isThemeDefinition(parentData)) {
      return data;
    }

    return {
      ...parentData,
      ...data,
      theme: ThemeUtils.deepMerge(parentData.theme, data.theme)
    };
  }
}
