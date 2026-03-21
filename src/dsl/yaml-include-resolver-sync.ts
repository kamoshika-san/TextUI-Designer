import * as fs from 'fs';
import * as path from 'path';

/**
 * WebView の `YamlIncludeResolver` と同じ展開ルールの同期版。
 * CLI / キャプチャ経路で `YAML.parse` のみと差が出ないようにする（T-20260321-042）。
 */
export type YamlParseSyncFn = (yamlContent: string, fileName: string) => unknown;

export class YamlIncludeResolverSync {
  constructor(private readonly parseYamlContent: YamlParseSyncFn) {}

  resolve(node: unknown, currentFile: string, includeStack: Set<string> = new Set<string>()): unknown {
    if (Array.isArray(node)) {
      const resolvedItems: unknown[] = [];

      for (const item of node) {
        if (this.isIncludeDirective(item)) {
          const included = this.loadInclude(item.$include, currentFile, includeStack);
          const flattened = Array.isArray(included) ? included : [included];
          resolvedItems.push(...flattened);
          continue;
        }

        resolvedItems.push(this.resolve(item, currentFile, includeStack));
      }

      return resolvedItems;
    }

    if (this.isRecord(node)) {
      const resolvedObject: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(node)) {
        resolvedObject[key] = this.resolve(value, currentFile, includeStack);
      }

      return resolvedObject;
    }

    return node;
  }

  private loadInclude(
    includeSpec: { template: string; params?: Record<string, unknown> },
    currentFile: string,
    includeStack: Set<string>
  ): unknown {
    const baseDir = path.dirname(currentFile);
    const includePath = path.resolve(baseDir, includeSpec.template);

    if (includeStack.has(includePath)) {
      const error = new Error(`循環参照を検出しました: ${[...includeStack, includePath].join(' -> ')}`);
      error.name = 'YamlParseError';
      throw error;
    }

    includeStack.add(includePath);

    try {
      const includeContent = fs.readFileSync(includePath, 'utf-8');
      const includeYaml = this.parseYamlContent(includeContent, includePath);
      const withParams = this.applyIncludeParams(includeYaml, includeSpec.params ?? {});
      return this.resolve(withParams, includePath, includeStack);
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
