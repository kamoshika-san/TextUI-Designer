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
        
        // 既存のTextUI Designer関連のスキーマを完全に削除
        const filteredSchemas = Object.fromEntries(
          Object.entries(currentSchemas).filter(([uri, patterns]) => {
            // URIに基づくフィルタリング
            const isTextUIDesignerSchema = uri.includes('textui-designer') || 
                                         uri.includes('schema.json') || 
                                         uri.includes('template-schema.json');
            
            // パターンに基づくフィルタリング
            const hasTextUIPatterns = patterns.some(pattern => 
              pattern.includes('tui') || pattern.includes('template')
            );
            
            return !isTextUIDesignerSchema && !hasTextUIPatterns;
          })
        );
        
        // 重複チェック
        const existingSchemaUri = Object.keys(filteredSchemas).find(uri => 
          uri === schemaUri || uri.includes('schema.json')
        );
        const existingTemplateSchemaUri = Object.keys(filteredSchemas).find(uri => 
          uri === templateSchemaUri || uri.includes('template-schema.json')
        );
        
        if (existingSchemaUri) {
          console.log('[SchemaManager] 既存のスキーマを削除:', existingSchemaUri);
          delete filteredSchemas[existingSchemaUri];
        }
        
        if (existingTemplateSchemaUri) {
          console.log('[SchemaManager] 既存のテンプレートスキーマを削除:', existingTemplateSchemaUri);
          delete filteredSchemas[existingTemplateSchemaUri];
        }
        
        const newSchemas = {
          ...filteredSchemas,
          [schemaUri]: ['*.tui.yml', '*.tui.yaml'],
          [templateSchemaUri]: ['*.template.yml', '*.template.yaml']
        };
        
        await yamlConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
        console.log('[SchemaManager] YAMLスキーマ登録成功');
        console.log('[SchemaManager] 登録されたスキーマ:', newSchemas);
      } catch (error) {
        console.warn('[SchemaManager] YAMLスキーマ登録に失敗しました（続行します）:', error);
      }

      // JSON拡張向け
      try {
        const jsonConfig = vscode.workspace.getConfiguration('json');
        const currentSchemas = jsonConfig.get('schemas') as any[] || [];
        
        // 既存のTextUI Designer関連のスキーマを完全に削除
        const filteredSchemas = currentSchemas.filter(schema => {
          // fileMatchに基づくフィルタリング
          const hasTextUIMatch = schema.fileMatch?.some((match: string) => 
            match.includes('tui') || match.includes('template')
          );
          
            // schemaオブジェクトに基づくフィルタリング
          const isTextUISchema = schema.schema?.$id?.includes('textui') ||
                                schema.schema?.title?.includes('TextUI');
          
          return !hasTextUIMatch && !isTextUISchema;
        });
        
        const schemaContent = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
        const templateSchemaContent = JSON.parse(fs.readFileSync(this.templateSchemaPath, 'utf-8'));
        
        const newSchemas = [
          ...filteredSchemas,
          {
            fileMatch: ['*.tui.json'],
            schema: schemaContent
          },
          {
            fileMatch: ['*.template.json'],
            schema: templateSchemaContent
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

  /**
   * スキーマをクリーンアップ（拡張非アクティブ化時に呼び出し）
   */
  async cleanup(): Promise<void> {
    try {
      console.log('[SchemaManager] スキーマクリーンアップを開始');

      // YAML拡張からTextUI Designer関連のスキーマを削除
      try {
        const yamlConfig = vscode.workspace.getConfiguration('yaml');
        const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
        
        const filteredSchemas = Object.fromEntries(
          Object.entries(currentSchemas).filter(([uri, patterns]) => {
            // URIに基づくフィルタリング
            const isTextUIDesignerSchema = uri.includes('textui-designer') || 
                                         uri.includes('schema.json') || 
                                         uri.includes('template-schema.json');
            
            // パターンに基づくフィルタリング
            const hasTextUIPatterns = patterns.some(pattern => 
              pattern.includes('tui') || pattern.includes('template')
            );
            
            return !isTextUIDesignerSchema && !hasTextUIPatterns;
          })
        );
        
        await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
        console.log('[SchemaManager] YAMLスキーマクリーンアップ成功');
        console.log('[SchemaManager] 残存スキーマ:', filteredSchemas);
      } catch (error) {
        console.warn('[SchemaManager] YAMLスキーマクリーンアップに失敗しました:', error);
      }

      // JSON拡張からTextUI Designer関連のスキーマを削除
      try {
        const jsonConfig = vscode.workspace.getConfiguration('json');
        const currentSchemas = jsonConfig.get('schemas') as any[] || [];
        
        const filteredSchemas = currentSchemas.filter(schema => {
          // fileMatchに基づくフィルタリング
          const hasTextUIMatch = schema.fileMatch?.some((match: string) => 
            match.includes('tui') || match.includes('template')
          );
          
          // schemaオブジェクトに基づくフィルタリング
          const isTextUISchema = schema.schema?.$id?.includes('textui') ||
                                schema.schema?.title?.includes('TextUI');
          
          return !hasTextUIMatch && !isTextUISchema;
        });
        
        await jsonConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
        console.log('[SchemaManager] JSONスキーマクリーンアップ成功');
        console.log('[SchemaManager] 残存スキーマ数:', filteredSchemas.length);
      } catch (error) {
        console.warn('[SchemaManager] JSONスキーマクリーンアップに失敗しました:', error);
      }

      console.log('[SchemaManager] スキーマクリーンアップ完了');
    } catch (error) {
      console.error('[SchemaManager] スキーマクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * スキーマの再登録（設定変更時などに呼び出し）
   */
  async reinitialize(): Promise<void> {
    console.log('[SchemaManager] スキーマ再初期化を開始');
    await this.cleanup();
    await this.initialize();
    console.log('[SchemaManager] スキーマ再初期化完了');
  }

  /**
   * 現在のスキーマ状態をデバッグ出力
   */
  async debugSchemas(): Promise<void> {
    try {
      console.log('[SchemaManager] 現在のスキーマ状態を確認中...');
      
      // YAMLスキーマの確認
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const yamlSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      console.log('[SchemaManager] YAMLスキーマ:', yamlSchemas);
      
      // JSONスキーマの確認
      const jsonConfig = vscode.workspace.getConfiguration('json');
      const jsonSchemas = jsonConfig.get('schemas') as any[] || [];
      console.log('[SchemaManager] JSONスキーマ数:', jsonSchemas.length);
      jsonSchemas.forEach((schema, index) => {
        console.log(`[SchemaManager] JSONスキーマ[${index}]:`, {
          fileMatch: schema.fileMatch,
          schemaId: schema.schema?.$id,
          schemaTitle: schema.schema?.title
        });
      });
      
      // TextUI Designer関連のスキーマを特定
      const textUISchemas = Object.entries(yamlSchemas).filter(([uri, patterns]) => {
        const isTextUIDesignerSchema = uri.includes('textui-designer') || 
                                     uri.includes('schema.json') || 
                                     uri.includes('template-schema.json');
        const hasTextUIPatterns = patterns.some(pattern => 
          pattern.includes('tui') || pattern.includes('template')
        );
        return isTextUIDesignerSchema || hasTextUIPatterns;
      });
      
      if (textUISchemas.length > 0) {
        console.log('[SchemaManager] 検出されたTextUI Designer関連スキーマ:', textUISchemas);
      } else {
        console.log('[SchemaManager] TextUI Designer関連スキーマは検出されませんでした');
      }
      
    } catch (error) {
      console.error('[SchemaManager] スキーマデバッグ中にエラーが発生しました:', error);
    }
  }
} 