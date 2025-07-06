import { BaseTemplateProcessor } from './base-processor';

/**
 * パラメータ補間処理を担当するクラス
 */
export class ParameterInterpolator extends BaseTemplateProcessor {
  
  async process(
    data: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>
  ): Promise<any> {
    return this.applyParameters(data, params);
  }

  /**
   * パラメータをテンプレートに適用
   */
  applyParameters(templateData: any, params: Record<string, any>): any {
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
   * 文字列内のパラメータプレースホルダーを置換
   */
  interpolateString(str: string, params: Record<string, any>): any {
    try {
      // {{ }} 形式のプレースホルダーを探す
      const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g;
      let result = str;
      let hasReplacement = false;
      let finalValue: any = str;

      // 文字列全体が単一のプレースホルダーかどうかを判定
      const fullMatch = str.match(/^\{\{\s*([^}]+)\s*\}\}$/);
      if (fullMatch) {
        const expression = fullMatch[1].trim();
        hasReplacement = true;
        
        // $params.xxx 形式の変数参照
        if (expression.startsWith('$params.')) {
          const paramPath = expression.substring(8); // '$params.' を除去
          const value = this.getNestedValue(params, paramPath);
          return value !== undefined ? value : str;
        }
        
        // 通常の変数参照（item.name など）
        const value = this.getNestedValue(params, expression);
        return value !== undefined ? value : str;
      }

      // 部分的な置換処理
      result = str.replace(placeholderRegex, (match, expression) => {
        hasReplacement = true;
        const trimmedExpression = expression.trim();
        
        // $params.xxx 形式の変数参照
        if (trimmedExpression.startsWith('$params.')) {
          const paramPath = trimmedExpression.substring(8); // '$params.' を除去
          const value = this.getNestedValue(params, paramPath);
          return value !== undefined ? String(value) : match;
        }
        
        // 通常の変数参照（item.name など）
        const value = this.getNestedValue(params, trimmedExpression);
        return value !== undefined ? String(value) : match;
      });

      return result;
    } catch (error) {
      return str; // エラーの場合は元の文字列を返す
    }
  }

  /**
   * 条件式を評価
   */
  evaluateCondition(condition: string, params: Record<string, any>): boolean {
    try {
      const trimmedCondition = condition.trim();
      // $params.xxx 形式の変数参照
      if (trimmedCondition.startsWith('$params.')) {
        const paramPath = trimmedCondition.substring(8); // '$params.' を除去
        const value = this.getNestedValue(params, paramPath);
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
      // まずFunctionで式評価を試みる
      try {
        const paramKeys = Object.keys(params);
        const paramValues = Object.values(params);
        if (paramKeys.length > 0) {
          console.log('[DEBUG] evaluateCondition:', { trimmedCondition, params });
          // eslint-disable-next-line no-new-func
          const fn = new Function(...paramKeys, 'return (' + trimmedCondition + ')');
          const result = fn(...paramValues);
          console.log('[DEBUG] Function result:', result);
          return Boolean(result);
        }
      } catch (e) {
        console.error('[DEBUG] Function evaluation error:', e);
        // 式評価に失敗した場合は従来通りの評価にフォールバック
      }
      // その他の基本的な条件式
      return this.evaluateBasicCondition(condition);
    } catch (error) {
      return false;
    }
  }

  /**
   * 基本的な条件式を評価
   */
  private evaluateBasicCondition(condition: string): boolean {
    try {
      const trimmedCondition = condition.trim();
      
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
   * パラメータから配列を取得
   */
  getArrayFromParams(itemsPath: string, params: Record<string, any>): any[] {
    try {
      const trimmedPath = itemsPath.trim();
      
      // $params.xxx 形式の変数参照
      if (trimmedPath.startsWith('$params.')) {
        const paramPath = trimmedPath.substring(8); // '$params.' を除去
        const value = this.getNestedValue(params, paramPath);
        
        if (Array.isArray(value)) {
          return value;
        } else if (value === null || value === undefined) {
          return [];
        } else {
          // 配列でない場合は空配列を返す（元の実装では単一要素配列にしていたが、テストに合わせて修正）
          return [];
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
      
      // 直接の配列リテラル（例: [1, 2, 3]）
      // 簡単のため、ここではサポートしない
      return [];
    } catch (error) {
      return [];
    }
  }
} 