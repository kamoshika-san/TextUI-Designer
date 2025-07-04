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
 * 条件分岐情報
 */
interface ConditionalReference {
  condition: string;
  template: any[];
}

/**
 * テンプレートパーサーサービス
 * テンプレート参照機能を担当
 */
export class TemplateParser {
  private errorHandler: typeof ErrorHandler;
  private maxDepth: number = 10;

  constructor(errorHandler: typeof ErrorHandler = ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * DSLテキストをテンプレート展開付きでパース
   */
  async parseWithTemplates(text: string, basePath: string): Promise<any> {
    try {
      const visitedFiles = new Set<string>();
      const parsed = yaml.parse(text);
      
      // $include構文が存在するかチェック
      const hasInclude = this.hasIncludeSyntax(parsed);
      
      if (!hasInclude) {
        return parsed;
      }
      
      const result = await this.resolveTemplates(parsed, basePath, 0, visitedFiles);
      
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
    depth: number,
    visitedFiles: Set<string>
  ): Promise<any> {
    if (depth > this.maxDepth) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        basePath
      );
    }

    if (Array.isArray(data)) {
      // 並列処理ではなく順次処理に変更
      const results = [];
      for (const item of data) {
        const result = await this.resolveTemplates(item, basePath, depth + 1, visitedFiles);
        results.push(result);
      }
      return results;
    }

    if (typeof data === 'object' && data !== null) {
      // $include構文の処理
      if ('$include' in data) {
        return await this.processInclude(data.$include, basePath, depth, visitedFiles);
      }

      // $if構文の処理
      if ('$if' in data) {
        return await this.processConditional(data.$if, basePath, depth, visitedFiles);
      }

      // 再帰的にオブジェクトの各プロパティを処理
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = await this.resolveTemplates(value, basePath, depth + 1, visitedFiles);
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
    depth: number,
    visitedFiles: Set<string>
  ): Promise<any> {
    const templatePath = this.resolveTemplatePath(includeRef.template, basePath);
    
    // 循環参照チェック
    if (visitedFiles.has(templatePath)) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        templatePath
      );
    }

    visitedFiles.add(templatePath);

    try {
      // テンプレートファイルを読み込み
      const templateContent = await this.loadTemplateFile(templatePath);
      const templateData = yaml.parse(templateContent);

      // パラメータを適用
      const resolvedTemplate = this.applyParameters(
        templateData,
        includeRef.params || {}
      );

      // テンプレートファイルに$includeが含まれている場合のみ再帰的に解決
      const hasIncludeInTemplate = this.hasIncludeSyntax(resolvedTemplate);
      let result;
      if (hasIncludeInTemplate) {
        result = await this.resolveTemplates(
          resolvedTemplate,
          templatePath,
          depth + 1,
          visitedFiles
        );
      } else {
        result = resolvedTemplate;
      }

      visitedFiles.delete(templatePath);
      return result;
    } catch (error) {
      visitedFiles.delete(templatePath);
      throw error;
    }
  }

  /**
   * $if構文を処理
   */
  private async processConditional(
    conditionalRef: ConditionalReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>
  ): Promise<any> {
    // 条件式を評価
    const isConditionTrue = this.evaluateCondition(conditionalRef.condition);
    
    if (isConditionTrue) {
      // 条件が真の場合、テンプレートを処理
      // $if構文は循環参照を引き起こさないため、深さ制限をリセット
      const results = [];
      for (const templateItem of conditionalRef.template) {
        const result = await this.resolveTemplates(templateItem, basePath, 0, visitedFiles);
        results.push(result);
      }
      return results;
    } else {
      // 条件が偽の場合、空の配列を返す
      return [];
    }
  }

  /**
   * 条件式を評価
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // 条件式のパターンを解析
      const trimmedCondition = condition.trim();
      
      // 単純な変数参照の場合（例: $params.showHeader）
      if (trimmedCondition.startsWith('$params.')) {
        // この場合は、パラメータコンテキストが必要なので、
        // 実際の評価はapplyParameters内で行う
        return true; // 一時的にtrueを返す
      }
      
      // 真偽値の直接指定
      if (trimmedCondition === 'true') return true;
      if (trimmedCondition === 'false') return false;
      
      // 数値の比較
      const numberMatch = trimmedCondition.match(/^(\d+)$/);
      if (numberMatch) {
        return parseInt(numberMatch[1]) !== 0;
      }
      
      // 文字列の存在チェック
      if (trimmedCondition.startsWith('"') && trimmedCondition.endsWith('"')) {
        const stringValue = trimmedCondition.slice(1, -1);
        return stringValue.length > 0;
      }
      
      // デフォルトはfalse
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * パラメータをテンプレートに適用（条件分岐対応版）
   */
  private applyParameters(templateData: any, params: Record<string, any>): any {
    try {
      if (Array.isArray(templateData)) {
        return templateData.map(item => this.applyParameters(item, params));
      }

      if (typeof templateData === 'object' && templateData !== null) {
        // $if構文の処理
        if ('$if' in templateData) {
          const condition = templateData.$if.condition;
          const isConditionTrue = this.evaluateConditionWithParams(condition, params);
          
          if (isConditionTrue) {
            // 条件が真の場合、テンプレートを適用
            return this.applyParameters(templateData.$if.template, params);
          } else {
            // 条件が偽の場合、空の配列を返す
            return [];
          }
        }

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
    } catch (error) {
      throw error;
    }
  }

  /**
   * パラメータコンテキスト付きで条件式を評価
   */
  private evaluateConditionWithParams(condition: string, params: Record<string, any>): boolean {
    try {
      const trimmedCondition = condition.trim();
      
      // $params.xxx 形式の変数参照
      if (trimmedCondition.startsWith('$params.')) {
        const paramPath = trimmedCondition.substring(8); // '$params.' を除去
        const value = this.getNestedValue(params, paramPath);
        
        // 値の型に基づいて評価
        if (typeof value === 'boolean') {
          return value;
        } else if (typeof value === 'string') {
          return value.length > 0 && value.toLowerCase() !== 'false';
        } else if (typeof value === 'number') {
          return value !== 0;
        } else if (Array.isArray(value)) {
          return value.length > 0;
        } else if (value === null || value === undefined) {
          return false;
        } else {
          return true; // オブジェクトの場合は存在するのでtrue
        }
      }
      
      // その他の条件式は既存のevaluateConditionを使用
      return this.evaluateCondition(condition);
    } catch (error) {
      return false;
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
        // $includeのみ循環参照チェック
        if ('$include' in data) {
          const templatePath = this.resolveTemplatePath(data.$include.template, currentPath);
          if (stack.has(templatePath)) {
            circularRefs.push(templatePath);
            return;
          }
          if (!visited.has(templatePath)) {
            visited.add(templatePath);
            stack.add(templatePath);
            // 再帰的に$include先をチェック
            // 実際のファイル読み込みは行わず、パスのみチェック
            stack.delete(templatePath);
          }
        }
        // $include以外のプロパティは再帰的に中身だけチェック（$include以外は循環参照対象外）
        for (const [key, value] of Object.entries(data)) {
          if (key !== '$include') {
            checkCircular(value, currentPath);
          }
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

      // 再帰的に各プロパティをチェック（$ifは循環参照対象外）
      for (const [key, value] of Object.entries(data)) {
        if (key !== '$if') {
          if (this.hasIncludeSyntax(value)) {
            return true;
          }
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