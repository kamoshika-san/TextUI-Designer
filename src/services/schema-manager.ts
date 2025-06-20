import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * スキーマ管理サービス
 * YAML/JSONスキーマの設定と管理を担当
 */
export class SchemaManager {
  private context: vscode.ExtensionContext;
  private schemaPath: string;
  private templateSchemaPath: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.schemaPath = path.join(context.extensionPath, 'schemas', 'schema.json');
    this.templateSchemaPath = path.join(context.extensionPath, 'schemas', 'template-schema.json');
  }

  /**
   * スキーマを初期化し、VS Codeの設定に登録
   */
  async initialize(): Promise<void> {
    await this.createTemplateSchema();
    await this.registerSchemas();
  }

  /**
   * テンプレート用スキーマを生成
   */
  private async createTemplateSchema(): Promise<void> {
    if (!fs.existsSync(this.templateSchemaPath)) {
      try {
        const schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
        const templateSchema = {
          ...schema,
          type: 'array',
          items: schema.definitions.component
        };
        fs.writeFileSync(this.templateSchemaPath, JSON.stringify(templateSchema, null, 2), 'utf-8');
      } catch (error) {
        console.error('テンプレートスキーマの作成に失敗しました:', error);
      }
    }
  }

  /**
   * YAML/JSON拡張にスキーマを登録
   */
  private async registerSchemas(): Promise<void> {
    try {
      const schemaUri = vscode.Uri.file(this.schemaPath).toString();
      const templateSchemaUri = vscode.Uri.file(this.templateSchemaPath).toString();

      console.log('[SchemaManager] スキーマ登録を開始');
      console.log('[SchemaManager] スキーマURI:', schemaUri);
      console.log('[SchemaManager] テンプレートスキーマURI:', templateSchemaUri);

      // YAML拡張（redhat.vscode-yaml）向け
      try {
        const yamlConfig = vscode.workspace.getConfiguration('yaml');
        const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
        
        const newSchemas = {
          ...currentSchemas,
          [schemaUri]: ['*.tui.yml', '*.tui.json'],
          [templateSchemaUri]: ['*.template.yml', '*.template.yaml', '*.template.json']
        };
        
        await yamlConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
        console.log('[SchemaManager] YAMLスキーマ登録成功');
      } catch (error) {
        console.warn('[SchemaManager] YAMLスキーマ登録に失敗しました（続行します）:', error);
      }

      // JSON拡張向け
      try {
        const jsonConfig = vscode.workspace.getConfiguration('json');
        const currentSchemas = jsonConfig.get('schemas') as any[] || [];
        
        const schemaContent = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
        const newSchemas = [
          ...currentSchemas,
          {
            fileMatch: ['*.tui.json', '*.template.json'],
            schema: schemaContent
          }
        ];
        
        await jsonConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
        console.log('[SchemaManager] JSONスキーマ登録成功');
      } catch (error) {
        console.warn('[SchemaManager] JSONスキーマ登録に失敗しました（続行します）:', error);
      }

      console.log('[SchemaManager] スキーマ登録完了');
    } catch (error) {
      console.error('[SchemaManager] スキーマ登録中にエラーが発生しました:', error);
      // スキーマ登録に失敗しても拡張は動作するようにする
      throw new Error(`スキーマの初期化に失敗しました: ${error}`);
    }
  }

  /**
   * スキーマファイルのパスを取得
   */
  getSchemaPath(): string {
    return this.schemaPath;
  }

  /**
   * テンプレートスキーマファイルのパスを取得
   */
  getTemplateSchemaPath(): string {
    return this.templateSchemaPath;
  }

  /**
   * スキーマの内容を読み込み
   */
  async loadSchema(): Promise<any> {
    try {
      const content = fs.readFileSync(this.schemaPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`スキーマファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * テンプレートスキーマの内容を読み込み
   */
  async loadTemplateSchema(): Promise<any> {
    try {
      const content = fs.readFileSync(this.templateSchemaPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`テンプレートスキーマファイルの読み込みに失敗しました: ${error}`);
    }
  }
} 