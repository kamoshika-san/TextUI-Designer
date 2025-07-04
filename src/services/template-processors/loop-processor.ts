import { BaseTemplateProcessor } from './base-processor';
import { TemplateError, TemplateException } from '../template-parser';
import { ParameterInterpolator } from './parameter-interpolator';

/**
 * ループ処理情報
 */
interface ForeachReference {
  items: string;
  as: string;
  template: any[];
}

/**
 * $foreach構文を処理するクラス
 */
export class LoopProcessor extends BaseTemplateProcessor {
  private parameterInterpolator: ParameterInterpolator;

  constructor() {
    super();
    this.parameterInterpolator = new ParameterInterpolator();
  }

  /**
   * BaseTemplateProcessorのインターフェース実装
   */
  async process(
    data: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any> {
    // この方法は外部からresolveTemplatesを受け取れないため、
    // 実際の使用では processForeach メソッドを直接呼び出してもらう
    throw new Error('LoopProcessor.process() は直接使用しないでください。processForeach() を使用してください。');
  }

  /**
   * ループ処理を実行（実際の処理メソッド）
   */
  async processForeach(
    foreachRef: ForeachReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>,
    resolveTemplates: (data: any, basePath: string, depth: number, visitedFiles: Set<string>, params: Record<string, any>) => Promise<any>
  ): Promise<any> {
    this.checkDepth(depth, basePath);

    // $foreach構文の詳細検証
    if (!foreachRef || typeof foreachRef !== 'object' ||
        !('items' in foreachRef) || !('as' in foreachRef) || !('template' in foreachRef) ||
        typeof foreachRef.items !== 'string' || 
        typeof foreachRef.as !== 'string' ||
        !Array.isArray(foreachRef.template)) {
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }

    // 配列アイテムを取得（パラメータコンテキストから）
    const items = this.parameterInterpolator.getArrayFromParams(foreachRef.items, params);
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
        const result = await resolveTemplates(templateItem, basePath, depth + 1, visitedFiles, loopParams);
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
   * ループ構文の検証
   */
  validateForeachSyntax(data: any, basePath: string): boolean {
    try {
      if (!data || typeof data !== 'object') {
        return false;
      }

      if (!('$foreach' in data)) {
        return true; // $foreach構文でない場合は有効
      }

      const foreachData = data.$foreach;
      
      // $foreach構文の詳細検証
      if (!foreachData || typeof foreachData !== 'object' ||
          !('items' in foreachData) || !('as' in foreachData) || !('template' in foreachData) ||
          typeof foreachData.items !== 'string' || 
          typeof foreachData.as !== 'string' || 
          !Array.isArray(foreachData.template)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ループのパフォーマンス分析
   */
  analyzeLoopComplexity(
    foreachRef: ForeachReference, 
    params: Record<string, any>
  ): {
    itemCount: number;
    templateCount: number;
    estimatedIterations: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    const items = this.parameterInterpolator.getArrayFromParams(foreachRef.items, params);
    const itemCount = items.length;
    const templateCount = foreachRef.template.length;
    const estimatedIterations = itemCount * templateCount;

    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (estimatedIterations > 100) {
      complexity = 'high';
    } else if (estimatedIterations > 20) {
      complexity = 'medium';
    }

    return {
      itemCount,
      templateCount,
      estimatedIterations,
      complexity
    };
  }

  /**
   * ループ処理の統計情報を収集
   */
  collectLoopStats(
    foreachRefs: ForeachReference[], 
    params: Record<string, any>
  ): {
    totalLoops: number;
    totalIterations: number;
    averageItemCount: number;
    maxIterations: number;
    highComplexityLoops: number;
  } {
    let totalIterations = 0;
    let totalItems = 0;
    let maxIterations = 0;
    let highComplexityCount = 0;

    for (const foreachRef of foreachRefs) {
      const analysis = this.analyzeLoopComplexity(foreachRef, params);
      totalIterations += analysis.estimatedIterations;
      totalItems += analysis.itemCount;
      
      if (analysis.estimatedIterations > maxIterations) {
        maxIterations = analysis.estimatedIterations;
      }
      
      if (analysis.complexity === 'high') {
        highComplexityCount++;
      }
    }

    return {
      totalLoops: foreachRefs.length,
      totalIterations,
      averageItemCount: foreachRefs.length > 0 ? totalItems / foreachRefs.length : 0,
      maxIterations,
      highComplexityLoops: highComplexityCount
    };
  }

  /**
   * ループ変数名の競合チェック
   */
  checkVariableConflicts(
    foreachRef: ForeachReference,
    existingParams: Record<string, any>
  ): {
    hasConflict: boolean;
    conflictingVariable?: string;
    suggestion?: string;
  } {
    if (existingParams.hasOwnProperty(foreachRef.as)) {
      return {
        hasConflict: true,
        conflictingVariable: foreachRef.as,
        suggestion: `${foreachRef.as}_item`
      };
    }

    return { hasConflict: false };
  }
} 