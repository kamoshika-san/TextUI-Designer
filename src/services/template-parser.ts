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
 * ループ処理情報
 */
interface ForeachReference {
  items: string;
  as: string;
  template: any[];
}

/**
 * テンプレートパーサーサービス
 * テンプレート参照機能を担当
 */
export class TemplateParser {
  private errorHandler: typeof ErrorHandler;
  private maxDepth: number = 15;

  constructor(errorHandler: typeof ErrorHandler = ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * DSLテキストをテンプレート展開付きでパース
   */
  async parseWithTemplates(yamlContent: string, basePath: string): Promise<any> {
    try {
      const yamlData = yaml.parse(yamlContent);
      const result = await this.resolveTemplates(yamlData, basePath, 0, new Set());
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * テンプレート参照を再帰的に解決
   */
  private async resolveTemplates(
    data: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any> = {}
  ): Promise<any> {
    // 深度チェック（無限再帰防止）
    if (depth > this.maxDepth) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        basePath
      );
    }

    if (Array.isArray(data)) {
      const results = [];
      for (const item of data) {
        const result = await this.resolveTemplates(item, basePath, depth + 1, visitedFiles, params);
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }
      return this.applyParameters(results, params);
    }

    if (typeof data === 'object' && data !== null) {
      // $include構文の処理
      if ('$include' in data) {
        return this.applyParameters(await this.processInclude(data.$include, basePath, depth, visitedFiles, params), params);
      }
      // $if構文の処理
      if ('$if' in data) {
        // $if構文の詳細検証
        if (!data.$if || typeof data.$if !== 'object' || 
            !('condition' in data.$if) || !('template' in data.$if) ||
            typeof data.$if.condition !== 'string' || 
            !Array.isArray(data.$if.template)) {
          throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
        }
        return this.applyParameters(await this.processConditional(data.$if, basePath, depth, visitedFiles, params), params);
      }
      // $foreach構文の処理
      if ('$foreach' in data) {
        // $foreach構文の詳細検証
        if (!data.$foreach || typeof data.$foreach !== 'object' ||
            !('items' in data.$foreach) || !('as' in data.$foreach) || !('template' in data.$foreach) ||
            typeof data.$foreach.items !== 'string' || 
            typeof data.$foreach.as !== 'string' ||
            !Array.isArray(data.$foreach.template)) {
          throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
        }
        return this.applyParameters(await this.processForeach(data.$foreach, basePath, depth, visitedFiles, params), params);
      }
      // 不正な構文のチェック
      const specialKeys = Object.keys(data).filter(key => key.startsWith('$'));
      if (specialKeys.length > 0) {
        const validSpecialKeys = ['$if', '$foreach', '$include'];
        const invalidKeys = specialKeys.filter(key => !validSpecialKeys.includes(key));
        if (invalidKeys.length > 0) {
          throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
        }
      }

      // 通常のオブジェクト処理
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = await this.resolveTemplates(value, basePath, depth + 1, visitedFiles, params);
      }
      
      // 不正な特殊キーをチェック
      const objectSpecialKeys = Object.keys(result).filter(key => key.startsWith('$'));
      if (objectSpecialKeys.length > 0) {
        const validSpecialKeys = ['$if', '$foreach', '$include'];
        const invalidKeys = objectSpecialKeys.filter(key => !validSpecialKeys.includes(key));
        
        // 有効な特殊キーでも構造が不正な場合のチェック
        if (objectSpecialKeys.some(key => validSpecialKeys.includes(key))) {
          for (const key of objectSpecialKeys) {
            if (key === '$if') {
              const ifData = result[key];
              if (!ifData || typeof ifData !== 'object' || 
                  !('condition' in ifData) || !('template' in ifData) ||
                  typeof ifData.condition !== 'string' || 
                  !Array.isArray(ifData.template)) {
                throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
              }
            } else if (key === '$foreach') {
              const foreachData = result[key];
              if (!foreachData || typeof foreachData !== 'object' ||
                  !('items' in foreachData) || !('as' in foreachData) || !('template' in foreachData) ||
                  typeof foreachData.items !== 'string' || 
                  typeof foreachData.as !== 'string' || 
                  !Array.isArray(foreachData.template)) {
                throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
              }
            }
          }
        }
        
        // 無効な特殊キーが存在する場合
        if (invalidKeys.length > 0) {
          throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
        }
      }
      
      return this.applyParameters(result, params);
    }

    // 文字列の場合は文字列補間を適用
    if (typeof data === 'string') {
      return this.interpolateString(data, params);
    }

    // プリミティブ型の場合はそのまま返す
    return data;
  }

  /**
   * $include構文を処理
   */
  private async processInclude(
    includeRef: IncludeReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    parentParams: Record<string, any> = {}
  ): Promise<any> {
    const templatePath = this.resolveTemplatePath(includeRef.template, basePath);
    
    // 循環参照チェック（$includeのみ）
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

      // includeRef.paramsと親paramsをマージ
      const mergedParams = { ...parentParams, ...(includeRef.params || {}) };

      // テンプレートを解決（$include、$if、$foreachを含む）
      const result = await this.resolveTemplates(
        templateData,
        templatePath,
        depth + 1,
        visitedFiles,
        mergedParams
      );

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
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any> {
    // 条件式を評価
    const isConditionTrue = this.evaluateConditionWithParams(conditionalRef.condition, params);
    
    if (isConditionTrue) {
      // 条件が真の場合、テンプレートを処理
      const results = [];
      for (const templateItem of conditionalRef.template) {
        const result = await this.resolveTemplates(templateItem, basePath, depth + 1, visitedFiles, params);
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }
      return results;
    } else {
      // 条件が偽の場合、空の配列を返す
      return [];
    }
  }

  /**
   * $foreach構文を処理
   */
  private async processForeach(
    foreachRef: ForeachReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any> {
    // 配列アイテムを取得（パラメータコンテキストから）
    const items = this.getArrayFromParams(foreachRef.items, params);
    const results = [];

    // 各アイテムに対してテンプレートを適用
    for (const item of items) {
      // アイテムをループ変数として設定
      const loopParams = {
        ...params,
        [foreachRef.as]: item
      };

      // テンプレートを各アイテムに適用
      for (const templateItem of foreachRef.template) {
        const result = await this.resolveTemplates(templateItem, basePath, depth + 1, visitedFiles, loopParams);
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }
    }

    return results;
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
      if (trimmedCondition === 'true') {
        return true;
      }
      if (trimmedCondition === 'false') {
        return false;
      }
      
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
   * パラメータをテンプレートに適用（条件分岐・ループ対応版）
   */
  private applyParameters(templateData: any, params: Record<string, any>): any {
    try {
      if (Array.isArray(templateData)) {
        const results = [];
        for (const item of templateData) {
          const result = this.applyParameters(item, params);
          if (Array.isArray(result)) {
            results.push(...result);
          } else {
            results.push(result);
          }
        }
        return results;
      }

      if (typeof templateData === 'object' && templateData !== null) {
        // $if/$foreachはresolveTemplatesで処理済みのため、ここでは再帰的に各プロパティを補間のみ
        const result: any = {};
        for (const [key, value] of Object.entries(templateData)) {
          result[key] = this.applyParameters(value, params);
        }
        return result;
      }

      // 文字列の場合のみ補間処理を行う
      if (typeof templateData === 'string') {
        return this.interpolateString(templateData, params);
      }

      // プリミティブ型（数値、真偽値）はそのまま返す
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
      
      // {{ xxx }} 形式の文字列補間を処理
      if (trimmedCondition.includes('{{') && trimmedCondition.includes('}}')) {
        const interpolatedCondition = this.interpolateString(trimmedCondition, params);
        // 補間後の値を評価
        if (typeof interpolatedCondition === 'boolean') {
          return interpolatedCondition;
        } else if (typeof interpolatedCondition === 'string') {
          return interpolatedCondition.length > 0 && interpolatedCondition.toLowerCase() !== 'false';
        } else if (typeof interpolatedCondition === 'number') {
          return interpolatedCondition !== 0;
        } else if (Array.isArray(interpolatedCondition)) {
          return (interpolatedCondition as any[]).length > 0;
        } else if (interpolatedCondition === null || interpolatedCondition === undefined) {
          return false;
        } else {
          return true;
        }
      }
      
      // その他の条件式は既存のevaluateConditionを使用
      return this.evaluateCondition(condition);
    } catch (error) {
      return false;
    }
  }

  /**
   * パラメータから配列を取得
   */
  private getArrayFromParams(itemsPath: string, params: Record<string, any>): any[] {
    try {
      const trimmedPath = itemsPath.trim();
      
      // $params.xxx 形式の変数参照
      if (trimmedPath.startsWith('$params.')) {
        const paramPath = trimmedPath.substring(8); // '$params.' を除去
        const value = this.getNestedValue(params, paramPath);
        
        if (Array.isArray(value)) {
          return value;
        } else {
          return []; // 配列でない場合は空配列を返す
        }
      }
      
      // {{ xxx }} 形式の文字列補間を処理
      if (trimmedPath.includes('{{') && trimmedPath.includes('}}')) {
        const interpolatedPath = this.interpolateString(trimmedPath, params);
        if (Array.isArray(interpolatedPath)) {
          return interpolatedPath;
        }
        // 補間後の値が文字列の場合、パラメータから取得を試行
        if (typeof interpolatedPath === 'string') {
          const value = this.getNestedValue(params, interpolatedPath);
          return Array.isArray(value) ? value : [];
        }
        return [];
      }
      
      // 直接の配列指定（例: "[1, 2, 3]"）
      if (trimmedPath.startsWith('[') && trimmedPath.endsWith(']')) {
        try {
          return JSON.parse(trimmedPath);
        } catch {
          return [];
        }
      }
      
      return [];
    } catch (error) {
      return [];
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
  private interpolateString(str: string, params: Record<string, any>): any {
    // 非文字列の場合はそのまま返す
    if (typeof str !== 'string') {
      return str;
    }

    // 文字列全体が{{ xxx }}で囲まれている場合、値を直接返す
    const fullMatch = str.match(/^\{\{\s*([^}]+)\s*\}\}$/);
    if (fullMatch) {
      const varPath = fullMatch[1].trim();
      
      // $params.xxx 形式の変数参照を処理
      if (varPath.startsWith('$params.')) {
        const paramPath = varPath.substring(8); // '$params.' を除去
        const value = this.getNestedValue(params, paramPath);
        return value !== undefined ? value : str;
      }
      
      // 通常の変数参照を処理
      const value = this.getNestedValue(params, varPath);
      return value !== undefined ? value : str;
    }

    // 部分的な文字列置換を行う
    let result = str;
    
    // $params.xxx 形式の変数参照を処理
    result = result.replace(/\{\{\s*\$params\.([^}]+)\s*\}\}/g, (match, paramPath) => {
      const trimmedPath = paramPath.trim();
      const value = this.getNestedValue(params, trimmedPath);
      return value !== undefined ? String(value) : match;
    });

    // {{ item.name }} 形式の変数参照を処理
    result = result.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, varPath) => {
      const trimmedPath = varPath.trim();
      // $params.で始まる場合は既に処理済みなのでスキップ
      if (trimmedPath.startsWith('$params.')) {
        return match;
      }
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

      // 再帰的に各プロパティをチェック（$ifと$foreachは循環参照対象外）
      for (const [key, value] of Object.entries(data)) {
        if (key !== '$if' && key !== '$foreach') {
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