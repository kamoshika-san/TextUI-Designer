/**
 * 型安全な依存性注入コンテナー
 * サービスの登録と解決を管理
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();
  private singletons = new Map<string, unknown>();
  private lifecycleHooks = new Map<string, () => Promise<void>>();

  constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * サービスを登録
   */
  register<T>(token: string, service: T): void {
    this.services.set(token, service);
  }

  /**
   * ファクトリーを登録
   */
  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  /**
   * シングルトンを登録
   */
  registerSingleton<T>(token: string, factory: () => T): void {
    this.factories.set(token, () => {
      if (!this.singletons.has(token)) {
        this.singletons.set(token, factory());
      }
      return this.singletons.get(token) as T;
    });
  }

  /**
   * ライフサイクルフックを登録
   */
  registerLifecycleHook(token: string, hook: () => Promise<void>): void {
    this.lifecycleHooks.set(token, hook);
  }

  /**
   * サービスを解決
   */
  resolve<T>(token: string): T {
    // 既存のサービスインスタンスを返す
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // ファクトリーから新しいインスタンスを作成
    if (this.factories.has(token)) {
      const factory = this.factories.get(token);
      if (factory) {
        const instance = factory();
        this.services.set(token, instance);
        return instance as T;
      }
    }

    throw new Error(`Service not found: ${token}`);
  }

  /**
   * サービスが登録されているかチェック
   */
  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token);
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<void> {
    const hooks = Array.from(this.lifecycleHooks.values());
    await Promise.all(hooks.map(hook => hook()));
  }

  /**
   * 全サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    // シングルトンのクリーンアップ
    this.singletons.clear();
    
    // サービスのクリーンアップ
    this.services.clear();
    this.factories.clear();
    this.lifecycleHooks.clear();
  }

  /**
   * 特定のサービスを削除
   */
  remove(token: string): void {
    this.services.delete(token);
    this.factories.delete(token);
    this.singletons.delete(token);
    this.lifecycleHooks.delete(token);
  }

  /**
   * コンテナの状態を取得
   */
  getStatus(): {
    services: number;
    factories: number;
    singletons: number;
    hooks: number;
  } {
    return {
      services: this.services.size,
      factories: this.factories.size,
      singletons: this.singletons.size,
      hooks: this.lifecycleHooks.size
    };
  }
}

/**
 * サービストークンの定数
 */
export const ServiceTokens = {
  SCHEMA_MANAGER: 'SchemaManager',
  TEMPLATE_SCHEMA_CREATOR: 'TemplateSchemaCreator',
  SCHEMA_PATH_RESOLVER: 'SchemaPathResolver',
  SCHEMA_REGISTRAR: 'SchemaRegistrar',
  CACHED_SCHEMA_LOADER: 'CachedSchemaLoader',
  ERROR_HANDLER: 'ErrorHandler',
  TEMPLATE_PARSER: 'TemplateParser',
  DIAGNOSTIC_MANAGER: 'DiagnosticManager',
  COMMAND_MANAGER: 'CommandManager',
  WEBVIEW_MANAGER: 'WebViewManager',
  THEME_MANAGER: 'ThemeManager',
  EXPORT_SERVICE: 'ExportService',
  EXPORT_MANAGER: 'ExportManager',
  TEMPLATE_SERVICE: 'TemplateService',
  SETTINGS_SERVICE: 'SettingsService',
  COMPLETION_PROVIDER: 'CompletionProvider',
  DEFINITION_PROVIDER: 'DefinitionProvider',
  FILE_WATCHER: 'FileWatcher',
  CONFIG_MANAGER: 'ConfigManager',
  PERFORMANCE_MONITOR: 'PerformanceMonitor',
  MEMORY_TRACKER: 'MemoryTracker'
} as const;

/**
 * サービスプロバイダーインターフェース
 */
export interface IServiceProvider {
  getService<T>(token: string): T;
  registerService<T>(token: string, service: T): void;
  registerFactory<T>(token: string, factory: () => T): void;
  registerSingleton<T>(token: string, factory: () => T): void;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * サービスプロバイダーの実装
 */
export class ServiceProvider implements IServiceProvider {
  private container: DIContainer;

  constructor(container: DIContainer) {
    this.container = container;
  }

  getService<T>(token: string): T {
    return this.container.resolve<T>(token);
  }

  registerService<T>(token: string, service: T): void {
    this.container.register(token, service);
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.container.registerFactory(token, factory);
  }

  registerSingleton<T>(token: string, factory: () => T): void {
    this.container.registerSingleton(token, factory);
  }

  async initialize(): Promise<void> {
    await this.container.initialize();
  }

  async cleanup(): Promise<void> {
    await this.container.cleanup();
  }
} 