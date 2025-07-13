import { SchemaManager } from '../../schema-manager';

export interface SchemaValidationResult {
  valid: boolean;
  errors: any[];
  suggestions: string[];
}

export interface SchemaErrorInfo {
  message: string;
  errors: any[];
  suggestions: string[];
  fileName: string;
}

/**
 * YAMLスキーマバリデーション専用クラス
 * スキーマバリデーションとエラーハンドリングを担当
 */
export class YamlSchemaValidator {
  private schemaManager: SchemaManager;

  constructor(schemaManager: SchemaManager) {
    this.schemaManager = schemaManager;
  }

  /**
   * YAMLスキーマバリデーションを実行
   */
  async validateYamlSchema(yaml: any, yamlContent: string, fileName: string): Promise<void> {
    try {
      if (!this.schemaManager) {
        console.warn('[YamlSchemaValidator] スキーママネージャーが見つかりません');
        return;
      }

      const schema = await this.schemaManager.loadSchema();
      if (!schema) {
        console.warn('[YamlSchemaValidator] スキーマの読み込みに失敗しました');
        return;
      }

      // カスタムバリデーションを実行
      const customValidationResult = this.validateComponentStructure(yaml);
      if (!customValidationResult.valid) {
        console.log('[YamlSchemaValidator] カスタムバリデーションエラー:', customValidationResult.errors);
        throw this.createSchemaError(customValidationResult.errors, yamlContent, fileName);
      }

      console.log('[YamlSchemaValidator] カスタムバリデーション成功');
    } catch (error: any) {
      if (error.name === 'SchemaValidationError') {
        throw error;
      }
      console.error('[YamlSchemaValidator] スキーマバリデーションでエラーが発生しました:', error);
    }
  }

  /**
   * スキーマエラーを作成
   */
  private createSchemaError(errors: any[], yamlContent: string, fileName: string): Error {
    if (errors.length === 0) {
      return new Error('Unknown schema error');
    }

    const primaryError = errors[0];
    const errorMessage = this.formatSchemaErrorMessage(primaryError);
    const suggestions = this.generateSchemaErrorSuggestions(primaryError, errors);
    
    const schemaError = new Error(errorMessage);
    schemaError.name = 'SchemaValidationError';
    (schemaError as any).details = {
      message: errorMessage,
      errors: errors,
      suggestions: suggestions,
      fileName: fileName
    };
    
    return schemaError;
  }

  /**
   * スキーマエラーメッセージをフォーマット
   */
  private formatSchemaErrorMessage(error: any): string {
    const path = error.instancePath || error.dataPath || '';
    const message = error.message || 'Unknown schema error';
    const keyword = error.keyword || '';
    const params = error.params || {};
    
    let formattedMessage = `スキーマエラー`;
    if (path) {
      formattedMessage += ` (${path})`;
    }
    formattedMessage += `: ${message}`;
    
    if (keyword === 'required' && params.missingProperty) {
      formattedMessage += ` - 不足しているプロパティ: ${params.missingProperty}`;
    } else if (keyword === 'type' && params.type) {
      formattedMessage += ` - 期待される型: ${params.type}`;
    } else if (keyword === 'oneOf') {
      formattedMessage += ` - oneOfバリデーション失敗`;
    }
    
    return formattedMessage;
  }

  /**
   * スキーマエラー修正の提案を生成
   */
  private generateSchemaErrorSuggestions(primaryError: any, allErrors: any[]): string[] {
    const suggestions: string[] = [];
    
    if (primaryError.keyword === 'required') {
      const missingProperty = primaryError.params.missingProperty;
      suggestions.push(`必須プロパティ "${missingProperty}" が不足しています。`);
      suggestions.push(`コンポーネントの構造を確認してください。`);
    } else if (primaryError.keyword === 'type') {
      const expectedType = primaryError.params.type;
      suggestions.push(`プロパティの型が正しくありません。期待される型: ${expectedType}`);
    } else if (primaryError.keyword === 'enum') {
      const allowedValues = primaryError.params.allowedValues;
      suggestions.push(`無効な値です。許可される値: ${allowedValues.join(', ')}`);
    } else if (primaryError.keyword === 'oneOf') {
      suggestions.push(`コンポーネントの構造が正しくありません。`);
      suggestions.push(`利用可能なコンポーネント: Text, Input, Button, Form, Checkbox, Radio, Select, Divider, Container, Alert`);
      suggestions.push(`各コンポーネントは適切なプロパティを持つ必要があります。`);
    }
    
    // 追加のエラー情報を提供
    if (allErrors.length > 1) {
      suggestions.push(`他に ${allErrors.length - 1} 個のエラーがあります。詳細を確認してください。`);
    }
    
    return suggestions;
  }

  /**
   * コンポーネント構造をカスタムバリデーション
   */
  private validateComponentStructure(data: any): { valid: boolean; errors: any[] } {
    const errors: any[] = [];

    // ページ構造の検証
    if (data.page) {
      if (!data.page.components || !Array.isArray(data.page.components)) {
        errors.push({
          keyword: 'required',
          params: { missingProperty: 'components' },
          message: 'ページにはcomponents配列が必要です'
        });
      } else {
        // 各コンポーネントの検証
        data.page.components.forEach((component: any, index: number) => {
          const componentErrors = this.validateComponent(component, index);
          errors.push(...componentErrors);
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 個別コンポーネントの検証
   */
  private validateComponent(component: any, index: number): any[] {
    const errors: any[] = [];

    if (!component || typeof component !== 'object') {
      errors.push({
        keyword: 'type',
        params: { type: 'object' },
        message: `コンポーネント[${index}]はオブジェクトである必要があります`
      });
      return errors;
    }

    // 必須プロパティの検証
    if (!component.type) {
      errors.push({
        keyword: 'required',
        params: { missingProperty: 'type' },
        message: `コンポーネント[${index}]にはtypeプロパティが必要です`
      });
    }

    // 有効なコンポーネントタイプの検証
    const validTypes = ['Text', 'Input', 'Button', 'Form', 'Checkbox', 'Radio', 'Select', 'Divider', 'Container', 'Alert'];
    if (component.type && !validTypes.includes(component.type)) {
      errors.push({
        keyword: 'enum',
        params: { allowedValues: validTypes },
        message: `コンポーネント[${index}]のtype "${component.type}" は無効です`
      });
    }

    return errors;
  }
}