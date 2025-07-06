import * as vscode from 'vscode';
import Ajv from 'ajv';
import { BaseValidator, ValidationResult, ValidationOptions } from './base-validator';
import { ISchemaManager, SchemaDefinition } from '../../types';

/**
 * スキーマ検証を担当するクラス
 */
export class SchemaValidator extends BaseValidator {
  private schemaManager: ISchemaManager;
  private ajvInstance: Ajv | null = null;
  private schemaCache: SchemaDefinition | null = null;
  private lastSchemaLoad: number = 0;
  private readonly CACHE_TTL = 5000; // 5秒
  
  constructor(schemaManager: ISchemaManager) {
    super();
    this.schemaManager = schemaManager;
  }

  /**
   * スキーマ検証を実行
   */
  async validate(
    text: string,
    document: vscode.TextDocument,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    const diagnostics: vscode.Diagnostic[] = [];
    const now = Date.now();
    
    try {
      // テキストをYAMLとしてパース（事前にパースされていればそれを使用）
      const yamlData = options?.parsedYaml || this.parseYaml(text);
      
      // スキーマキャッシュの更新チェック
      if (!this.schemaCache || (now - this.lastSchemaLoad) > this.CACHE_TTL) {
        await this.updateSchemaCache(options?.isTemplate);
      }
      
      // Ajvインスタンスの初期化
      if (!this.ajvInstance) {
        this.initializeAjv();
      }
      
      // スキーマバリデーションの実行
      const schemaValidationResult = await this.performSchemaValidation(yamlData, options?.isTemplate);
      
      if (!schemaValidationResult.valid) {
        const schemaDiagnostics = this.createDiagnosticsFromSchemaErrors(
          schemaValidationResult.errors,
          text,
          document
        );
        diagnostics.push(...schemaDiagnostics);
      }
      
      // カスタムバリデーションの実行
      const customValidationResult = this.performCustomValidation(yamlData);
      if (!customValidationResult.valid) {
        const customDiagnostics = this.createDiagnosticsFromCustomErrors(
          customValidationResult.errors,
          text,
          document
        );
        diagnostics.push(...customDiagnostics);
      }
      
      return {
        valid: diagnostics.length === 0,
        diagnostics,
        errors: [...(schemaValidationResult.errors || []), ...(customValidationResult.errors || [])]
      };
    } catch (error) {
      const errorDiagnostic = this.createDiagnostic(
        `スキーマ検証エラー: ${error instanceof Error ? error.message : String(error)}`,
        new vscode.Range(0, 0, 0, 1),
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(errorDiagnostic);
      
      return {
        valid: false,
        diagnostics,
        errors: [error]
      };
    }
  }

  /**
   * YAMLをパース
   */
  private parseYaml(text: string): any {
    try {
      const yaml = require('yaml');
      return yaml.parse(text);
    } catch (error) {
      throw new Error(`YAML解析エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * スキーマキャッシュを更新
   */
  private async updateSchemaCache(isTemplate?: boolean): Promise<void> {
    try {
      if (isTemplate) {
        this.schemaCache = await this.schemaManager.loadTemplateSchema();
      } else {
        this.schemaCache = await this.schemaManager.loadSchema();
      }
      this.lastSchemaLoad = Date.now();
      
      // 古いAjvインスタンスを破棄
      if (this.ajvInstance) {
        this.ajvInstance = null;
      }
    } catch (error) {
      throw new Error(`スキーマ読み込みエラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ajvインスタンスを初期化
   */
  private initializeAjv(): void {
    this.ajvInstance = new Ajv({
      allErrors: true,
      allowUnionTypes: true,
      verbose: true,
      strict: false,
      strictTypes: false,
      strictRequired: false,
      validateFormats: false,
      validateSchema: false,
      useDefaults: true,
      coerceTypes: true
    });
  }

  /**
   * スキーマバリデーションを実行
   */
  private async performSchemaValidation(data: any, isTemplate?: boolean): Promise<{ valid: boolean; errors: any[] }> {
    if (!this.ajvInstance || !this.schemaCache) {
      throw new Error('スキーマバリデーションの初期化に失敗しました');
    }
    
    const validate = this.ajvInstance.compile(this.schemaCache);
    const valid = validate(data);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * カスタムバリデーションを実行
   */
  private performCustomValidation(data: any): { valid: boolean; errors: any[] } {
    const errors: any[] = [];
    
    try {
      // コンポーネント構造の検証
      if (data && typeof data === 'object') {
        // page.componentsの検証
        if (data.page && data.page.components) {
          const components = data.page.components;
          if (Array.isArray(components)) {
            for (let i = 0; i < components.length; i++) {
              const component = components[i];
              const componentErrors = this.validateComponent(component, `page.components[${i}]`);
              errors.push(...componentErrors);
            }
          }
        }
        
        // 必須フィールドの検証
        if (data.page && !data.page.title) {
          errors.push({
            instancePath: '/page/title',
            message: 'titleフィールドは必須です'
          });
        }
      }
    } catch (error) {
      errors.push({
        instancePath: '',
        message: `カスタムバリデーションエラー: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * コンポーネントの検証
   */
  private validateComponent(component: any, path: string): any[] {
    const errors: any[] = [];
    
    if (!component || typeof component !== 'object') {
      errors.push({
        instancePath: `/${path.replace(/\./g, '/')}`,
        message: 'コンポーネントはオブジェクトである必要があります'
      });
      return errors;
    }
    
    // type フィールドの検証
    if (!component.type) {
      errors.push({
        instancePath: `/${path.replace(/\./g, '/')}/type`,
        message: 'コンポーネントのtypeフィールドは必須です'
      });
    }
    
    // 既知のコンポーネントタイプの検証
    const validTypes = ['text', 'button', 'input', 'form', 'container', 'divider', 'alert', 'checkbox', 'radio', 'select'];
    // typeが未知でも警告を出さないように抑制
    // if (component.type && !validTypes.includes(component.type)) {
    //   errors.push({
    //     instancePath: `/${path.replace(/\./g, '/')}/type`,
    //     message: `不明なコンポーネントタイプ: ${component.type}`
    //   });
    // }
    
    return errors;
  }

  /**
   * スキーマエラーから診断情報を作成
   */
  private createDiagnosticsFromSchemaErrors(
    errors: any[],
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    for (const error of errors) {
      const key = error.instancePath?.split('/').filter(Boolean).pop();
      if (key) {
        const range = this.findFieldRange(text, document, key);
        const diagnostic = this.createDiagnostic(
          `スキーマエラー: ${error.message}`,
          range,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
    }
    
    return diagnostics;
  }

  /**
   * カスタムエラーから診断情報を作成
   */
  private createDiagnosticsFromCustomErrors(
    errors: any[],
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    for (const error of errors) {
      const key = error.instancePath?.split('/').filter(Boolean).pop();
      if (key) {
        const range = this.findFieldRange(text, document, key);
        const diagnostic = this.createDiagnostic(
          error.message,
          range,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostics.push(diagnostic);
      }
    }
    
    return diagnostics;
  }

  /**
   * フィールドの範囲を検索
   */
  private findFieldRange(text: string, document: vscode.TextDocument, key: string): vscode.Range {
    const regex = new RegExp(`^\\s*${key}:`, 'm');
    const match = text.match(regex);
    
    if (match) {
      const start = text.indexOf(match[0]);
      const startPos = document.positionAt(start);
      const endPos = document.positionAt(start + match[0].length);
      return new vscode.Range(startPos, endPos);
    }
    
    return new vscode.Range(0, 0, 0, 1);
  }

  /**
   * スキーマキャッシュをクリア
   */
  clearCache(): void {
    this.schemaCache = null;
    this.ajvInstance = null;
    this.lastSchemaLoad = 0;
  }
} 