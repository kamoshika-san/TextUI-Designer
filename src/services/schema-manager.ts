import * as vscode from 'vscode';
import * as fs from 'fs';
import {
  ISchemaManager,
  SchemaDefinition,
  SchemaValidationResult
} from '../types';
import { ConfigManager } from '../utils/config-manager';
import { resolveSchemaPaths } from './schema/schema-path-resolver';
import { validateSchemaConsistency } from './schema/schema-consistency-checker';
import { SchemaCacheStore } from './schema/schema-cache-store';
import { validateDataAgainstSchema } from './schema/schema-validator';
import { writeTemplateSchemaFromMainSchema } from './schema/schema-template-generator';
import {
  cleanupTextUiSchemasInWorkspace,
  registerTextUiSchemasInWorkspace,
  registerYamlSchemaForPattern,
  unregisterYamlSchemaByFilePattern
} from './schema/schema-workspace-registrar';

/**
 * スキーマ管理サービス
 * YAML/JSONスキーマの設定と管理を担当
 */
export class SchemaManager implements ISchemaManager {
  private context: vscode.ExtensionContext;
  private schemaPath: string;
  private templateSchemaPath: string;
  private themeSchemaPath: string;
  private readonly cacheStore: SchemaCacheStore;
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
    this.cacheStore = new SchemaCacheStore({
      main: () => this.schemaPath,
      template: () => this.templateSchemaPath,
      theme: () => this.themeSchemaPath
    });

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

  async initialize(): Promise<void> {
    await this.createTemplateSchema();
    await this.registerSchemas();
  }

  async createTemplateSchema(): Promise<void> {
    writeTemplateSchemaFromMainSchema(this.schemaPath, this.templateSchemaPath);
  }

  async registerSchemas(): Promise<void> {
    try {
      if (!fs.existsSync(this.schemaPath)) {
        throw new Error(`スキーマファイルが存在しません: ${this.schemaPath}`);
      }
      if (!fs.existsSync(this.templateSchemaPath)) {
        console.warn('[SchemaManager] テンプレートスキーマファイルが存在しません。作成を試行します。');
        await this.createTemplateSchema();
      }

      await registerTextUiSchemasInWorkspace(
        this.schemaPath,
        this.templateSchemaPath,
        this.themeSchemaPath,
        (message, ...args) => this.debug(message, ...args)
      );
    } catch (error) {
      console.error('[SchemaManager] スキーマ登録中にエラーが発生しました:', error);
      throw new Error(`スキーマの初期化に失敗しました: ${error}`);
    }
  }

  getSchemaPath(): string {
    return this.schemaPath;
  }

  getTemplateSchemaPath(): string {
    return this.templateSchemaPath;
  }

  getThemeSchemaPath(): string {
    return this.themeSchemaPath;
  }

  async loadSchema(): Promise<SchemaDefinition> {
    const schema = this.cacheStore.load('main', this.cacheTTL, (message, ...args) => this.debug(message, ...args));
    validateSchemaConsistency(schema);
    return schema;
  }

  async loadTemplateSchema(): Promise<SchemaDefinition> {
    return this.cacheStore.load('template', this.cacheTTL, (message, ...args) => this.debug(message, ...args));
  }

  async loadThemeSchema(): Promise<SchemaDefinition> {
    return this.cacheStore.load('theme', this.cacheTTL, (message, ...args) => this.debug(message, ...args));
  }

  async cleanup(): Promise<void> {
    this.debug('[SchemaManager] スキーマクリーンアップを開始');
    await cleanupTextUiSchemasInWorkspace((message, ...args) => this.debug(message, ...args));
  }

  async reinitialize(): Promise<void> {
    this.debug('[SchemaManager] スキーマ再初期化を開始');
    this.clearCache();
    await this.cleanup();
    await this.initialize();
    this.debug('[SchemaManager] スキーマ再初期化完了');
  }

  async debugSchemas(): Promise<void> {
    const snapshot = this.cacheStore.getDebugSnapshot();
    console.log('[SchemaManager] スキーマデバッグ情報:');
    console.log('- スキーマパス:', this.schemaPath);
    console.log('- テンプレートスキーマパス:', this.templateSchemaPath);
    console.log('- テーマスキーマパス:', this.themeSchemaPath);
    console.log('- スキーマキャッシュ:', snapshot.main.cached ? '有効' : '無効');
    console.log('- テンプレートスキーマキャッシュ:', snapshot.template.cached ? '有効' : '無効');
    console.log('- テーマスキーマキャッシュ:', snapshot.theme.cached ? '有効' : '無効');
    console.log('- 最終スキーマ読み込み:', new Date(snapshot.main.lastLoad).toISOString());
    console.log('- 最終テンプレートスキーマ読み込み:', new Date(snapshot.template.lastLoad).toISOString());
    console.log('- 最終テーマスキーマ読み込み:', new Date(snapshot.theme.lastLoad).toISOString());
  }

  clearCache(): void {
    this.cacheStore.clear();
    this.debug('[SchemaManager] スキーマキャッシュをクリアしました');
  }

  validateSchema(data: unknown, schema: SchemaDefinition): SchemaValidationResult {
    return validateDataAgainstSchema(data, schema);
  }

  async registerSchema(filePattern: string, schemaPath: string): Promise<void> {
    await registerYamlSchemaForPattern(filePattern, schemaPath, (message, ...args) => this.debug(message, ...args));
  }

  async unregisterSchema(filePattern: string): Promise<void> {
    await unregisterYamlSchemaByFilePattern(filePattern, (message, ...args) => this.debug(message, ...args));
  }

  private debug(message: string, ...args: unknown[]): void {
    if (!this.verboseLogging) {
      return;
    }
    console.log(message, ...args);
  }
}
