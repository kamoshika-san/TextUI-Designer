import * as vscode from 'vscode';
import { SchemaManager, ISchemaManagerDependencies } from './schema-manager';
import { SchemaLoaderConfig } from './schema-loaders';
import { DIContainer, ServiceTokens } from '../utils/di-container';
import { ErrorHandler } from '../utils/error-handler';

/**
 * SchemaManagerファクトリー
 * 依存性注入を簡単に行えるファクトリークラス
 */
export class SchemaManagerFactory {
  private static container = DIContainer.getInstance();

  /**
   * 標準的なSchemaManagerを作成
   */
  static create(
    context: vscode.ExtensionContext, 
    loaderConfig?: SchemaLoaderConfig
  ): SchemaManager {
    return new SchemaManager(context, loaderConfig, { errorHandler: ErrorHandler });
  }

  /**
   * テスト用のSchemaManagerを作成（依存関係を注入）
   */
  static createForTest(
    context: vscode.ExtensionContext,
    dependencies: ISchemaManagerDependencies
  ): SchemaManager {
    if (!dependencies.errorHandler) dependencies.errorHandler = ErrorHandler;
    return new SchemaManager(context, undefined, dependencies);
  }

  /**
   * DIコンテナーからSchemaManagerを作成
   */
  static createFromContainer(context: vscode.ExtensionContext): SchemaManager {
    const dependencies: ISchemaManagerDependencies = {
      errorHandler: ErrorHandler
    };

    // コンテナーから依存関係を解決
    if (this.container.has(ServiceTokens.TEMPLATE_SCHEMA_CREATOR)) {
      dependencies.templateSchemaCreator = this.container.resolve(ServiceTokens.TEMPLATE_SCHEMA_CREATOR);
    }
    if (this.container.has(ServiceTokens.SCHEMA_PATH_RESOLVER)) {
      dependencies.pathResolver = this.container.resolve(ServiceTokens.SCHEMA_PATH_RESOLVER);
    }
    if (this.container.has(ServiceTokens.CACHED_SCHEMA_LOADER)) {
      dependencies.schemaLoader = this.container.resolve(ServiceTokens.CACHED_SCHEMA_LOADER);
    }
    if (this.container.has(ServiceTokens.SCHEMA_REGISTRAR)) {
      dependencies.registrar = this.container.resolve(ServiceTokens.SCHEMA_REGISTRAR);
    }

    return new SchemaManager(context, undefined, dependencies);
  }

  /**
   * デフォルトサービスをコンテナーに登録
   */
  static registerDefaultServices(context: vscode.ExtensionContext): void {
    // デフォルトのサービスを登録
    this.container.registerFactory(ServiceTokens.SCHEMA_MANAGER, () => {
      return this.create(context);
    });
  }

  /**
   * テスト用サービスをコンテナーに登録
   */
  static registerTestServices(
    context: vscode.ExtensionContext,
    dependencies: ISchemaManagerDependencies
  ): void {
    // テスト用のサービスを登録
    this.container.registerFactory(ServiceTokens.SCHEMA_MANAGER, () => {
      return this.createForTest(context, dependencies);
    });
  }

  /**
   * コンテナーをクリア
   */
  static async clearContainer(): Promise<void> {
    await this.container.cleanup();
  }
} 