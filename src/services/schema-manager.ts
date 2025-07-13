import * as vscode from 'vscode';
import { 
  ISchemaManager, 
  SchemaDefinition, 
  SchemaValidationResult, 
  SchemaValidationError 
} from '../types';
import {
  CachedSchemaLoader,
  SchemaPathResolver,
  SchemaRegistrar,
  TemplateSchemaCreator,
  SchemaLoaderConfig,
  SchemaRegistrationConfig
} from './schema-loaders';
import { ErrorHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';

/**
 * スキーマ管理サービスの依存関係インターフェース
 */
export interface ISchemaManagerDependencies {
  templateSchemaCreator?: TemplateSchemaCreator;
  pathResolver?: SchemaPathResolver;
  schemaLoader?: CachedSchemaLoader<SchemaDefinition>;
  templateSchemaLoader?: CachedSchemaLoader<SchemaDefinition>;
  themeSchemaLoader?: CachedSchemaLoader<SchemaDefinition>;
  registrar?: SchemaRegistrar;
  errorHandler: typeof ErrorHandler;
}

/**
 * スキーマ管理サービス
 * 各スキーマローダーを統合してスキーマ管理を提供
 */
export class SchemaManager implements ISchemaManager {
  private context: vscode.ExtensionContext;
  private pathResolver: SchemaPathResolver;
  private schemaLoader: CachedSchemaLoader<SchemaDefinition>;
  private templateSchemaLoader: CachedSchemaLoader<SchemaDefinition>;
  private themeSchemaLoader: CachedSchemaLoader<SchemaDefinition>;
  private registrar: SchemaRegistrar;
  private templateSchemaCreator: TemplateSchemaCreator;
  private errorHandler: typeof ErrorHandler;

  constructor(
    context: vscode.ExtensionContext, 
    loaderConfig?: SchemaLoaderConfig,
    dependencies?: ISchemaManagerDependencies
  ) {
    this.context = context;
    
    // 依存関係を注入またはデフォルトで初期化
    this.pathResolver = dependencies?.pathResolver || new SchemaPathResolver(context);
    this.schemaLoader = dependencies?.schemaLoader || new CachedSchemaLoader<SchemaDefinition>(loaderConfig);
    this.templateSchemaLoader = dependencies?.templateSchemaLoader || new CachedSchemaLoader<SchemaDefinition>(loaderConfig);
    this.themeSchemaLoader = dependencies?.themeSchemaLoader || new CachedSchemaLoader<SchemaDefinition>(loaderConfig);
    this.registrar = dependencies?.registrar || new SchemaRegistrar();
    this.templateSchemaCreator = dependencies?.templateSchemaCreator || new TemplateSchemaCreator();
    this.errorHandler = dependencies?.errorHandler || ErrorHandler;
  }

  /**
   * スキーマを初期化し、VS Codeの設定に登録
   */
  async initialize(): Promise<void> {
    try {
      const paths = this.pathResolver.resolvePaths();
      
      // テンプレートスキーマの生成
      await this.templateSchemaCreator.createTemplateSchema(
        paths.schemaPath,
        paths.templateSchemaPath
      );
      
      // スキーマの登録
      await this.registerSchemas();
      
    } catch (error) {
      this.errorHandler.logError(error, 'SchemaManager: initialize');
      this.errorHandler.showUserFriendlyError(error, 'SchemaManager: initialize');
      throw error; // Re-throw to ensure activation errors propagate to VS Code
    }
  }

  /**
   * YAML/JSON拡張にスキーマを登録
   */
  async registerSchemas(): Promise<void> {
    const paths = this.pathResolver.resolvePaths();
    const uris = this.pathResolver.getSchemaUris();
    
    const config: SchemaRegistrationConfig = {
      schemaUri: uris.schemaUri,
      templateSchemaUri: uris.templateSchemaUri,
      themeSchemaUri: uris.themeSchemaUri,
      schemaPaths: {
        schema: paths.schemaPath,
        templateSchema: paths.templateSchemaPath,
        themeSchema: paths.themeSchemaPath
      }
    };
    
    await this.registrar.registerSchemas(config);
  }

  /**
   * スキーマファイルのパスを取得
   */
  getSchemaPath(): string {
    return this.pathResolver.resolvePaths().schemaPath;
  }

  /**
   * テンプレートスキーマファイルのパスを取得
   */
  getTemplateSchemaPath(): string {
    return this.pathResolver.resolvePaths().templateSchemaPath;
  }

  /**
   * テーマスキーマファイルのパスを取得
   */
  getThemeSchemaPath(): string {
    return this.pathResolver.resolvePaths().themeSchemaPath;
  }

  /**
   * スキーマの内容を読み込み（キャッシュ付き）
   */
  async loadSchema(): Promise<SchemaDefinition> {
    return await this.errorHandler.withErrorHandling(async () => {
      const schemaPath = this.pathResolver.resolvePaths().schemaPath;
      return await this.schemaLoader.load(schemaPath);
    }, {
      errorMessage: 'SchemaManager: loadSchema',
      logLevel: 'warn'
    });
  }

  /**
   * テンプレートスキーマの内容を読み込み（キャッシュ付き）
   */
  async loadTemplateSchema(): Promise<SchemaDefinition> {
    return await this.errorHandler.withErrorHandling(async () => {
      const templateSchemaPath = this.pathResolver.resolvePaths().templateSchemaPath;
      return await this.templateSchemaLoader.load(templateSchemaPath);
    }, {
      errorMessage: 'SchemaManager: loadTemplateSchema',
      logLevel: 'warn'
    });
  }

  /**
   * テーマスキーマの内容を読み込み（キャッシュ付き）
   */
  async loadThemeSchema(): Promise<SchemaDefinition> {
    return await this.errorHandler.withErrorHandling(async () => {
      const themeSchemaPath = this.pathResolver.resolvePaths().themeSchemaPath;
      return await this.themeSchemaLoader.load(themeSchemaPath);
    }, {
      errorMessage: 'SchemaManager: loadThemeSchema',
      logLevel: 'warn'
    });
  }

  /**
   * スキーマをクリーンアップ（拡張非アクティブ化時に呼び出し）
   */
  async cleanup(): Promise<void> {
    
    try {
      await this.registrar.cleanupSchemas();
    } catch (error) {
      logger.error('スキーマクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * スキーマの再登録（設定変更時などに呼び出し）
   */
  async reinitialize(): Promise<void> {
    
    await this.errorHandler.withErrorHandling(async () => {
      this.clearCache();
      await this.initialize();
    }, 'SchemaManager: reinitialize');
    
  }

  /**
   * スキーマのデバッグ情報を出力（開発環境でのみ有効）
   */
  async debugSchemas(): Promise<void> {
    if (!logger.isDevMode()) {
      logger.warn('デバッグ機能は開発環境でのみ利用可能です');
      return;
    }
    
    // パス情報
    this.pathResolver.debugPaths();
    
    // キャッシュ統計
    logger.schema('メインスキーマキャッシュ:', this.schemaLoader.getCacheStats());
    logger.schema('テンプレートスキーマキャッシュ:', this.templateSchemaLoader.getCacheStats());
    logger.schema('テーマスキーマキャッシュ:', this.themeSchemaLoader.getCacheStats());
    
    // パス検証
    const validation = this.pathResolver.validatePaths();
    logger.schema('パス検証結果:', validation.valid ? '正常' : '異常');
    if (!validation.valid) {
      logger.schema('見つからないファイル:', validation.missing);
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.schemaLoader.clearCache();
    this.templateSchemaLoader.clearCache();
    this.themeSchemaLoader.clearCache();
    this.pathResolver.clearCache();
    logger.debug('スキーマキャッシュをクリアしました');
  }

  /**
   * スキーマキャッシュの状態を取得（テスト用）
   */
  get schemaCache(): any {
    return null; // リファクタリング後は各ローダーでキャッシュを管理
  }

  /**
   * スキーマパスプロパティ（テスト用）
   */
  get schemaPath(): string {
    return this.pathResolver.resolvePaths().schemaPath;
  }

  set schemaPath(value: string) {
    // テスト用のセッター - 実際の使用では推奨されない
    this.pathResolver.clearCache();
    (this.pathResolver as any).resolvedPaths = {
      schemaPath: value,
      templateSchemaPath: value.replace('schema.json', 'template-schema.json'),
      themeSchemaPath: value.replace('schema.json', 'theme-schema.json')
    };
  }

  /**
   * テンプレートスキーマパスプロパティ（テスト用）
   */
  get templateSchemaPath(): string {
    return this.pathResolver.resolvePaths().templateSchemaPath;
  }

  set templateSchemaPath(value: string) {
    // テスト用のセッター - 実際の使用では推奨されない
    const paths = this.pathResolver.resolvePaths();
    this.pathResolver.clearCache();
    (this.pathResolver as any).resolvedPaths = {
      schemaPath: paths.schemaPath,
      templateSchemaPath: value,
      themeSchemaPath: paths.themeSchemaPath
    };
  }

  /**
   * テーマスキーマパスプロパティ（テスト用）
   */
  get themeSchemaPath(): string {
    return this.pathResolver.resolvePaths().themeSchemaPath;
  }

  set themeSchemaPath(value: string) {
    // テスト用のセッター - 実際の使用では推奨されない
    const paths = this.pathResolver.resolvePaths();
    this.pathResolver.clearCache();
    (this.pathResolver as any).resolvedPaths = {
      schemaPath: paths.schemaPath,
      templateSchemaPath: paths.templateSchemaPath,
      themeSchemaPath: value
    };
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
    await this.registrar.registerSingleSchema(filePattern, schemaPath);
  }

  /**
   * スキーマの登録解除
   */
  async unregisterSchema(filePattern: string): Promise<void> {
    await this.registrar.unregisterSingleSchema(filePattern);
  }

  /**
   * テンプレートスキーマの更新確認と再生成
   */
  async updateTemplateSchemaIfNeeded(): Promise<void> {
    const paths = this.pathResolver.resolvePaths();
    await this.templateSchemaCreator.updateTemplateSchemaIfNeeded(
      paths.schemaPath,
      paths.templateSchemaPath
    );
  }

  /**
   * テンプレートスキーマを作成（テスト用）
   */
  async createTemplateSchema(): Promise<void> {
    const paths = this.pathResolver.resolvePaths();
    await this.templateSchemaCreator.createTemplateSchema(
      paths.schemaPath,
      paths.templateSchemaPath
    );
  }

  /**
   * キャッシュクリーンアップ（定期実行用）
   */
  performMaintenance(): void {
    this.schemaLoader.cleanupExpiredCache();
    this.templateSchemaLoader.cleanupExpiredCache();
    this.themeSchemaLoader.cleanupExpiredCache();
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.schemaLoader.dispose();
    this.templateSchemaLoader.dispose();
    this.themeSchemaLoader.dispose();
  }
} 