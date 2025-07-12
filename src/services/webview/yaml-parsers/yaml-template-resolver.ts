import * as YAML from 'yaml';
import { TemplateParser, TemplateException, TemplateError } from '../../template-parser';

export interface TemplateResolutionResult {
  data: any;
  resolved: boolean;
}

/**
 * YAMLテンプレート解決専用クラス
 * テンプレート参照の解決を担当
 */
export class YamlTemplateResolver {
  private templateParser: TemplateParser;

  constructor(templateParser: TemplateParser) {
    this.templateParser = templateParser;
  }

  /**
   * テンプレート参照を解決
   */
  async resolveTemplates(data: any, fileName: string): Promise<any> {
    try {
      console.log(`[YamlTemplateResolver] resolveTemplates開始: ${fileName}`);
      
      // テンプレートファイル（.template.yml）の場合は循環参照チェックをスキップ
      if (fileName.endsWith('.template.yml') || fileName.endsWith('.template.yaml')) {
        console.log(`[YamlTemplateResolver] テンプレートファイルのため、循環参照チェックをスキップ: ${fileName}`);
        return data;
      }
      
      // $include構文またはtype: Include/Ifが含まれている場合のみテンプレート解析を実行
      const yamlString = YAML.stringify(data);
      const hasInclude = yamlString.includes('$include:') || this.hasTemplateComponent(data, 'Include');
      const hasIf = yamlString.includes('$if:') || this.hasTemplateComponent(data, 'If');
      
      console.log(`[YamlTemplateResolver] $include含む: ${hasInclude}`);
      console.log(`[YamlTemplateResolver] $if含む: ${hasIf}`);
      
      if (hasInclude || hasIf) {
        console.log(`[YamlTemplateResolver] テンプレート解析を実行: ${fileName}`);
        return await this.templateParser.parseWithTemplates(
          yamlString,
          fileName
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof TemplateException) {
        throw this.createTemplateError(error, fileName);
      }
      throw error;
    }
  }

  /**
   * パラメータ付きでテンプレート参照を解決
   */
  async resolveTemplatesWithParameters(data: any, fileName: string, parameters: Record<string, any>): Promise<any> {
    try {
      console.log(`[YamlTemplateResolver] resolveTemplatesWithParameters開始: ${fileName}`);
      
      // テンプレートファイル（.template.yml）の場合は循環参照チェックをスキップ
      if (fileName.endsWith('.template.yml') || fileName.endsWith('.template.yaml')) {
        console.log(`[YamlTemplateResolver] テンプレートファイルのため、循環参照チェックをスキップ: ${fileName}`);
        return data;
      }
      
      // $include構文またはtype: Include/Ifが含まれている場合のみテンプレート解析を実行
      const yamlString = YAML.stringify(data);
      const hasInclude = yamlString.includes('$include:') || this.hasTemplateComponent(data, 'Include');
      const hasIf = yamlString.includes('$if:') || this.hasTemplateComponent(data, 'If');
      
      console.log(`[YamlTemplateResolver] $include含む: ${hasInclude}`);
      console.log(`[YamlTemplateResolver] $if含む: ${hasIf}`);
      
      if (hasInclude || hasIf) {
        console.log(`[YamlTemplateResolver] パラメータ付きテンプレート解析を実行: ${fileName}`);
        return await this.templateParser.parseWithTemplatesAndParameters(
          yamlString,
          fileName,
          parameters
        );
      }
      
      return data;
    } catch (error) {
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
    let message = `テンプレートエラー`;
    
    if (error.line) {
      message += ` (行 ${error.line}`;
      if (error.column) {
        message += `, 列 ${error.column}`;
      }
      message += ')';
    }
    
    message += `: ${error.type}`;
    
    switch (error.type) {
      case TemplateError.FILE_NOT_FOUND:
        message += ` - テンプレートファイルが見つかりません: ${error.templatePath}`;
        break;
      case TemplateError.CIRCULAR_REFERENCE:
        message += ` - 循環参照が検出されました: ${error.templatePath}`;
        break;
      case TemplateError.SYNTAX_ERROR:
        message += ` - テンプレート構文エラー: ${error.templatePath}`;
        break;
      case TemplateError.PARAMETER_MISSING:
        message += ` - 必須パラメータが不足しています: ${error.templatePath}`;
        break;
      case TemplateError.TYPE_MISMATCH:
        message += ` - パラメータの型が一致しません: ${error.templatePath}`;
        break;
    }
    
    return message;
  }

  /**
   * テンプレートエラー修正の提案を生成
   */
  private generateTemplateErrorSuggestions(error: TemplateException): string[] {
    const suggestions: string[] = [];
    
    switch (error.type) {
      case TemplateError.FILE_NOT_FOUND:
        suggestions.push(`テンプレートファイル "${error.templatePath}" が存在することを確認してください。`);
        suggestions.push(`ファイルパスが正しいことを確認してください。`);
        break;
      case TemplateError.CIRCULAR_REFERENCE:
        suggestions.push(`テンプレート間の循環参照を解決してください。`);
        suggestions.push(`参照チェーンを確認し、循環を断ち切ってください。`);
        break;
      case TemplateError.SYNTAX_ERROR:
        suggestions.push(`テンプレートファイルの構文を確認してください。`);
        suggestions.push(`YAMLの構文エラーがないかチェックしてください。`);
        break;
      case TemplateError.PARAMETER_MISSING:
        suggestions.push(`必須パラメータを指定してください。`);
        suggestions.push(`テンプレートの定義を確認し、必要なパラメータを追加してください。`);
        break;
      case TemplateError.TYPE_MISMATCH:
        suggestions.push(`パラメータの型を確認してください。`);
        suggestions.push(`文字列、数値、真偽値など、適切な型を指定してください。`);
        break;
    }
    
    return suggestions;
  }

  /**
   * テンプレートコンポーネントが含まれているかチェック
   */
  private hasTemplateComponent(data: any, componentType: string): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    if (Array.isArray(data)) {
      return data.some(item => this.hasTemplateComponent(item, componentType));
    }
    
    if (data.type === componentType) {
      return true;
    }
    
    return Object.values(data).some(value => this.hasTemplateComponent(value, componentType));
  }
}