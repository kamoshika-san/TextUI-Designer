import * as vscode from 'vscode';
import * as yaml from 'yaml';
import * as path from 'path';
import * as fs from 'fs';
import { ErrorHandler } from '../utils/error-handler';

/**
 * テンプレート参照エラーの種類
 */
export enum TemplateError {
  FILE_NOT_FOUND = 'TEMPLATE_FILE_NOT_FOUND',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  SYNTAX_ERROR = 'TEMPLATE_SYNTAX_ERROR',
  PARAMETER_MISSING = 'REQUIRED_PARAMETER_MISSING',
  TYPE_MISMATCH = 'PARAMETER_TYPE_MISMATCH'
}

/**
 * テンプレート例外クラス
 */
export class TemplateException extends Error {
  constructor(
    public type: TemplateError,
    public templatePath: string,
    public line?: number,
    public column?: number
  ) {
    super(`Template error in ${templatePath}: ${type}`);
    this.name = 'TemplateException';
  }
}

/**
 * テンプレート参照情報
 */
interface IncludeReference {
  template: string;
  params?: Record<string, any>;
}

/**
 * テンプレートパーサーサービス
 * テンプレート参照機能を担当
 */
export class TemplateParser {
  private errorHandler: typeof ErrorHandler;
  private visitedFiles: Set<string> = new Set();
  private maxDepth: number = 10;

  constructor(errorHandler: typeof ErrorHandler = ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * DSLテキストをテンプレート展開付きでパース
   */
  async parseWithTemplates(text: string, basePath: string): Promise<any> {
    try {
      this.visitedFiles.clear();
      const parsed = yaml.parse(text);
      
      // $include構文が存在するかチェック
      const hasInclude = this.hasIncludeSyntax(parsed);
      
      if (!hasInclude) {
        return parsed;
      }
      
      const result = await this.resolveTemplates(parsed, basePath, 0);
      
      // 返り値が配列の場合は1階層だけflat化
      if (Array.isArray(result)) {
        return result.flat();
      }
      
      // page.componentsが配列なら再帰的にflat化
      if (result && typeof result === 'object' && result.page && Array.isArray(result.page.components)) {
        result.page.components = this.deepFlat(result.page.components);
        
        // 各コンポーネントが正しい構造になっているかチェック
        result.page.components.forEach((comp: any, index: number) => {
          if (Array.isArray(comp)) {
            // 配列の場合は最初の要素を取得
            result.page.components[index] = comp[0];
          }
        });
        
        // 最終的なflat化を再度実行
        result.page.components = this.deepFlat(result.page.components);
      }
      
      return result;
    } catch (error) {
      if (error instanceof TemplateException) {
        throw error;
      }
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }
  }

  /**
   * テンプレート参照を再帰的に解決
   */
  private async resolveTemplates(
    data: any,
    basePath: string,
    depth: number
  ): Promise<any> {
    if (depth > this.maxDepth) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        basePath
      );
    }

    if (Array.isArray(data)) {
      return await Promise.all(
        data.map(item => this.resolveTemplates(item, basePath, depth + 1))
      );
    }

    if (typeof data === 'object' && data !== null) {
      // $include構文の処理
      if ('$include' in data) {
        return await this.processInclude(data.$include, basePath, depth);
      }

      // 再帰的にオブジェクトの各プロパティを処理
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = await this.resolveTemplates(value, basePath, depth + 1);
      }
      return result;
    }

    return data;
  }

  /**
   * $include構文を処理
   */
  private async processInclude(
    includeRef: IncludeReference,
    basePath: string,
    depth: number
  ): Promise<any> {
    const templatePath = this.resolveTemplatePath(includeRef.template, basePath);
    
    // 循環参照チェック
    if (this.visitedFiles.has(templatePath)) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        templatePath
      );
    }

    this.visitedFiles.add(templatePath);

    try {
      // テンプレートファイルを読み込み
      const templateContent = await this.loadTemplateFile(templatePath);
      const templateData = yaml.parse(templateContent);

      // パラメータを適用
      const resolvedTemplate = this.applyParameters(
        templateData,
        includeRef.params || {}
      );

      // 再帰的にテンプレート内の参照を解決
      const result = await this.resolveTemplates(
        resolvedTemplate,
        templatePath,
        depth + 1
      );

      this.visitedFiles.delete(templatePath);
      return result;
    } catch (error) {
      this.visitedFiles.delete(templatePath);
      throw error;
    }
  }

  /**
   * テンプレートファイルのパスを解決
   */
  private resolveTemplatePath(templatePath: string, basePath: string): string {
    // 絶対パスの場合
    if (path.isAbsolute(templatePath)) {
      return templatePath;
    }

    // 相対パスの場合
    const baseDir = path.dirname(basePath);
    const resolvedPath = path.resolve(baseDir, templatePath);

    // パストラバーサル攻撃の防止
    const normalizedPath = path.normalize(resolvedPath);
    if (!normalizedPath.startsWith(path.resolve(baseDir))) {
      throw new TemplateException(
        TemplateError.FILE_NOT_FOUND,
        templatePath
      );
    }

    return normalizedPath;
  }

  /**
   * テンプレートファイルを読み込み
   */
  private async loadTemplateFile(templatePath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(templatePath, 'utf-8');
      return content;
    } catch (error) {
      throw new TemplateException(
        TemplateError.FILE_NOT_FOUND,
        templatePath
      );
    }
  }

  /**
   * パラメータをテンプレートに適用
   */
  private applyParameters(templateData: any, params: Record<string, any>): any {
    if (Array.isArray(templateData)) {
      return templateData.map(item => this.applyParameters(item, params));
    }

    if (typeof templateData === 'object' && templateData !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(templateData)) {
        result[key] = this.applyParameters(value, params);
      }
      return result;
    }

    if (typeof templateData === 'string') {
      const result = this.interpolateString(templateData, params);
      return result;
    }

    return templateData;
  }

  /**
   * 文字列内の変数を展開
   */
  private interpolateString(str: string, params: Record<string, any>): string {
    const result = str.replace(/\{\{\s*\$params\.([^}]+)\s*\}\}/g, (match, paramPath) => {
      const trimmedPath = paramPath.trim();
      const value = this.getNestedValue(params, trimmedPath);
      return value !== undefined ? String(value) : match;
    });
    return result;
  }

  /**
   * ネストしたオブジェクトから値を取得
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  /**
   * テンプレートファイルの存在確認
   */
  async validateTemplatePath(templatePath: string, basePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolveTemplatePath(templatePath, basePath);
      await fs.promises.access(resolvedPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 循環参照を検出
   */
  detectCircularReferences(
    content: string,
    basePath: string
  ): string[] {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const circularRefs: string[] = [];

    const checkCircular = (data: any, currentPath: string) => {
      if (typeof data === 'object' && data !== null) {
        if ('$include' in data) {
          const templatePath = this.resolveTemplatePath(data.$include.template, currentPath);
          
          if (stack.has(templatePath)) {
            circularRefs.push(templatePath);
            return;
          }

          if (!visited.has(templatePath)) {
            visited.add(templatePath);
            stack.add(templatePath);
            
            // 実際のファイル読み込みは行わず、パスのみチェック
            stack.delete(templatePath);
          }
        }

        for (const value of Object.values(data)) {
          checkCircular(value, currentPath);
        }
      }
    };

    try {
      const parsed = yaml.parse(content);
      checkCircular(parsed, basePath);
    } catch {
      // パースエラーは無視
    }

    return circularRefs;
  }

  /**
   * オブジェクト内に$include構文が存在するかチェック
   */
  private hasIncludeSyntax(data: any): boolean {
    if (Array.isArray(data)) {
      return data.some(item => this.hasIncludeSyntax(item));
    }

    if (typeof data === 'object' && data !== null) {
      // $include構文の直接チェック
      if ('$include' in data) {
        return true;
      }

      // 再帰的に各プロパティをチェック
      for (const value of Object.values(data)) {
        if (this.hasIncludeSyntax(value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 配列を再帰的にflat化
   */
  private deepFlat(arr: any[]): any[] {
    return arr.reduce((acc, val) =>
      Array.isArray(val) ? acc.concat(this.deepFlat(val)) : acc.concat(val), []);
  }
} 