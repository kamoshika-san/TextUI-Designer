import { BaseTemplateProcessor } from './base-processor';
import { TemplateError, TemplateException } from '../template-parser';
import { ParameterInterpolator } from './parameter-interpolator';

/**
 * 条件分岐情報
 */
interface ConditionalReference {
  condition: string;
  template: any[];
}

/**
 * $if構文を処理するクラス
 */
export class ConditionalProcessor extends BaseTemplateProcessor {
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
    // 実際の使用では processConditional メソッドを直接呼び出してもらう
    throw new Error('ConditionalProcessor.process() は直接使用しないでください。processConditional() を使用してください。');
  }

  /**
   * 条件分岐を処理（実際の処理メソッド）
   */
  async processConditional(
    conditionalRef: ConditionalReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>,
    resolveTemplates: (data: any, basePath: string, depth: number, visitedFiles: Set<string>, params: Record<string, any>) => Promise<any>
  ): Promise<any> {
    this.checkDepth(depth, basePath);

    // 条件構文の詳細検証
    if (!conditionalRef || typeof conditionalRef !== 'object' || 
        !('condition' in conditionalRef) || !('template' in conditionalRef) ||
        typeof conditionalRef.condition !== 'string' || 
        !Array.isArray(conditionalRef.template)) {
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }

    // 条件式を評価
    const isConditionTrue = this.parameterInterpolator.evaluateCondition(conditionalRef.condition, params);
    
    if (isConditionTrue) {
      // 条件が真の場合、テンプレートを処理
      const results = [];
      for (const templateItem of conditionalRef.template) {
        const result = await resolveTemplates(templateItem, basePath, depth + 1, visitedFiles, params);
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
   * 条件式の構文を検証
   */
  validateConditionalSyntax(data: any, basePath: string): boolean {
    try {
      if (!data || typeof data !== 'object') {
        return false;
      }

      if (!('$if' in data)) {
        return true; // $if構文でない場合は有効
      }

      const conditionalData = data.$if;
      
      // $if構文の詳細検証
      if (!conditionalData || typeof conditionalData !== 'object' || 
          !('condition' in conditionalData) || !('template' in conditionalData) ||
          typeof conditionalData.condition !== 'string' || 
          !Array.isArray(conditionalData.template)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 条件式のパフォーマンス評価
   */
  analyzeConditionComplexity(condition: string): {
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTime: number;
  } {
    const trimmedCondition = condition.trim();
    
    // 単純な条件
    if (trimmedCondition === 'true' || trimmedCondition === 'false' ||
        /^\d+$/.test(trimmedCondition)) {
      return { complexity: 'simple', estimatedTime: 0.1 };
    }
    
    // $params参照
    if (trimmedCondition.startsWith('$params.')) {
      return { complexity: 'simple', estimatedTime: 0.5 };
    }
    
    // 文字列補間
    if (trimmedCondition.includes('{{') && trimmedCondition.includes('}}')) {
      return { complexity: 'medium', estimatedTime: 1.0 };
    }
    
    // その他の複雑な条件
    return { complexity: 'complex', estimatedTime: 2.0 };
  }

  /**
   * 条件分岐の統計情報を収集
   */
  collectConditionStats(conditions: string[]): {
    totalConditions: number;
    simpleConditions: number;
    parameterConditions: number;
    interpolationConditions: number;
    averageComplexity: number;
  } {
    let simpleCount = 0;
    let parameterCount = 0;
    let interpolationCount = 0;
    let totalComplexity = 0;

    for (const condition of conditions) {
      const analysis = this.analyzeConditionComplexity(condition);
      totalComplexity += analysis.estimatedTime;

      const trimmed = condition.trim();
      if (trimmed === 'true' || trimmed === 'false' || /^\d+$/.test(trimmed)) {
        simpleCount++;
      } else if (trimmed.startsWith('$params.')) {
        parameterCount++;
      } else if (trimmed.includes('{{') && trimmed.includes('}}')) {
        interpolationCount++;
      }
    }

    return {
      totalConditions: conditions.length,
      simpleConditions: simpleCount,
      parameterConditions: parameterCount,
      interpolationConditions: interpolationCount,
      averageComplexity: conditions.length > 0 ? totalComplexity / conditions.length : 0
    };
  }
} 