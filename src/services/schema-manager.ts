import * as vscode from 'vscode';
import * as fs from 'fs';
import Ajv, { ErrorObject } from 'ajv';
import { 
  ISchemaManager, 
  SchemaDefinition, 
  SchemaValidationResult, 
  SchemaValidationError 
} from '../types';
import { ConfigManager } from '../utils/config-manager';
import {
  buildTextUiJsonSchemas,
  buildTextUiYamlSchemas,
  filterTextUiJsonSchemas,
  filterTextUiYamlSchemas,
  type JsonSchemaAssociation
} from './schema/schema-association';
import { resolveSchemaPaths } from './schema/schema-path-resolver';
import { validateSchemaConsistency } from './schema/schema-consistency-checker';

type SchemaKind = 'main' | 'template' | 'theme';

interface SchemaSlot {
  getPath: () => string;
  cache: SchemaDefinition | null;
  lastLoad: number;
  cacheHitLog: string;
  cacheSetLog: string;
  readErrorPrefix: string;
}

/**
 * スキーマ管理サービス
 * YAML/JSONスキーマの設定と管理を担当
 */
export class SchemaManager implements ISchemaManager {
  private context: vscode.ExtensionContext;
  private schemaPath: string;
  private templateSchemaPath: string;
  private themeSchemaPath: string;
  private readonly schemaSlots: Record<SchemaKind, SchemaSlot>;
  private readonly cacheTTL: number;
  private readonly verboseLogging: boolean;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.verboseLogging = process.env.TEXTUI_SCHEMA_DEBUG === 'true';
    const performanceSettings = ConfigManager.getPerformanceSettings();
    this.cacheTTL = performanceSettings.schemaCacheTTL || 30000;
    
    const resolvedSchemaPaths = resolveSchemaPaths(context);
    this.schemaPath = resolvedSchemaPaths.schemaPath;
    this.templateSchemaPath = resolvedSchemaPaths.templateSchemaPath;
    this.themeSchemaPath = resolvedSchemaPaths.themeSchemaPath;
    this.schemaSlots = {
      main: {
        getPath: () => this.schemaPath,
        cache: null,
        lastLoad: 0,
        cacheHitLog: '[SchemaManager] キャッシュされたスキーマを使用',
        cacheSetLog: '[SchemaManager] スキーマをキャッシュに保存',
        readErrorPrefix: 'スキーマファイルの読み込みに失敗しました'
      },
      template: {
        getPath: () => this.templateSchemaPath,
        cache: null,
        lastLoad: 0,
        cacheHitLog: '[SchemaManager] キャッシュされたテンプレートスキーマを使用',
        cacheSetLog: '[SchemaManager] テンプレートスキーマをキャッシュに保存',
        readErrorPrefix: 'テンプレートスキーマファイルの読み込みに失敗しました'
      },
      theme: {
        getPath: () => this.themeSchemaPath,
        cache: null,
        lastLoad: 0,
        cacheHitLog: '[SchemaManager] キャッシュされたテーマスキーマを使用',
        cacheSetLog: '[SchemaManager] テーマスキーマをキャッシュに保存',
        readErrorPrefix: 'テーマスキーマファイルの読み込みに失敗しました'
      }
    };

    if (!fs.existsSync(this.schemaPath)) {
      console.error('[SchemaManager] スキーマファイルが見つかりません。検索したパス:', resolvedSchemaPaths.searchedPaths);
    } else {
      this.debug('[SchemaManager] スキーマパスを設定:', this.schemaPath);
    }
    
    this.debug('[SchemaManager] 初期化完了');
    this.debug('[SchemaManager] スキーマパス:', this.schemaPath);
    this.debug('[SchemaManager] テンプレートスキーマパス:', this.templateSchemaPath);
    this.debug('[SchemaManager] テーマスキーマパス:', this.themeSchemaPath);
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
    try {
      const schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
      const templateSchema = {
        ...schema,
        type: 'array',
        items: schema.definitions.componentArray?.items ?? schema.definitions.component
      };
      fs.writeFileSync(this.templateSchemaPath, JSON.stringify(templateSchema, null, 2), 'utf-8');
    } catch (error) {
      console.error('テンプレートスキーマの作成に失敗しました:', error);
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

      this.debug('[SchemaManager] スキーマ登録を開始');
      this.debug('[SchemaManager] スキーマURI:', schemaUri);
      this.debug('[SchemaManager] テンプレートスキーマURI:', templateSchemaUri);
      this.debug('[SchemaManager] テーマスキーマURI:', themeSchemaUri);
      this.debug('[SchemaManager] スキーマファイル存在確認:', fs.existsSync(this.schemaPath));
      this.debug('[SchemaManager] テンプレートスキーマファイル存在確認:', fs.existsSync(this.templateSchemaPath));
      this.debug('[SchemaManager] テーマスキーマファイル存在確認:', fs.existsSync(this.themeSchemaPath));

      // YAML拡張（redhat.vscode-yaml）向け
      try {
        const yamlConfig = vscode.workspace.getConfiguration('yaml');
        const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
        
        const filteredSchemas = filterTextUiYamlSchemas(currentSchemas);
        const newSchemas = buildTextUiYamlSchemas(filteredSchemas, schemaUri, templateSchemaUri, themeSchemaUri);
        
        await yamlConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
        this.debug('[SchemaManager] YAMLスキーマ登録成功');
        this.debug('[SchemaManager] 登録されたスキーマ:', newSchemas);
      } catch (error) {
        console.warn('[SchemaManager] YAMLスキーマ登録に失敗しました（続行します）:', error);
      }

      // JSON拡張向け
      try {
        const jsonConfig = vscode.workspace.getConfiguration('json');
        const currentSchemas = (jsonConfig.get('schemas') as JsonSchemaAssociation[] | undefined) || [];
        
        const filteredSchemas = filterTextUiJsonSchemas(currentSchemas);
        
        const schemaContent = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
        const templateSchemaContent = JSON.parse(fs.readFileSync(this.templateSchemaPath, 'utf-8'));
        const themeSchemaContent = JSON.parse(fs.readFileSync(this.themeSchemaPath, 'utf-8'));
        
        const newSchemas = buildTextUiJsonSchemas(
          filteredSchemas,
          schemaContent,
          templateSchemaContent,
          themeSchemaContent
        );
        
        await jsonConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
        this.debug('[SchemaManager] JSONスキーマ登録成功');
      } catch (error) {
        console.warn('[SchemaManager] JSONスキーマ登録に失敗しました（続行します）:', error);
      }

      this.debug('[SchemaManager] スキーマ登録完了');
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
    const schema = this.loadSchemaWithCache('main');
    validateSchemaConsistency(schema);
    return schema;
  }

  /**
   * テンプレートスキーマの内容を読み込み（キャッシュ付き）
   */
  async loadTemplateSchema(): Promise<SchemaDefinition> {
    return this.loadSchemaWithCache('template');
  }

  /**
   * テーマスキーマの内容を読み込み（キャッシュ付き）
   */
  async loadThemeSchema(): Promise<SchemaDefinition> {
    return this.loadSchemaWithCache('theme');
  }

  private loadSchemaWithCache(kind: SchemaKind): SchemaDefinition {
    const slot = this.schemaSlots[kind];
    const now = Date.now();

    if (slot.cache && (now - slot.lastLoad) < this.cacheTTL) {
      this.debug(slot.cacheHitLog);
      return slot.cache;
    }

    try {
      const content = fs.readFileSync(slot.getPath(), 'utf-8');
      const parsedSchema = JSON.parse(content) as SchemaDefinition;
      slot.cache = parsedSchema;
      slot.lastLoad = now;
      this.debug(slot.cacheSetLog);
      return parsedSchema;
    } catch (error) {
      throw new Error(`${slot.readErrorPrefix}: ${error}`);
    }
  }

  /**
   * スキーマをクリーンアップ（拡張非アクティブ化時に呼び出し）
   */
  async cleanup(): Promise<void> {
    this.debug('[SchemaManager] スキーマクリーンアップを開始');
    
    try {
      // YAML拡張の設定をクリーンアップ
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = yamlConfig.get('schemas') as Record<string, string[]> || {};
      
      const filteredSchemas = filterTextUiYamlSchemas(currentSchemas);
      
      await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
      this.debug('[SchemaManager] YAMLスキーマクリーンアップ完了');

      // JSON拡張の設定をクリーンアップ
      const jsonConfig = vscode.workspace.getConfiguration('json');
      const currentJsonSchemas = (jsonConfig.get('schemas') as JsonSchemaAssociation[] | undefined) || [];
      
      const filteredJsonSchemas = filterTextUiJsonSchemas(currentJsonSchemas);
      
      await jsonConfig.update('schemas', filteredJsonSchemas, vscode.ConfigurationTarget.Global);
      this.debug('[SchemaManager] JSONスキーマクリーンアップ完了');
      
    } catch (error) {
      console.error('[SchemaManager] スキーマクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * スキーマの再登録（設定変更時などに呼び出し）
   */
  async reinitialize(): Promise<void> {
    this.debug('[SchemaManager] スキーマ再初期化を開始');
    this.clearCache();
    await this.cleanup();
    await this.initialize();
    this.debug('[SchemaManager] スキーマ再初期化完了');
  }

  /**
   * スキーマのデバッグ情報を出力
   */
  async debugSchemas(): Promise<void> {
    console.log('[SchemaManager] スキーマデバッグ情報:');
    console.log('- スキーマパス:', this.schemaPath);
    console.log('- テンプレートスキーマパス:', this.templateSchemaPath);
    console.log('- テーマスキーマパス:', this.themeSchemaPath);
    console.log('- スキーマキャッシュ:', this.schemaSlots.main.cache ? '有効' : '無効');
    console.log('- テンプレートスキーマキャッシュ:', this.schemaSlots.template.cache ? '有効' : '無効');
    console.log('- テーマスキーマキャッシュ:', this.schemaSlots.theme.cache ? '有効' : '無効');
    console.log('- 最終スキーマ読み込み:', new Date(this.schemaSlots.main.lastLoad).toISOString());
    console.log('- 最終テンプレートスキーマ読み込み:', new Date(this.schemaSlots.template.lastLoad).toISOString());
    console.log('- 最終テーマスキーマ読み込み:', new Date(this.schemaSlots.theme.lastLoad).toISOString());
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    Object.values(this.schemaSlots).forEach(slot => {
      slot.cache = null;
      slot.lastLoad = 0;
    });
    this.debug('[SchemaManager] スキーマキャッシュをクリアしました');
  }

  /**
   * スキーマの検証
   */
  validateSchema(data: unknown, schema: SchemaDefinition): SchemaValidationResult {
    try {
      const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
      const validate = ajv.compile(schema);
      const valid = validate(data);
      const mappedErrors: SchemaValidationError[] | undefined = valid
        ? undefined
        : (validate.errors ?? []).map((error: ErrorObject): SchemaValidationError => {
            const errorWithData = error as ErrorObject & { data?: unknown };
            return {
              keyword: error.keyword,
              dataPath: error.instancePath || '',
              schemaPath: error.schemaPath || '',
              params: (error.params as Record<string, unknown>) || {},
              message: error.message || 'スキーマエラー',
              data: errorWithData.data
            };
          });
      
      return {
        valid,
        errors: mappedErrors
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
      this.debug(`[SchemaManager] スキーマを登録しました: ${filePattern} -> ${schemaPath}`);
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
        Object.entries(currentSchemas).filter(([_uri, patterns]) => 
          !patterns.includes(filePattern)
        )
      );
      
      await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
      this.debug(`[SchemaManager] スキーマを登録解除しました: ${filePattern}`);
    } catch (error: unknown) {
      console.error(`[SchemaManager] スキーマ登録解除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private debug(message: string, ...args: unknown[]): void {
    if (!this.verboseLogging) {
      return;
    }

    console.log(message, ...args);
  }
}
