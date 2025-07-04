import * as vscode from 'vscode';
import * as yaml from 'yaml';
import * as path from 'path';
import * as fs from 'fs';
import { ErrorHandler } from '../utils/error-handler';
import { TemplateCacheService, CachedTemplate } from './template-cache';
import { 
  ParameterInterpolator,
  IncludeProcessor,
  ConditionalProcessor,
  LoopProcessor
} from './template-processors';

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
 * テンプレート参照機能を担当（リファクタリング版）
 */
export class TemplateParser {
  private errorHandler: typeof ErrorHandler;
  private maxDepth: number = 15;
  private templateCacheService: TemplateCacheService;
  
  // 各処理を担当するプロセッサー
  private parameterInterpolator: ParameterInterpolator;
  private includeProcessor: IncludeProcessor;
  private conditionalProcessor: ConditionalProcessor;
  private loopProcessor: LoopProcessor;

  constructor(errorHandler: typeof ErrorHandler = ErrorHandler) {
    this.errorHandler = errorHandler;
    this.templateCacheService = new TemplateCacheService();
    
    // プロセッサーを初期化
    this.parameterInterpolator = new ParameterInterpolator();
    this.includeProcessor = new IncludeProcessor(this.templateCacheService);
    this.conditionalProcessor = new ConditionalProcessor();
    this.loopProcessor = new LoopProcessor();
  }

  /**
   * テンプレートパーサーを破棄
   */
  dispose(): void {
    if (this.templateCacheService) {
      this.templateCacheService.dispose();
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats() {
    return this.templateCacheService.getStats();
  }

  /**
   * 特定のテンプレートファイルのキャッシュを無効化
   */
  invalidateTemplateCache(filePath: string): void {
    this.templateCacheService.invalidateTemplate(filePath);
  }

  /**
   * キャッシュを完全にクリア
   */
  clearCache(): void {
    this.templateCacheService.clear();
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
   * テンプレート参照を再帰的に解決（主要なコーディネーター）
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
      return this.parameterInterpolator.applyParameters(results, params);
    }

    if (typeof data === 'object' && data !== null) {
      // $include構文の処理
      if ('$include' in data) {
        return this.parameterInterpolator.applyParameters(
          await this.processInclude(data.$include, basePath, depth, visitedFiles, params), 
          params
        );
      }
      
      // $if構文の処理
      if ('$if' in data) {
        if (!this.conditionalProcessor.validateConditionalSyntax(data, basePath)) {
          throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
        }
        return this.parameterInterpolator.applyParameters(
          await this.conditionalProcessor.processConditional(
            data.$if, basePath, depth, visitedFiles, params, 
            this.resolveTemplates.bind(this)
          ), 
          params
        );
      }
      
      // $foreach構文の処理
      if ('$foreach' in data) {
        if (!this.loopProcessor.validateForeachSyntax(data, basePath)) {
          throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
        }
        return this.parameterInterpolator.applyParameters(
          await this.loopProcessor.processForeach(
            data.$foreach, basePath, depth, visitedFiles, params,
            this.resolveTemplates.bind(this)
          ), 
          params
        );
      }
      
      // 不正な構文のチェック
      this.validateSpecialSyntax(data, basePath);

      // 通常のオブジェクト処理
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = await this.resolveTemplates(value, basePath, depth + 1, visitedFiles, params);
      }
      
      return this.parameterInterpolator.applyParameters(result, params);
    }

    // 文字列の場合は文字列補間を適用
    if (typeof data === 'string') {
      return this.parameterInterpolator.interpolateString(data, params);
    }

    // プリミティブ型の場合はそのまま返す
    return data;
  }

  /**
   * $include構文を処理（IncludeProcessorに委譲）
   */
  private async processInclude(
    includeRef: IncludeReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    parentParams: Record<string, any> = {}
  ): Promise<any> {
    const includeResult = await this.includeProcessor.process(
      includeRef, basePath, depth, visitedFiles, parentParams
    );

    // includeProcessorから返される情報を使って再帰的に解決
    return await this.resolveTemplates(
      includeResult.templateData,
      includeResult.templatePath,
      includeResult.depth,
      visitedFiles,
      includeResult.mergedParams
    );
  }

  /**
   * 特殊構文の検証
   */
  private validateSpecialSyntax(data: any, basePath: string): void {
    const specialKeys = Object.keys(data).filter(key => key.startsWith('$'));
    if (specialKeys.length > 0) {
      const validSpecialKeys = ['$if', '$foreach', '$include'];
      const invalidKeys = specialKeys.filter(key => !validSpecialKeys.includes(key));
      if (invalidKeys.length > 0) {
        throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
      }
    }
  }

  /**
   * テンプレートパスが有効かどうかを検証
   */
  async validateTemplatePath(templatePath: string, basePath: string): Promise<boolean> {
    return await this.includeProcessor.validateTemplatePath(templatePath, basePath);
  }

  /**
   * 循環参照を検出
   */
  detectCircularReferences(content: string, basePath: string): string[] {
    return this.includeProcessor.detectCircularReferences(content, basePath);
  }

  /**
   * テンプレートファイルを読み込み（キャッシュ経由）
   */
  private async loadTemplateFile(templatePath: string): Promise<string> {
    try {
      const cachedTemplate = await this.templateCacheService.getTemplate(templatePath);
      return cachedTemplate.content;
    } catch (error) {
      throw new TemplateException(
        TemplateError.FILE_NOT_FOUND,
        templatePath
      );
    }
  }
} 