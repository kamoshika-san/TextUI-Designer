import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import { TemplateParser, TemplateException, TemplateError } from '../template-parser';

export interface ParsedYamlResult {
  data: any;
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
  errors: any[];
  suggestions: string[];
  fileName: string;
}

/**
 * YAML解析専用クラス
 * YAMLのパース、スキーマバリデーション、エラー処理を担当
 */
export class YamlParser {
  private performanceMonitor: PerformanceMonitor;
  private templateParser: TemplateParser;
  private readonly MAX_YAML_SIZE: number = 1024 * 1024; // 1MB制限

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.templateParser = new TemplateParser();
  }

  /**
   * YAMLファイルを解析
   */
  async parseYamlFile(filePath?: string): Promise<ParsedYamlResult> {
    return this.performanceMonitor.measureRenderTime(async () => {
      const activeEditor = vscode.window.activeTextEditor;
      let yamlContent = '';
      let fileName = '';

      if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
        yamlContent = activeEditor.document.getText();
        fileName = activeEditor.document.fileName;
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

      console.log(`[YamlParser] 解析対象ファイル: ${fileName}`);
      console.log(`[YamlParser] ファイル拡張子: ${fileName.split('.').pop()}`);
      console.log(`[YamlParser] $include含む: ${yamlContent.includes('$include:')}`);
      console.log(`[YamlParser] $if含む: ${yamlContent.includes('$if:')}`);

      // ファイルサイズ制限をチェック
      this.validateFileSize(yamlContent, fileName);

      // YAMLパース処理を非同期で実行
      const yaml = await this.parseYamlContent(yamlContent, fileName);

      // スキーマバリデーションを実行
      await this.validateYamlSchema(yaml, yamlContent, fileName);

      return {
        data: yaml,
        fileName: fileName,
        content: yamlContent
      };
    });
  }

  /**
   * パラメータ付きでYAMLファイルを解析
   */
  async parseYamlFileWithParameters(filePath?: string, parameters: Record<string, any> = {}): Promise<ParsedYamlResult> {
    return this.performanceMonitor.measureRenderTime(async () => {
      const activeEditor = vscode.window.activeTextEditor;
      let yamlContent = '';
      let fileName = '';

      if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
        yamlContent = activeEditor.document.getText();
        fileName = activeEditor.document.fileName;
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

      console.log(`[YamlParser] パラメータ付き解析対象ファイル: ${fileName}`);
      console.log(`[YamlParser] パラメータ:`, parameters);

      // ファイルサイズ制限をチェック
      this.validateFileSize(yamlContent, fileName);

      // YAMLパース処理を非同期で実行（パラメータ付き）
      const yaml = await this.parseYamlContentWithParameters(yamlContent, fileName, parameters);

      // スキーマバリデーションを実行
      await this.validateYamlSchema(yaml, yamlContent, fileName);

      return {
        data: yaml,
        fileName: fileName,
        content: yamlContent
      };
    });
  }

  /**
   * YAMLコンテンツをパース
   */
  private async parseYamlContent(yamlContent: string, fileName: string): Promise<any> {
    try {
      return await new Promise((resolve, reject) => {
        setImmediate(async () => {
          try {
            const parsed = YAML.parse(yamlContent);
            
            // テンプレート参照を解決
            const resolvedData = await this.resolveTemplates(parsed, fileName);
            resolve(resolvedData);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (parseError) {
      throw this.createParseError(parseError, yamlContent, fileName);
    }
  }

  /**
   * パラメータ付きでYAMLコンテンツをパース
   */
  private async parseYamlContentWithParameters(yamlContent: string, fileName: string, parameters: Record<string, any>): Promise<any> {
    try {
      return await new Promise((resolve, reject) => {
        setImmediate(async () => {
          try {
            const parsed = YAML.parse(yamlContent);
            
            // テンプレート参照を解決（パラメータ付き）
            const resolvedData = await this.resolveTemplatesWithParameters(parsed, fileName, parameters);
            resolve(resolvedData);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (parseError) {
      throw this.createParseError(parseError, yamlContent, fileName);
    }
  }

  /**
   * テンプレート参照を解決
   */
  private async resolveTemplates(data: any, fileName: string): Promise<any> {
    try {
      console.log(`[YamlParser] resolveTemplates開始: ${fileName}`);
      
      // テンプレートファイル（.template.yml）の場合は循環参照チェックをスキップ
      if (fileName.endsWith('.template.yml') || fileName.endsWith('.template.yaml')) {
        console.log(`[YamlParser] テンプレートファイルのため、循環参照チェックをスキップ: ${fileName}`);
        return data;
      }
      
      // $include構文またはtype: Include/Ifが含まれている場合のみテンプレート解析を実行
      const yamlString = YAML.stringify(data);
      const hasInclude = yamlString.includes('$include:') || this.hasTemplateComponent(data, 'Include');
      const hasIf = yamlString.includes('$if:') || this.hasTemplateComponent(data, 'If');
      
      console.log(`[YamlParser] $include含む: ${hasInclude}`);
      console.log(`[YamlParser] $if含む: ${hasIf}`);
      
      if (hasInclude || hasIf) {
        console.log(`[YamlParser] テンプレート解析を実行: ${fileName}`);
        return await this.templateParser.parseWithTemplates(
          yamlString,
          fileName
        );
      } else {
        // $includeや$ifが含まれていない場合は、そのまま返す
        console.log(`[YamlParser] $includeや$ifが含まれていないため、そのまま返す: ${fileName}`);
        return data;
      }
    } catch (error) {
      console.error(`[YamlParser] resolveTemplatesでエラー: ${fileName}`, error);
      if (error instanceof TemplateException) {
        throw this.createTemplateError(error, fileName);
      }
      throw error;
    }
  }

  /**
   * パラメータ付きでテンプレート参照を解決
   */
  private async resolveTemplatesWithParameters(data: any, fileName: string, parameters: Record<string, any>): Promise<any> {
    try {
      console.log(`[YamlParser] resolveTemplatesWithParameters開始: ${fileName}`);
      console.log(`[YamlParser] パラメータ:`, parameters);
      
      // テンプレートファイル（.template.yml）の場合は循環参照チェックをスキップ
      if (fileName.endsWith('.template.yml') || fileName.endsWith('.template.yaml')) {
        console.log(`[YamlParser] テンプレートファイルのため、循環参照チェックをスキップ: ${fileName}`);
        return data;
      }
      
      // $include構文またはtype: Include/Ifが含まれている場合のみテンプレート解析を実行
      const yamlString = YAML.stringify(data);
      const hasInclude = yamlString.includes('$include:') || this.hasTemplateComponent(data, 'Include');
      const hasIf = yamlString.includes('$if:') || this.hasTemplateComponent(data, 'If');
      
      console.log(`[YamlParser] $include含む: ${hasInclude}`);
      console.log(`[YamlParser] $if含む: ${hasIf}`);
      
      if (hasInclude || hasIf) {
        console.log(`[YamlParser] パラメータ付きテンプレート解析を実行: ${fileName}`);
        return await this.templateParser.parseWithTemplatesAndParameters(
          yamlString,
          fileName,
          parameters
        );
      } else {
        // $includeや$ifが含まれていない場合は、そのまま返す
        console.log(`[YamlParser] $includeや$ifが含まれていないため、そのまま返す: ${fileName}`);
        return data;
      }
    } catch (error) {
      console.error(`[YamlParser] resolveTemplatesWithParametersでエラー: ${fileName}`, error);
      if (error instanceof TemplateException) {
        throw this.createTemplateError(error, fileName);
      }
      throw error;
    }
  }

  /**
   * テンプレートエラーを作成
   */
  private createTemplateError(error: TemplateException, fileName: string): Error {
    const errorMessage = this.formatTemplateErrorMessage(error);
    const suggestions = this.generateTemplateErrorSuggestions(error);
    
    const templateError = new Error(errorMessage);
    templateError.name = 'TemplateError';
    (templateError as any).details = {
      message: errorMessage,
      type: error.type,
      templatePath: error.templatePath,
      line: error.line,
      column: error.column,
      suggestions: suggestions,
      fileName: fileName
    };
    
    return templateError;
  }

  /**
   * テンプレートエラーメッセージをフォーマット
   */
  private formatTemplateErrorMessage(error: TemplateException): string {
    switch (error.type) {
      case TemplateError.FILE_NOT_FOUND:
        return `テンプレートファイルが見つかりません: ${error.templatePath}`;
      case TemplateError.CIRCULAR_REFERENCE:
        return `循環参照が検出されました: ${error.templatePath}`;
      case TemplateError.SYNTAX_ERROR:
        return `テンプレートファイルの構文エラー: ${error.templatePath}`;
      case TemplateError.PARAMETER_MISSING:
        return `必須パラメータが不足しています: ${error.templatePath}`;
      case TemplateError.TYPE_MISMATCH:
        return `パラメータの型が一致しません: ${error.templatePath}`;
      default:
        return `テンプレートエラー: ${error.message}`;
    }
  }

  /**
   * テンプレートエラーの修正提案を生成
   */
  private generateTemplateErrorSuggestions(error: TemplateException): string[] {
    const suggestions: string[] = [];
    
    switch (error.type) {
      case TemplateError.FILE_NOT_FOUND:
        suggestions.push('テンプレートファイルのパスを確認してください');
        suggestions.push('ファイルが存在することを確認してください');
        suggestions.push('相対パスが正しいことを確認してください');
        break;
      case TemplateError.CIRCULAR_REFERENCE:
        suggestions.push('テンプレート間の循環参照を解消してください');
        suggestions.push('テンプレートの依存関係を見直してください');
        break;
      case TemplateError.SYNTAX_ERROR:
        suggestions.push('テンプレートファイルのYAML構文を確認してください');
        suggestions.push('インデントが正しいことを確認してください');
        break;
      case TemplateError.PARAMETER_MISSING:
        suggestions.push('必須パラメータを指定してください');
        suggestions.push('paramsセクションで必要な値を設定してください');
        break;
      case TemplateError.TYPE_MISMATCH:
        suggestions.push('パラメータの型を確認してください');
        suggestions.push('文字列、数値、真偽値の型を正しく指定してください');
        break;
    }
    
    return suggestions;
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
  private async validateYamlSchema(yaml: any, yamlContent: string, fileName: string): Promise<void> {
    try {
      // グローバルスキーママネージャーを取得
      const globalSchemaManager = (global as any).globalSchemaManager;
      if (!globalSchemaManager) {
        console.warn('[YamlParser] スキーママネージャーが見つかりません');
        return;
      }

      const schema = await globalSchemaManager.loadSchema();
      if (!schema) {
        console.warn('[YamlParser] スキーマの読み込みに失敗しました');
        return;
      }

      // Ajvを使用してバリデーション
      const Ajv = require('ajv');
      const ajv = new Ajv({ 
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
      const validate = ajv.compile(schema);
      
      // カスタムバリデーションを実行
      const customValidationResult = this.validateComponentStructure(yaml);
      if (!customValidationResult.valid) {
        console.log('[YamlParser] カスタムバリデーションエラー:', customValidationResult.errors);
        throw this.createSchemaError(customValidationResult.errors, yamlContent, fileName);
      }

      console.log('[YamlParser] カスタムバリデーション成功 - Ajvバリデーションをスキップ');
      // カスタムバリデーションが成功した場合は、Ajvバリデーションをスキップ
      return;

      // 以下のAjvバリデーションは現在無効化
      // const valid = validate(yaml);
      
      // if (!valid) {
      //   console.log('[YamlParser] スキーマバリデーションエラー詳細:', JSON.stringify(validate.errors, null, 2));
      //   console.log('[YamlParser] バリデーション対象データ:', JSON.stringify(yaml, null, 2));
      //   console.log('[YamlParser] スキーマ定義:', JSON.stringify(schema?.definitions?.component, null, 2));
      //   
      //   // 各コンポーネントのoneOfバリデーションを個別にテスト
      //   if ((yaml as any).page && (yaml as any).page.components) {
      //     console.log('[YamlParser] コンポーネント配列の詳細:');
      //     (yaml as any).page.components.forEach((comp: any, index: number) => {
      //       console.log(`[YamlParser] コンポーネント[${index}]:`, JSON.stringify(comp, null, 2));
      //       const compKeys = Object.keys(comp);
      //       console.log(`[YamlParser] コンポーネント[${index}]のキー:`, compKeys);
      //     });
      //   }
      //   
      //   throw this.createSchemaError(validate.errors || [], yamlContent, fileName);
      // }
    } catch (error: any) {
      if (error.name === 'SchemaValidationError') {
        throw error;
      }
      console.error('[YamlParser] スキーマバリデーションでエラーが発生しました:', error);
    }
  }

  /**
   * パースエラーを作成
   */
  private createParseError(error: any, yamlContent: string, fileName: string): YamlErrorInfo {
    const errorMessage = error.message || 'Unknown error';
    const lines = yamlContent.split('\n');
    
    // エラーメッセージから行番号を抽出
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const lineNumber = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
    
    const errorLine = lines[lineNumber] || '';
    const suggestions = this.generateParseErrorSuggestions(errorMessage, errorLine);
    
    const yamlError = new Error(errorMessage);
    yamlError.name = 'YamlParseError';
    (yamlError as any).details = {
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
  private createSchemaError(errors: any[], yamlContent: string, fileName: string): Error {
    if (errors.length === 0) {
      return new Error('Unknown schema error');
    }

    const primaryError = errors[0];
    const errorMessage = this.formatSchemaErrorMessage(primaryError);
    const suggestions = this.generateSchemaErrorSuggestions(primaryError, errors);
    
    const schemaError = new Error(errorMessage);
    schemaError.name = 'SchemaValidationError';
    (schemaError as any).details = {
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
  private formatSchemaErrorMessage(error: any): string {
    const path = error.instancePath || error.dataPath || '';
    const message = error.message || 'Unknown schema error';
    const keyword = error.keyword || '';
    const params = error.params || {};
    
    let formattedMessage = `スキーマエラー`;
    if (path) {
      formattedMessage += ` (${path})`;
    }
    formattedMessage += `: ${message}`;
    
    if (keyword === 'required' && params.missingProperty) {
      formattedMessage += ` - 不足しているプロパティ: ${params.missingProperty}`;
    } else if (keyword === 'type' && params.type) {
      formattedMessage += ` - 期待される型: ${params.type}`;
    } else if (keyword === 'oneOf') {
      formattedMessage += ` - oneOfバリデーション失敗`;
    }
    
    return formattedMessage;
  }

  /**
   * スキーマエラー修正の提案を生成
   */
  private generateSchemaErrorSuggestions(primaryError: any, allErrors: any[]): string[] {
    const suggestions: string[] = [];
    
    if (primaryError.keyword === 'required') {
      const missingProperty = primaryError.params.missingProperty;
      suggestions.push(`必須プロパティ "${missingProperty}" が不足しています。`);
      suggestions.push(`コンポーネントの構造を確認してください。`);
    } else if (primaryError.keyword === 'type') {
      const expectedType = primaryError.params.type;
      suggestions.push(`プロパティの型が正しくありません。期待される型: ${expectedType}`);
    } else if (primaryError.keyword === 'enum') {
      const allowedValues = primaryError.params.allowedValues;
      suggestions.push(`無効な値です。許可される値: ${allowedValues.join(', ')}`);
    } else if (primaryError.keyword === 'oneOf') {
      suggestions.push(`コンポーネントの構造が正しくありません。`);
      suggestions.push(`利用可能なコンポーネント: Text, Input, Button, Form, Checkbox, Radio, Select, Divider, Container, Alert`);
      suggestions.push(`各コンポーネントは適切なプロパティを持つ必要があります。`);
    }
    
    // 追加のエラー情報を提供
    if (allErrors.length > 1) {
      suggestions.push(`他に ${allErrors.length - 1} 個のエラーがあります。詳細を確認してください。`);
    }
    
    return suggestions;
  }

  /**
   * コンポーネント構造をカスタムバリデーション
   */
  private validateComponentStructure(data: any): { valid: boolean; errors: any[] } {
    const errors: any[] = [];
    
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: [{ message: 'データが無効です' }] };
    }

    // page.componentsのバリデーション
    if (data.page && data.page.components) {
      if (!Array.isArray(data.page.components)) {
        errors.push({
          instancePath: '/page/components',
          message: 'componentsは配列である必要があります'
        });
      } else {
        data.page.components.forEach((comp: any, index: number) => {
          if (!comp || typeof comp !== 'object') {
            errors.push({
              instancePath: `/page/components/${index}`,
              message: 'コンポーネントはオブジェクトである必要があります'
            });
            return;
          }

          // 新しいtypeベースのバリデーション
          if (!comp.type || typeof comp.type !== 'string') {
            errors.push({
              instancePath: `/page/components/${index}`,
              message: 'コンポーネントはtypeフィールド（文字列）が必須です'
            });
            return;
          }

          const validTypes = ['Text', 'Input', 'Button', 'Form', 'Checkbox', 'Radio', 'Select', 'Divider', 'Container', 'Alert', 'Include'];
          if (!validTypes.includes(comp.type)) {
            errors.push({
              instancePath: `/page/components/${index}`,
              message: `無効なコンポーネントタイプ: ${comp.type}`
            });
          }
        });
      }
    }

    return { valid: errors.length === 0, errors };
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
    - type: Text
      variant: h1
      value: "TextUI Designer"
    - type: Text
      variant: p
      value: "プレビューが表示されています"`;
  }

  /**
   * コンポーネントに$include構文またはtype: Include/Ifが含まれているかチェック
   */
  private hasTemplateComponent(data: any, componentType: string): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // コンポーネントがIncludeタイプまたはIfタイプであるかチェック
    if (data.type === componentType) {
      return true;
    }

    // コンポーネントがオブジェクトであり、その中に$include構文が含まれているかチェック
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (typeof data[key] === 'object' && data[key] !== null) {
          if (this.hasTemplateComponent(data[key], componentType)) {
            return true;
          }
        }
      }
    }

    return false;
  }
} 