import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { isThemeDefinition } from '../types';
import { ThemeUtils } from './theme-utils';

export class ThemeLoader {
  async resolveThemeDefinition(themeFilePath: string, chain: string[] = []): Promise<unknown> {
    const normalizedPath = path.resolve(themeFilePath);
    if (chain.includes(normalizedPath)) {
      throw new Error(`[ThemeManager] Circular theme inheritance detected: ${[...chain, normalizedPath].join(' -> ')}`);
    }

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`[ThemeManager] Extended theme file not found: ${normalizedPath}`);
    }

    const content = fs.readFileSync(normalizedPath, 'utf-8');
    const data = await new Promise<unknown>((resolve, reject) => {
      setImmediate(() => {
        try {
          resolve(YAML.parse(content));
        } catch (error) {
          reject(error);
        }
      });
    });

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
