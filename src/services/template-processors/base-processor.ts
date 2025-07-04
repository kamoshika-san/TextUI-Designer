import { TemplateError, TemplateException } from '../template-parser';

/**
 * テンプレート処理の基本インターフェース
 */
export interface ITemplateProcessor {
  /**
   * テンプレート処理を実行
   */
  process(
    data: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any>;
}

/**
 * 基本的なテンプレートプロセッサー
 * 共通機能を提供
 */
export abstract class BaseTemplateProcessor implements ITemplateProcessor {
  protected maxDepth: number = 15;

  abstract process(
    data: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any>;

  /**
   * 深度チェック
   */
  protected checkDepth(depth: number, basePath: string): void {
    if (depth > this.maxDepth) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        basePath
      );
    }
  }

  /**
   * ネストした値を取得
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 配列を平坦化
   */
  protected flattenArray(arr: any[]): any[] {
    const result: any[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...this.flattenArray(item));
      } else {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * 結果を配列として処理
   */
  protected processArrayResults(results: any[]): any[] {
    const flattened = this.flattenArray(results);
    return flattened.length === 1 ? flattened : flattened;
  }
} 