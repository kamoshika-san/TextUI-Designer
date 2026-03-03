import * as vscode from 'vscode';
import * as YAML from 'yaml';
import Ajv, { ErrorObject } from 'ajv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SchemaDefinition } from '../../types';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import { ConfigManager } from '../../utils/config-manager';

export interface YamlSchemaLoader {
  loadSchema(): Promise<SchemaDefinition>;
}

export interface ParsedYamlResult {
  data: unknown;
  fileName: string;
  content: string;
}

export interface YamlErrorInfo {
  message: string;
  line: number;
  column: number;
  errorLine: string;
  suggestions: string[];
  fileName: string;
}

export interface SchemaErrorInfo {
  message: string;
  errors: ErrorObject[];
  suggestions: string[];
  fileName: string;
}

/**
 * YAML解析専用クラス
 * YAMLのパース、スキーマバリデーション、エラー処理を担当
 */
export class YamlParser {
  private performanceMonitor: PerformanceMonitor;
  private schemaLoader?: YamlSchemaLoader;
  private readonly MAX_YAML_SIZE: number = 1024 * 1024; // 1MB制限

  constructor(schemaLoader?: YamlSchemaLoader) {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.schemaLoader = schemaLoader;
  }

  /**
   * YAMLファイルを解析
   */
  async parseYamlFile(filePath?: string): Promise<ParsedYamlResult> {
    return this.performanceMonitor.measureRenderTime(async () => {
      const activeEditor = vscode.window.activeTextEditor;
      let yamlContent = '';
      let fileName = '';

      if (activeEditor && ConfigManager.isSupportedFile(activeEditor.document.fileName)) {
        yamlContent = activeEditor.document.getText();
        fileName = activeEditor.document.fileName;
        console.log(`[YamlParser] アクティブエディタからYAMLを取得: ${fileName}`);
      } else if (filePath) {
        // 指定されたファイルを使用
        const document = await vscode.workspace.openTextDocument(filePath);
        yamlContent = document.getText();
        fileName = filePath;
      } else {
        // デフォルトのサンプルデータ
        yamlContent = this.getDefaultSampleYaml();
        fileName = 'sample.tui.yml';
      }

      // ファイルサイズ制限をチェック
      this.validateFileSize(yamlContent, fileName);

      // YAMLパース処理を非同期で実行
      const yaml = await this.parseYamlContent(yamlContent, fileName);
      const resolvedYaml = await this.resolveTemplateIncludes(yaml, fileName, new Set<string>());

      // スキーマバリデーションを実行
      await this.validateYamlSchema(resolvedYaml, yamlContent, fileName);

      return {
        data: resolvedYaml,
        fileName: fileName,
        content: yamlContent
      };
    });
  }

  /**
   * YAMLコンテンツをパース
   */
  private async parseYamlContent(yamlContent: string, fileName: string): Promise<unknown> {
    try {
      return await new Promise((resolve, reject) => {
        setImmediate(() => {
          try {
            const parsed = YAML.parse(yamlContent);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (parseError) {
      console.error('[YamlParser] YAMLパースエラー:', parseError);
      throw this.createParseError(parseError, yamlContent, fileName);
    }
  }

  /**
   * $include を再帰的に解決
   */
  private async resolveTemplateIncludes(node: unknown, currentFile: string, includeStack: Set<string>): Promise<unknown> {
    if (Array.isArray(node)) {
      const resolvedItems: unknown[] = [];

      for (const item of node) {
        if (this.isIncludeDirective(item)) {
          const included = await this.loadInclude(item.$include, currentFile, includeStack);
          const flattened = Array.isArray(included) ? included : [included];
          resolvedItems.push(...flattened);
          continue;
        }

        resolvedItems.push(await this.resolveTemplateIncludes(item, currentFile, includeStack));
      }

      return resolvedItems;
    }

    if (this.isRecord(node)) {
      const resolvedObject: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(node)) {
        resolvedObject[key] = await this.resolveTemplateIncludes(value, currentFile, includeStack);
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

      return await this.resolveTemplateIncludes(withParams, includePath, includeStack);
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

  /**
   * ファイルサイズを検証
   */
  private validateFileSize(yamlContent: string, fileName: string): void {
    if (yamlContent.length > this.MAX_YAML_SIZE) {
      const error = new Error(`YAMLファイルが大きすぎます（${Math.round(yamlContent.length / 1024)}KB）。1MB以下にしてください。`);
      error.name = 'FileSizeError';
      throw error;
    }
  }

  /**
   * YAMLスキーマバリデーションを実行
   */
  private async validateYamlSchema(yaml: unknown, yamlContent: string, fileName: string): Promise<void> {
    try {
      if (!this.schemaLoader) {
        console.warn('[YamlParser] スキーマローダーが未設定のため、スキーマ検証をスキップします');
        return;
      }

      const schema = await this.schemaLoader.loadSchema();
      if (!schema) {
        console.warn('[YamlParser] スキーマの読み込みに失敗しました');
        return;
      }

      // Ajvを使用してバリデーション
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(schema);
      
      const valid = validate(yaml);
      
      if (!valid) {
        const validationErrors = validate.errors ?? [];
        console.warn('[YamlParser] スキーマバリデーションエラー:', validationErrors);
        throw this.createSchemaError(validationErrors, yamlContent, fileName);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'SchemaValidationError') {
        throw error;
      }
      console.error('[YamlParser] スキーマバリデーションでエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * パースエラーを作成
   */
  private createParseError(error: unknown, yamlContent: string, fileName: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lines = yamlContent.split('\n');
    
    // エラーメッセージから行番号を抽出
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const lineNumber = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
    
    const errorLine = lines[lineNumber] || '';
    const suggestions = this.generateParseErrorSuggestions(errorMessage, errorLine);
    
    const yamlError = new Error(errorMessage) as Error & { details?: YamlErrorInfo };
    yamlError.name = 'YamlParseError';
    yamlError.details = {
      message: errorMessage,
      line: lineNumber + 1,
      column: 0,
      errorLine: errorLine,
      suggestions: suggestions,
      fileName: fileName
    };
    
    throw yamlError;
  }

  /**
   * スキーマエラーを作成
   */
  private createSchemaError(errors: ErrorObject[], yamlContent: string, fileName: string): Error {
    if (errors.length === 0) {
      return new Error('Unknown schema error');
    }

    const primaryError = errors[0];
    const errorMessage = this.formatSchemaErrorMessage(primaryError);
    const suggestions = this.generateSchemaErrorSuggestions(primaryError, errors);
    
    const schemaError = new Error(errorMessage) as Error & { details?: SchemaErrorInfo };
    schemaError.name = 'SchemaValidationError';
    schemaError.details = {
      message: errorMessage,
      errors: errors,
      suggestions: suggestions,
      fileName: fileName
    };
    
    return schemaError;
  }

  /**
   * パースエラー修正の提案を生成
   */
  private generateParseErrorSuggestions(errorMessage: string, errorLine: string): string[] {
    const suggestions: string[] = [];
    
    if (errorMessage.includes('duplicate key')) {
      suggestions.push('重複したキーが存在します。キー名を確認してください。');
    } else if (errorMessage.includes('mapping values')) {
      suggestions.push('YAMLの構文エラーです。インデントとコロンの使用を確認してください。');
    } else if (errorMessage.includes('unexpected end')) {
      suggestions.push('YAMLファイルが不完全です。閉じ括弧やクォートを確認してください。');
    } else if (errorMessage.includes('invalid character')) {
      suggestions.push('無効な文字が含まれています。特殊文字やエンコーディングを確認してください。');
    }
    
    return suggestions;
  }

  /**
   * スキーマエラーメッセージをフォーマット
   */
  private formatSchemaErrorMessage(error: ErrorObject): string {
    const path = error.instancePath || '';
    const message = error.message || 'Unknown schema error';
    
    if (path) {
      return `スキーマエラー (${path}): ${message}`;
    }
    
    return `スキーマエラー: ${message}`;
  }

  /**
   * スキーマエラー修正の提案を生成
   */
  private generateSchemaErrorSuggestions(primaryError: ErrorObject, _allErrors: ErrorObject[]): string[] {
    const suggestions: string[] = [];
    
    if (primaryError.keyword === 'required') {
      const missingProperty = (primaryError.params as { missingProperty?: string }).missingProperty;
      if (missingProperty) {
        suggestions.push(`必須プロパティ "${missingProperty}" が不足しています。`);
      }
    } else if (primaryError.keyword === 'type') {
      const expectedType = (primaryError.params as { type?: string }).type;
      if (expectedType) {
        suggestions.push(`プロパティの型が正しくありません。期待される型: ${expectedType}`);
      }
    } else if (primaryError.keyword === 'enum') {
      const allowedValues = (primaryError.params as { allowedValues?: unknown[] }).allowedValues;
      if (allowedValues && allowedValues.length > 0) {
        suggestions.push(`無効な値です。許可される値: ${allowedValues.join(', ')}`);
      }
    }
    
    return suggestions;
  }

  /**
   * デフォルトのサンプルYAMLを取得
   */
  private getDefaultSampleYaml(): string {
    return `page:
  id: sample
  title: "サンプル"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "TextUI Designer"
    - Text:
        variant: p
        value: "プレビューが表示されています"`;
  }
} 
