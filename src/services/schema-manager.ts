import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
  ISchemaManager, 
  SchemaDefinition, 
  SchemaValidationResult, 
  SchemaValidationError 
} from '../types';

/**
 * スキーマ管理サービス
 * YAML/JSONスキーマの設定と管理を担当
 */
export class SchemaManager implements ISchemaManager {
  private context: vscode.ExtensionContext;
  private schemaPath: string;
  private templateSchemaPath: string;
  private themeSchemaPath: string;
  private schemaCache: SchemaDefinition | null = null;
  private templateSchemaCache: SchemaDefinition | null = null;
  private themeSchemaCache: SchemaDefinition | null = null;
  private lastSchemaLoad: number = 0;
  private lastTemplateSchemaLoad: number = 0;
  private lastThemeSchemaLoad: number = 0;
  private readonly CACHE_TTL = 30000; // 30秒

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // デバッグモードでのスキーマファイルパス解決を改善
    const possiblePaths = [
      path.join(context.extensionPath, 'schemas', 'schema.json'),
      path.join(__dirname, '..', '..', 'schemas', 'schema.json'),
      path.join(process.cwd(), 'schemas', 'schema.json')
    ];
    
    // 最初に存在するパスを使用
    let foundSchemaPath = '';
    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(schemaPath)) {
        foundSchemaPath = schemaPath;
        console.log('[SchemaManager] スキーマパスを設定:', foundSchemaPath);
        break;
      }
    }
    
    if (!foundSchemaPath) {
      console.error('[SchemaManager] スキーマファイルが見つかりません。検索したパス:', possiblePaths);
      // フォールバックとしてデフォルトパスを使用
      this.schemaPath = path.join(context.extensionPath, 'schemas', 'schema.json');
    } else {
      this.schemaPath = foundSchemaPath;
    }
    
    this.templateSchemaPath = path.join(path.dirname(this.schemaPath), 'template-schema.json');
    this.themeSchemaPath = path.join(path.dirname(this.schemaPath), 'theme-schema.json');
    
    console.log('[SchemaManager] 初期化完了');
    console.log('[SchemaManager] スキーマパス:', this.schemaPath);
    console.log('[SchemaManager] テンプレートスキーマパス:', this.templateSchemaPath);
    console.log('[SchemaManager] テーマスキーマパス:', this.themeSchemaPath);
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
      // スキーマファイルの存在確認
      if (!fs.existsSync(this.schemaPath)) {
        throw new Error(`スキーマファイルが存在しません: ${this.schemaPath}`);
      }
      
      if (!fs.existsSync(this.templateSchemaPath)) {
        console.warn('[SchemaManager] テンプレートスキーマファイルが存在しません。作成を試行します。');
        await this.createTemplateSchema();
      }
      
      const schemaUri = vscode.Uri.file(this.schemaPath).toString();
      const templateSchemaUri = vscode.Uri.file(this.templateSchemaPath).toString();
      const themeSchemaUri = vscode.Uri.file(this.themeSchemaPath).toString();

      console.log('[SchemaManager] スキーマ登録を開始');
      console.log('[SchemaManager] スキーマURI:', schemaUri);
      console.log('[SchemaManager] テンプレートスキーマURI:', templateSchemaUri);
      console.log('[SchemaManager] テーマスキーマURI:', themeSchemaUri);
      console.log('[SchemaManager] スキーマファイル存在確認:', fs.existsSync(this.schemaPath));
      console.log('[SchemaManager] テンプレートスキーマファイル存在確認:', fs.existsSync(this.templateSchemaPath));
      console.log('[SchemaManager] テーマスキーマファイル存在確認:', fs.existsSync(this.themeSchemaPath));

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
          [templateSchemaUri]: ['*.template.yml', '*.template.yaml'],
          [themeSchemaUri]: ['*-theme.yml', '*-theme.yaml', '*_theme.yml', '*_theme.yaml', 'textui-theme.yml', 'textui-theme.yaml']
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
        const themeSchemaContent = JSON.parse(fs.readFileSync(this.themeSchemaPath, 'utf-8'));
        
        const newSchemas = [
          ...filteredSchemas,
          {
            fileMatch: ['*.tui.json'],
            schema: schemaContent
          },
          {
            fileMatch: ['*.template.json'],
            schema: templateSchemaContent
          },
          {
            fileMatch: ['*-theme.json', '*_theme.json', 'textui-theme.json'],
            schema: themeSchemaContent
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
   * テーマスキーマファイルのパスを取得
   */
  getThemeSchemaPath(): string {
    return this.themeSchemaPath;
  }

  /**
   * スキーマの内容を読み込み（キャッシュ付き）
   */
  async loadSchema(): Promise<SchemaDefinition> {
    const now = Date.now();
    
    // キャッシュチェック
    if (this.schemaCache && (now - this.lastSchemaLoad) < this.CACHE_TTL) {
      console.log('[SchemaManager] キャッシュされたスキーマを使用');
      return this.schemaCache;
    }

    try {
      const content = fs.readFileSync(this.schemaPath, 'utf-8');
      const parsedSchema = JSON.parse(content) as SchemaDefinition;
      this.schemaCache = parsedSchema;
      this.lastSchemaLoad = now;
      console.log('[SchemaManager] スキーマをキャッシュに保存');
      return parsedSchema;
    } catch (error) {
      throw new Error(`スキーマファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * テンプレートスキーマの内容を読み込み（キャッシュ付き）
   */
  async loadTemplateSchema(): Promise<SchemaDefinition> {
    const now = Date.now();
    
    // キャッシュチェック
    if (this.templateSchemaCache && (now - this.lastTemplateSchemaLoad) < this.CACHE_TTL) {
      console.log('[SchemaManager] キャッシュされたテンプレートスキーマを使用');
      return this.templateSchemaCache;
    }

    try {
      const content = fs.readFileSync(this.templateSchemaPath, 'utf-8');
      const parsedSchema = JSON.parse(content) as SchemaDefinition;
      this.templateSchemaCache = parsedSchema;
      this.lastTemplateSchemaLoad = now;
      console.log('[SchemaManager] テンプレートスキーマをキャッシュに保存');
      return parsedSchema;
    } catch (error) {
      throw new Error(`テンプレートスキーマファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * テーマスキーマの内容を読み込み（キャッシュ付き）
   */
  async loadThemeSchema(): Promise<SchemaDefinition> {
    const now = Date.now();
    
    // キャッシュチェック
    if (this.themeSchemaCache && (now - this.lastThemeSchemaLoad) < this.CACHE_TTL) {
      console.log('[SchemaManager] キャッシュされたテーマスキーマを使用');
      return this.themeSchemaCache;
    }

    try {
      const content = fs.readFileSync(this.themeSchemaPath, 'utf-8');
      const parsedSchema = JSON.parse(content) as SchemaDefinition;
      this.themeSchemaCache = parsedSchema;
      this.lastThemeSchemaLoad = now;
      console.log('[SchemaManager] テーマスキーマをキャッシュに保存');
      return parsedSchema;
    } catch (error) {
      throw new Error(`テーマスキーマファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * スキーマをクリーンアップ（拡張非アクティブ化時に呼び出し）
   */
  async cleanup(): Promise<void> {
    console.log('[SchemaManager] スキーマクリーンアップを開始');
    
    try {
      // YAML拡張の設定をクリーンアップ
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      
      const filteredSchemas = Object.fromEntries(
        Object.entries(currentSchemas).filter(([uri, patterns]) => {
          const isTextUIDesignerSchema = uri.includes('textui-designer') || 
                                       uri.includes('schema.json') || 
                                       uri.includes('template-schema.json') ||
                                       uri.includes('theme-schema.json');
          
          const hasTextUIPatterns = patterns.some(pattern => 
            pattern.includes('tui') || pattern.includes('template') || pattern.includes('theme')
          );
          
          return !isTextUIDesignerSchema && !hasTextUIPatterns;
        })
      );
      
      await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
      console.log('[SchemaManager] YAMLスキーマクリーンアップ完了');

      // JSON拡張の設定をクリーンアップ
      const jsonConfig = vscode.workspace.getConfiguration('json');
      const currentJsonSchemas = jsonConfig.get('schemas') as any[] || [];
      
      const filteredJsonSchemas = currentJsonSchemas.filter(schema => {
        const hasTextUIMatch = schema.fileMatch?.some((match: string) => 
          match.includes('tui') || match.includes('template') || match.includes('theme')
        );
        
        const isTextUISchema = schema.schema?.$id?.includes('textui') ||
                              schema.schema?.title?.includes('TextUI');
        
        return !hasTextUIMatch && !isTextUISchema;
      });
      
      await jsonConfig.update('schemas', filteredJsonSchemas, vscode.ConfigurationTarget.Global);
      console.log('[SchemaManager] JSONスキーマクリーンアップ完了');
      
    } catch (error) {
      console.error('[SchemaManager] スキーマクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * スキーマの再登録（設定変更時などに呼び出し）
   */
  async reinitialize(): Promise<void> {
    console.log('[SchemaManager] スキーマ再初期化を開始');
    this.clearCache();
    await this.cleanup();
    await this.initialize();
    console.log('[SchemaManager] スキーマ再初期化完了');
  }

  /**
   * スキーマのデバッグ情報を出力
   */
  async debugSchemas(): Promise<void> {
    console.log('[SchemaManager] スキーマデバッグ情報:');
    console.log('- スキーマパス:', this.schemaPath);
    console.log('- テンプレートスキーマパス:', this.templateSchemaPath);
    console.log('- テーマスキーマパス:', this.themeSchemaPath);
    console.log('- スキーマキャッシュ:', this.schemaCache ? '有効' : '無効');
    console.log('- テンプレートスキーマキャッシュ:', this.templateSchemaCache ? '有効' : '無効');
    console.log('- テーマスキーマキャッシュ:', this.themeSchemaCache ? '有効' : '無効');
    console.log('- 最終スキーマ読み込み:', new Date(this.lastSchemaLoad).toISOString());
    console.log('- 最終テンプレートスキーマ読み込み:', new Date(this.lastTemplateSchemaLoad).toISOString());
    console.log('- 最終テーマスキーマ読み込み:', new Date(this.lastThemeSchemaLoad).toISOString());
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.schemaCache = null;
    this.templateSchemaCache = null;
    this.themeSchemaCache = null;
    this.lastSchemaLoad = 0;
    this.lastTemplateSchemaLoad = 0;
    this.lastThemeSchemaLoad = 0;
    console.log('[SchemaManager] スキーマキャッシュをクリアしました');
  }

  /**
   * スキーマの検証
   */
  validateSchema(data: unknown, schema: SchemaDefinition): SchemaValidationResult {
    try {
      const Ajv = require('ajv');
      const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
      const validate = ajv.compile(schema);
      const valid = validate(data);
      
      return {
        valid,
        errors: valid ? undefined : validate.errors?.map((error: any) => ({
          keyword: error.keyword,
          dataPath: error.instancePath || '',
          schemaPath: error.schemaPath || '',
          params: error.params || {},
          message: error.message || 'スキーマエラー',
          data: error.data
        })) || []
      };
    } catch (error: unknown) {
      return {
        valid: false,
        errors: [{
          keyword: 'validation_error',
          dataPath: '',
          schemaPath: '',
          params: {},
          message: `スキーマ検証中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
          data: data
        }]
      };
    }
  }

  /**
   * スキーマの登録
   */
  async registerSchema(filePattern: string, schemaPath: string): Promise<void> {
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      
      const schemaUri = vscode.Uri.file(schemaPath).toString();
      currentSchemas[schemaUri] = [filePattern];
      
      await yamlConfig.update('schemas', currentSchemas, vscode.ConfigurationTarget.Global);
      console.log(`[SchemaManager] スキーマを登録しました: ${filePattern} -> ${schemaPath}`);
    } catch (error: unknown) {
      console.error(`[SchemaManager] スキーマ登録に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * スキーマの登録解除
   */
  async unregisterSchema(filePattern: string): Promise<void> {
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
      console.log(`[SchemaManager] スキーマを登録解除しました: ${filePattern}`);
    } catch (error: unknown) {
      console.error(`[SchemaManager] スキーマ登録解除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
} 