import * as fs from 'fs/promises';
import * as path from 'path';

export type YamlParseFn = (yamlContent: string, fileName: string) => Promise<unknown>;

export class YamlIncludeResolver {
  constructor(private readonly parseYamlContent: YamlParseFn) {}

  async resolve(node: unknown, currentFile: string, includeStack: Set<string> = new Set<string>()): Promise<unknown> {
    if (Array.isArray(node)) {
      const resolvedItems: unknown[] = [];

      for (const item of node) {
        if (this.isIncludeDirective(item)) {
          const included = await this.loadInclude(item.$include, currentFile, includeStack);
          const flattened = Array.isArray(included) ? included : [included];
          resolvedItems.push(...flattened);
          continue;
        }

        resolvedItems.push(await this.resolve(item, currentFile, includeStack));
      }

      return resolvedItems;
    }

    if (this.isRecord(node)) {
      const resolvedObject: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(node)) {
        resolvedObject[key] = await this.resolve(value, currentFile, includeStack);
      }

      return resolvedObject;
    }

    return node;
  }

  private async loadInclude(
    includeSpec: { template: string; params?: Record<string, unknown> },
    currentFile: string,
    includeStack: Set<string>
  ): Promise<unknown> {
    const baseDir = path.dirname(currentFile);
    const includePath = path.resolve(baseDir, includeSpec.template);

    if (includeStack.has(includePath)) {
      const error = new Error(`循環参照を検出しました: ${[...includeStack, includePath].join(' -> ')}`);
      error.name = 'YamlParseError';
      throw error;
    }

    includeStack.add(includePath);

    try {
      const includeContent = await fs.readFile(includePath, 'utf-8');
      const includeYaml = await this.parseYamlContent(includeContent, includePath);
      const withParams = this.applyIncludeParams(includeYaml, includeSpec.params ?? {});
      return await this.resolve(withParams, includePath, includeStack);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'YamlParseError') {
        throw error;
      }

      const fileError = new Error(`テンプレート読み込みに失敗しました: ${includeSpec.template} (${String(error)})`);
      fileError.name = 'YamlParseError';
      throw fileError;
    } finally {
      includeStack.delete(includePath);
    }
  }

  private applyIncludeParams(node: unknown, params: Record<string, unknown>): unknown {
    if (typeof node === 'string') {
      return node.replace(/\{\{\s*\$params\.([\w.]+)\s*\}\}/g, (_match, expression: string) => {
        const resolved = expression.split('.').reduce<unknown>((acc, key) => {
          if (!this.isRecord(acc)) {
            return undefined;
          }
          return acc[key];
        }, params);

        return resolved === undefined || resolved === null ? '' : String(resolved);
      });
    }

    if (Array.isArray(node)) {
      return node.map(item => this.applyIncludeParams(item, params));
    }

    if (this.isRecord(node)) {
      const resolvedObject: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        resolvedObject[key] = this.applyIncludeParams(value, params);
      }
      return resolvedObject;
    }

    return node;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isIncludeDirective(value: unknown): value is { $include: { template: string; params?: Record<string, unknown> } } {
    if (!this.isRecord(value) || !this.isRecord(value.$include)) {
      return false;
    }

    return typeof value.$include.template === 'string';
  }
}
