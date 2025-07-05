import * as fs from 'fs';
import * as path from 'path';
import { SchemaDefinition } from '../../types';

/**
 * テンプレートスキーマ生成を担当するクラス
 */
export class TemplateSchemaCreator {
  
  /**
   * メインスキーマからテンプレートスキーマを生成
   */
  async createTemplateSchema(mainSchemaPath: string, templateSchemaPath: string): Promise<void> {
    try {
      // すでに存在する場合はスキップ
      if (fs.existsSync(templateSchemaPath)) {
        console.log('[TemplateSchemaCreator] テンプレートスキーマは既に存在します:', templateSchemaPath);
        return;
      }
      
      // メインスキーマファイルの存在確認
      if (!fs.existsSync(mainSchemaPath)) {
        throw new Error(`メインスキーマファイルが存在しません: ${mainSchemaPath}`);
      }
      
      // メインスキーマを読み込み
      const mainSchema = await this.readSchema(mainSchemaPath);
      
      // テンプレートスキーマを生成
      const templateSchema = this.generateTemplateSchema(mainSchema);
      
      // テンプレートスキーマを保存
      await this.saveSchema(templateSchemaPath, templateSchema);
      
      console.log('[TemplateSchemaCreator] テンプレートスキーマを生成しました:', templateSchemaPath);
    } catch (error) {
      console.error('[TemplateSchemaCreator] テンプレートスキーマ生成に失敗:', error);
      throw new Error(`テンプレートスキーマの生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * メインスキーマからテンプレートスキーマ構造を生成
   */
  private generateTemplateSchema(mainSchema: SchemaDefinition): SchemaDefinition {
    const templateSchema: SchemaDefinition = {
      ...mainSchema,
      $schema: mainSchema.$schema,
      $id: typeof mainSchema.$id === 'string' ? mainSchema.$id.replace('schema.json', 'template-schema.json') : undefined,
      title: 'TextUI Template Schema',
      description: 'Schema for TextUI template files',
      type: 'array',
      items: mainSchema.definitions?.component || {}
    };
    
    // テンプレート特有のプロパティを追加
    if (templateSchema.definitions) {
      templateSchema.definitions = {
        ...templateSchema.definitions,
        // テンプレートパラメータの定義を追加
        templateParameter: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'パラメータ名'
            },
            type: {
              type: 'string',
              enum: ['string', 'number', 'boolean', 'array', 'object'],
              description: 'パラメータの型'
            },
            default: {
              description: 'デフォルト値'
            },
            required: {
              type: 'boolean',
              description: '必須パラメータかどうか'
            }
          },
          required: ['name', 'type']
        }
      };
    }
    
    return templateSchema;
  }

  /**
   * スキーマファイルを非同期で読み込み
   */
  private async readSchema(schemaPath: string): Promise<SchemaDefinition> {
    return new Promise((resolve, reject) => {
      fs.readFile(schemaPath, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (parseError) {
            reject(parseError);
          }
        }
      });
    });
  }

  /**
   * スキーマファイルを非同期で保存
   */
  private async saveSchema(schemaPath: string, schema: SchemaDefinition): Promise<void> {
    return new Promise((resolve, reject) => {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(schemaPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const content = JSON.stringify(schema, null, 2);
      fs.writeFile(schemaPath, content, 'utf-8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * テンプレートスキーマファイルが最新かどうかをチェック
   */
  async isTemplateSchemaUpToDate(mainSchemaPath: string, templateSchemaPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(templateSchemaPath)) {
        return false;
      }
      
      const mainStat = fs.statSync(mainSchemaPath);
      const templateStat = fs.statSync(templateSchemaPath);
      
      // メインスキーマの方が新しい場合は更新が必要
      return templateStat.mtime >= mainStat.mtime;
    } catch (error) {
      console.warn('[TemplateSchemaCreator] スキーマファイルの更新日時チェックに失敗:', error);
      return false;
    }
  }

  /**
   * 必要に応じてテンプレートスキーマを更新
   */
  async updateTemplateSchemaIfNeeded(mainSchemaPath: string, templateSchemaPath: string): Promise<void> {
    const isUpToDate = await this.isTemplateSchemaUpToDate(mainSchemaPath, templateSchemaPath);
    
    if (!isUpToDate) {
      console.log('[TemplateSchemaCreator] テンプレートスキーマを更新します');
      // 既存のファイルを削除してから再生成
      if (fs.existsSync(templateSchemaPath)) {
        fs.unlinkSync(templateSchemaPath);
      }
      await this.createTemplateSchema(mainSchemaPath, templateSchemaPath);
    } else {
      console.log('[TemplateSchemaCreator] テンプレートスキーマは最新です');
    }
  }

  /**
   * テンプレートスキーマを削除
   */
  async removeTemplateSchema(templateSchemaPath: string): Promise<void> {
    try {
      if (fs.existsSync(templateSchemaPath)) {
        fs.unlinkSync(templateSchemaPath);
        console.log('[TemplateSchemaCreator] テンプレートスキーマを削除しました:', templateSchemaPath);
      }
    } catch (error) {
      console.error('[TemplateSchemaCreator] テンプレートスキーマ削除に失敗:', error);
      throw error;
    }
  }

  /**
   * スキーマの検証（基本的な構造チェック）
   */
  validateSchema(schema: SchemaDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!schema.$schema) {
      errors.push('$schemaフィールドが必要です');
    }
    
    if (!schema.type) {
      errors.push('typeフィールドが必要です');
    }
    
    if (schema.type === 'array' && !schema.items) {
      errors.push('type が array の場合、itemsフィールドが必要です');
    }
    
    if (!schema.definitions || Object.keys(schema.definitions).length === 0) {
      errors.push('definitionsフィールドが必要です');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
} 