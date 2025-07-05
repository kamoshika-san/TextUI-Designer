import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * スキーマ登録設定
 */
export interface SchemaRegistrationConfig {
  /** メインスキーマのURI */
  schemaUri: string;
  /** テンプレートスキーマのURI */
  templateSchemaUri: string;
  /** テーマスキーマのURI */
  themeSchemaUri: string;
  /** 対応するファイルパス（読み込み用） */
  schemaPaths: {
    schema: string;
    templateSchema: string;
    themeSchema: string;
  };
}

/**
 * VS Code拡張へのスキーマ登録処理を担当するクラス
 */
export class SchemaRegistrar {
  
  /**
   * YAML/JSON拡張にスキーマを登録
   */
  async registerSchemas(config: SchemaRegistrationConfig): Promise<void> {
    try {
      // スキーマファイルの存在確認
      this.validateSchemaFiles(config);
      
      // YAML拡張への登録
      await this.registerYamlSchemas(config);
      
      // JSON拡張への登録
      await this.registerJsonSchemas(config);
      
      console.log('[SchemaRegistrar] スキーマ登録完了');
    } catch (error) {
      console.error('[SchemaRegistrar] スキーマ登録中にエラーが発生しました:', error);
      throw new Error(`スキーマの登録に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * YAML拡張（redhat.vscode-yaml）向けのスキーマ登録
   */
  private async registerYamlSchemas(config: SchemaRegistrationConfig): Promise<void> {
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      
      // 既存のTextUI Designer関連のスキーマを除去
      const filteredSchemas = this.removeExistingTextUISchemas(currentSchemas);
      
      // 新しいスキーマを追加
      const newSchemas = {
        ...filteredSchemas,
        [config.schemaUri]: ['*.tui.yml', '*.tui.yaml'],
        [config.templateSchemaUri]: ['*.template.yml', '*.template.yaml'],
        [config.themeSchemaUri]: [
          '*-theme.yml', '*-theme.yaml', 
          '*_theme.yml', '*_theme.yaml', 
          'textui-theme.yml', 'textui-theme.yaml'
        ]
      };
      
      await yamlConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
      console.log('[SchemaRegistrar] YAMLスキーマ登録成功');
      console.log('[SchemaRegistrar] 登録されたスキーマ:', newSchemas);
    } catch (error) {
      console.warn('[SchemaRegistrar] YAMLスキーマ登録に失敗しました（続行します）:', error);
    }
  }

  /**
   * JSON拡張向けのスキーマ登録
   */
  private async registerJsonSchemas(config: SchemaRegistrationConfig): Promise<void> {
    try {
      const jsonConfig = vscode.workspace.getConfiguration('json');
      const currentSchemas = jsonConfig.get('schemas') as any[] || [];
      
      // 既存のTextUI Designer関連のスキーマを除去
      const filteredSchemas = this.removeExistingJsonSchemas(currentSchemas);
      
      // スキーマファイルの内容を読み込み
      const schemaContents = await this.loadSchemaContents(config.schemaPaths);
      
      // 新しいスキーマを追加
      const newSchemas = [
        ...filteredSchemas,
        {
          fileMatch: ['*.tui.json'],
          schema: schemaContents.schema
        },
        {
          fileMatch: ['*.template.json'],
          schema: schemaContents.templateSchema
        },
        {
          fileMatch: ['*-theme.json', '*_theme.json', 'textui-theme.json'],
          schema: schemaContents.themeSchema
        }
      ];
      
      await jsonConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
      console.log('[SchemaRegistrar] JSONスキーマ登録成功');
    } catch (error) {
      console.warn('[SchemaRegistrar] JSONスキーマ登録に失敗しました（続行します）:', error);
    }
  }

  /**
   * 既存のYAMLスキーマからTextUI Designer関連を除去
   */
  private removeExistingTextUISchemas(schemas: Record<string, string[]>): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(schemas).filter(([uri, patterns]) => {
        // URIに基づくフィルタリング
        const isTextUIDesignerSchema = uri.includes('textui-designer') || 
                                     uri.includes('schema.json') || 
                                     uri.includes('template-schema.json') ||
                                     uri.includes('theme-schema.json');
        
        // パターンに基づくフィルタリング
        const hasTextUIPatterns = patterns.some(pattern => 
          pattern.includes('tui') || pattern.includes('template') || pattern.includes('theme')
        );
        
        return !isTextUIDesignerSchema && !hasTextUIPatterns;
      })
    );
  }

  /**
   * 既存のJSONスキーマからTextUI Designer関連を除去
   */
  private removeExistingJsonSchemas(schemas: any[]): any[] {
    return schemas.filter(schema => {
      // fileMatchに基づくフィルタリング
      const hasTextUIMatch = schema.fileMatch?.some((match: string) => 
        match.includes('tui') || match.includes('template') || match.includes('theme')
      );
      
      // schemaオブジェクトに基づくフィルタリング
      const isTextUISchema = schema.schema?.$id?.includes('textui') ||
                            schema.schema?.title?.includes('TextUI');
      
      return !hasTextUIMatch && !isTextUISchema;
    });
  }

  /**
   * スキーマファイルの存在確認
   */
  private validateSchemaFiles(config: SchemaRegistrationConfig): void {
    const { schema, templateSchema, themeSchema } = config.schemaPaths;
    
    if (!fs.existsSync(schema)) {
      throw new Error(`スキーマファイルが存在しません: ${schema}`);
    }
    
    if (!fs.existsSync(templateSchema)) {
      console.warn('[SchemaRegistrar] テンプレートスキーマファイルが存在しません:', templateSchema);
    }
    
    if (!fs.existsSync(themeSchema)) {
      console.warn('[SchemaRegistrar] テーマスキーマファイルが存在しません:', themeSchema);
    }
  }

  /**
   * スキーマファイルの内容を読み込み
   */
  private async loadSchemaContents(paths: { schema: string; templateSchema: string; themeSchema: string }): Promise<{
    schema: any;
    templateSchema: any;
    themeSchema: any;
  }> {
    try {
      const [schemaContent, templateSchemaContent, themeSchemaContent] = await Promise.all([
        this.readJsonFile(paths.schema),
        this.readJsonFile(paths.templateSchema),
        this.readJsonFile(paths.themeSchema)
      ]);
      
      return {
        schema: schemaContent,
        templateSchema: templateSchemaContent,
        themeSchema: themeSchemaContent
      };
    } catch (error) {
      throw new Error(`スキーマファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * JSONファイルを非同期で読み込み
   */
  private async readJsonFile(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
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
   * スキーマのクリーンアップ（拡張非アクティブ化時に呼び出し）
   */
  async cleanupSchemas(): Promise<void> {
    console.log('[SchemaRegistrar] スキーマクリーンアップを開始');
    
    try {
      // YAML拡張の設定をクリーンアップ
      await this.cleanupYamlSchemas();
      
      // JSON拡張の設定をクリーンアップ
      await this.cleanupJsonSchemas();
      
      console.log('[SchemaRegistrar] スキーマクリーンアップ完了');
    } catch (error) {
      console.error('[SchemaRegistrar] スキーマクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * YAMLスキーマのクリーンアップ
   */
  private async cleanupYamlSchemas(): Promise<void> {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');
    const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
    
    const filteredSchemas = this.removeExistingTextUISchemas(currentSchemas);
    
    await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
    console.log('[SchemaRegistrar] YAMLスキーマクリーンアップ完了');
  }

  /**
   * JSONスキーマのクリーンアップ
   */
  private async cleanupJsonSchemas(): Promise<void> {
    const jsonConfig = vscode.workspace.getConfiguration('json');
    const currentJsonSchemas = jsonConfig.get('schemas') as any[] || [];
    
    const filteredJsonSchemas = this.removeExistingJsonSchemas(currentJsonSchemas);
    
    await jsonConfig.update('schemas', filteredJsonSchemas, vscode.ConfigurationTarget.Global);
    console.log('[SchemaRegistrar] JSONスキーマクリーンアップ完了');
  }

  /**
   * 個別スキーマの登録
   */
  async registerSingleSchema(filePattern: string, schemaPath: string): Promise<void> {
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      
      const schemaUri = vscode.Uri.file(schemaPath).toString();
      currentSchemas[schemaUri] = [filePattern];
      
      await yamlConfig.update('schemas', currentSchemas, vscode.ConfigurationTarget.Global);
      console.log(`[SchemaRegistrar] 個別スキーマを登録: ${filePattern} -> ${schemaPath}`);
    } catch (error) {
      console.error(`[SchemaRegistrar] 個別スキーマ登録に失敗: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 個別スキーマの登録解除
   */
  async unregisterSingleSchema(filePattern: string): Promise<void> {
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      
      // 指定されたパターンに一致するスキーマを削除
      const filteredSchemas = Object.fromEntries(
        Object.entries(currentSchemas).filter(([uri, patterns]) => 
          !patterns.includes(filePattern)
        )
      );
      
      await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
      console.log(`[SchemaRegistrar] 個別スキーマを登録解除: ${filePattern}`);
    } catch (error) {
      console.error(`[SchemaRegistrar] 個別スキーマ登録解除に失敗: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
} 