import { TemplateResolver } from './template-resolver';
import { TemplateValidator } from './template-validator';
import { TemplateError, TemplateException } from '../template-parser';

/**
 * テンプレート解決のコーディネーター
 * 再帰的なテンプレート解決の主要なロジックを担当
 */
export class TemplateCoordinator {
  private readonly maxDepth: number = 15;

  constructor(
    private readonly resolver: TemplateResolver,
    private readonly validator: TemplateValidator
  ) {}

  /**
   * テンプレート参照を再帰的に解決（主要なコーディネーター）
   */
  async resolveTemplates(
    data: any,
    basePath: string,
    depth: number = 0,
    visitedFiles: Set<string> = new Set(),
    params: Record<string, any> = {}
  ): Promise<any> {
    // 深度チェック（無限再帰防止）
    if (depth > this.maxDepth) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        basePath
      );
    }

    // 配列の処理
    if (Array.isArray(data)) {
      return await this.resolveArray(data, basePath, depth, visitedFiles, params);
    }

    // オブジェクトの処理
    if (typeof data === 'object' && data !== null) {
      return await this.resolveObject(data, basePath, depth, visitedFiles, params);
    }

    // 文字列の処理
    if (typeof data === 'string') {
      return this.resolver.interpolateString(data, params);
    }

    // プリミティブ型の場合はそのまま返す
    return data;
  }

  /**
   * 配列の再帰的解決
   */
  private async resolveArray(
    data: any[],
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any[]> {
    const results = [];
    for (const item of data) {
      const result = await this.resolveTemplates(item, basePath, depth + 1, visitedFiles, params);
      if (Array.isArray(result)) {
        results.push(...result);
      } else {
        results.push(result);
      }
    }
    return this.resolver.applyParameters(results, params);
  }

  /**
   * オブジェクトの再帰的解決
   */
  private async resolveObject(
    data: Record<string, any>,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any> {
    // $include構文の処理
    if ('$include' in data) {
      return await this.resolver.processInclude(
        data.$include, basePath, depth, visitedFiles, params, this.resolveTemplates.bind(this)
      );
    }
    
    // $if構文の処理
    if ('$if' in data) {
      this.validator.validateConditionalSyntax(data, basePath);
      return await this.resolver.processConditional(
        data.$if, basePath, depth, visitedFiles, params, this.resolveTemplates.bind(this)
      );
    }
    
    // $foreach構文の処理
    if ('$foreach' in data) {
      this.validator.validateForeachSyntax(data, basePath);
      return await this.resolver.processForeach(
        data.$foreach, basePath, depth, visitedFiles, params, this.resolveTemplates.bind(this)
      );
    }
    
    // 不正な構文のチェック
    this.validator.validateSpecialSyntax(data, basePath);

    // 通常のオブジェクト処理
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = await this.resolveTemplates(value, basePath, depth + 1, visitedFiles, params);
    }
    
    return this.resolver.applyParameters(result, params);
  }
} 