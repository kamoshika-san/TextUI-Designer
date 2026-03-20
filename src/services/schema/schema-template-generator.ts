import * as fs from 'fs';
import { Logger } from '../../utils/logger';

const logger = new Logger('SchemaTemplateGenerator');

/**
 * メインの schema.json から、テンプレート用（component 配列）のスキーマ JSON を生成して書き出す。
 * 失敗時は Logger.error のみ（例外は投げない）— 既存 SchemaManager 挙動と同一。
 */
export function writeTemplateSchemaFromMainSchema(mainSchemaPath: string, templateSchemaPath: string): void {
  try {
    const schema = JSON.parse(fs.readFileSync(mainSchemaPath, 'utf-8'));
    const templateSchema = {
      ...schema,
      type: 'array',
      items: schema.definitions.componentArray?.items ?? schema.definitions.component
    };
    fs.writeFileSync(templateSchemaPath, JSON.stringify(templateSchema, null, 2), 'utf-8');
  } catch (error) {
    logger.error('テンプレートスキーマの作成に失敗しました:', error);
  }
}
