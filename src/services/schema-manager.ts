import * as vscode from 'vscode';
import * as fs from 'fs';
import {
  ISchemaManager,
  SchemaDefinition,
  SchemaValidationResult
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
import { SchemaCacheStore } from './schema/schema-cache-store';
import { validateDataAgainstSchema } from './schema/schema-validator';

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

  async registerSchemas(): Promise<void> {
    try {
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

      await this.registerYamlSchemas(schemaUri, templateSchemaUri, themeSchemaUri);
      await this.registerJsonSchemas();

      this.debug('[SchemaManager] スキーマ登録完了');
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

    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
      await yamlConfig.update('schemas', filterTextUiYamlSchemas(currentSchemas), vscode.ConfigurationTarget.Global);
      this.debug('[SchemaManager] YAMLスキーマクリーンアップ完了');

      const jsonConfig = vscode.workspace.getConfiguration('json');
      const currentJsonSchemas = (jsonConfig.get('schemas') as JsonSchemaAssociation[] | undefined) || [];
      await jsonConfig.update('schemas', filterTextUiJsonSchemas(currentJsonSchemas), vscode.ConfigurationTarget.Global);
      this.debug('[SchemaManager] JSONスキーマクリーンアップ完了');
    } catch (error) {
      console.error('[SchemaManager] スキーマクリーンアップ中にエラーが発生しました:', error);
    }
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
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
      const schemaUri = vscode.Uri.file(schemaPath).toString();
      currentSchemas[schemaUri] = [filePattern];
      await yamlConfig.update('schemas', currentSchemas, vscode.ConfigurationTarget.Global);
      this.debug(`[SchemaManager] スキーマを登録しました: ${filePattern} -> ${schemaPath}`);
    } catch (error: unknown) {
      console.error(`[SchemaManager] スキーマ登録に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async unregisterSchema(filePattern: string): Promise<void> {
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
      const filteredSchemas = Object.fromEntries(Object.entries(currentSchemas).filter(([_uri, patterns]) => !patterns.includes(filePattern)));
      await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
      this.debug(`[SchemaManager] スキーマを登録解除しました: ${filePattern}`);
    } catch (error: unknown) {
      console.error(`[SchemaManager] スキーマ登録解除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async registerYamlSchemas(schemaUri: string, templateSchemaUri: string, themeSchemaUri: string): Promise<void> {
    try {
      const yamlConfig = vscode.workspace.getConfiguration('yaml');
      const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
      const filteredSchemas = filterTextUiYamlSchemas(currentSchemas);
      const newSchemas = buildTextUiYamlSchemas(filteredSchemas, schemaUri, templateSchemaUri, themeSchemaUri);
      await yamlConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
      this.debug('[SchemaManager] YAMLスキーマ登録成功');
    } catch (error) {
      console.warn('[SchemaManager] YAMLスキーマ登録に失敗しました（続行します）:', error);
    }
  }

  private async registerJsonSchemas(): Promise<void> {
    try {
      const jsonConfig = vscode.workspace.getConfiguration('json');
      const currentSchemas = (jsonConfig.get('schemas') as JsonSchemaAssociation[] | undefined) || [];
      const filteredSchemas = filterTextUiJsonSchemas(currentSchemas);
      const schemaContent = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
      const templateSchemaContent = JSON.parse(fs.readFileSync(this.templateSchemaPath, 'utf-8'));
      const themeSchemaContent = JSON.parse(fs.readFileSync(this.themeSchemaPath, 'utf-8'));
      const newSchemas = buildTextUiJsonSchemas(filteredSchemas, schemaContent, templateSchemaContent, themeSchemaContent);
      await jsonConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
      this.debug('[SchemaManager] JSONスキーマ登録成功');
    } catch (error) {
      console.warn('[SchemaManager] JSONスキーマ登録に失敗しました（続行します）:', error);
    }
  }

  private debug(message: string, ...args: unknown[]): void {
    if (!this.verboseLogging) {
      return;
    }
    console.log(message, ...args);
  }
}
