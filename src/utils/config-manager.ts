import * as vscode from 'vscode';

export type ConfigProvider = (section: string) => {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown, target?: boolean | vscode.ConfigurationTarget | null): Thenable<void>;
};

type SettingsDefaults = {
  'supportedFileExtensions': string[];
  'autoPreview.enabled': boolean;
  'devTools.enabled': boolean;
  'webview.disableThemeVariables': boolean;
  'webview.theme': string;
  'webview.fontSize': number;
  'export.defaultFormat': string;
  'export.includeComments': boolean;
  'export.minify': boolean;
  'diagnostics.enabled': boolean;
  'diagnostics.maxProblems': number;
  'diagnostics.validateOnSave': boolean;
  'diagnostics.validateOnChange': boolean;
  'schema.validation.enabled': boolean;
  'schema.autoReload': boolean;
  'templates.defaultLocation': string;
  'templates.customTemplates': unknown[];
  'performance.webviewDebounceDelay': number;
  'performance.diagnosticDebounceDelay': number;
  'performance.completionDebounceDelay': number;
  'performance.cacheTTL': number;
  'performance.schemaCacheTTL': number;
  'performance.memoryMonitorInterval': number;
  'performance.enablePerformanceLogs': boolean;
  'performance.minUpdateInterval': number;
  'performance.maxConcurrentOperations': number;
  'performance.enableMemoryTracking': boolean;
  'performance.memoryMeasurementInterval': number;
  'performance.memoryCleanupInterval': number;
};

/**
 * 設定管理ユーティリティ
 *
 * テスト時は setConfigProvider() で vscode.workspace.getConfiguration を
 * モックに差し替え可能。呼び出し側の static API は変更不要。
 */
export class ConfigManager {
  static readonly CONFIG_SECTION = 'textui-designer';

  private static readonly SETTINGS_DEFAULTS: SettingsDefaults = {
    'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
    'autoPreview.enabled': false,
    'devTools.enabled': false,
    'webview.disableThemeVariables': true,
    'webview.theme': 'auto',
    'webview.fontSize': 14,
    'export.defaultFormat': 'html',
    'export.includeComments': true,
    'export.minify': false,
    'diagnostics.enabled': true,
    'diagnostics.maxProblems': 100,
    'diagnostics.validateOnSave': true,
    'diagnostics.validateOnChange': true,
    'schema.validation.enabled': true,
    'schema.autoReload': true,
    'templates.defaultLocation': '',
    'templates.customTemplates': [],
    'performance.webviewDebounceDelay': 300,
    'performance.diagnosticDebounceDelay': 500,
    'performance.completionDebounceDelay': 200,
    'performance.cacheTTL': 30000,
    'performance.schemaCacheTTL': 60000,
    'performance.memoryMonitorInterval': 30000,
    'performance.enablePerformanceLogs': true,
    'performance.minUpdateInterval': 100,
    'performance.maxConcurrentOperations': 2,
    'performance.enableMemoryTracking': false,
    'performance.memoryMeasurementInterval': 5000,
    'performance.memoryCleanupInterval': 30000
  };

  private static configProvider: ConfigProvider | null = null;

  /**
   * 設定プロバイダーを差し替え（テスト・DI 用）
   */
  static setConfigProvider(provider: ConfigProvider): void {
    this.configProvider = provider;
  }

  /**
   * 設定プロバイダーをデフォルト（vscode.workspace.getConfiguration）に戻す
   */
  static resetConfigProvider(): void {
    this.configProvider = null;
  }

  private static getConfig() {
    if (this.configProvider) {
      return this.configProvider(this.CONFIG_SECTION);
    }
    return vscode.workspace.getConfiguration(this.CONFIG_SECTION);
  }

  /**
   * 設定値を取得
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      const config = this.getConfig();
      const value = config.get<T>(key, defaultValue);
      return value;
    } catch (error) {
      console.error(`[ConfigManager] 設定取得エラー: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * 設定値を設定
   */
  static async set(key: string, value: unknown): Promise<void> {
    const config = this.getConfig();
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  /**
   * サポートされているファイル拡張子
   */
  static getSupportedFileExtensions(): string[] {
    return this.getDefaultValue('supportedFileExtensions');
  }

  /**
   * サポート対象のファイルかチェック
   */
  static isSupportedFile(fileName: string): boolean {
    const normalizedFileName = fileName.toLowerCase();
    return this.getSupportedFileExtensions().some(ext =>
      normalizedFileName.endsWith(ext.toLowerCase())
    );
  }

  /**
   * 自動プレビューが有効かチェック
   */
  static isAutoPreviewEnabled(): boolean {
    const value = this.getDefaultValue('autoPreview.enabled');
    return value;
  }

  /**
   * 開発者ツールが有効かチェック
   */
  static isDevToolsEnabled(): boolean {
    return this.getDefaultValue('devTools.enabled');
  }

  /**
   * WebView設定
   */
  static getWebViewSettings() {
    return {
      disableThemeVariables: this.getDefaultValue('webview.disableThemeVariables'),
      theme: this.getDefaultValue('webview.theme'),
      fontSize: this.getDefaultValue('webview.fontSize')
    };
  }

  /**
   * エクスポート設定
   */
  static getExportSettings() {
    return {
      defaultFormat: this.getDefaultValue('export.defaultFormat'),
      includeComments: this.getDefaultValue('export.includeComments'),
      minify: this.getDefaultValue('export.minify')
    };
  }

  /**
   * 診断設定
   */
  static getDiagnosticSettings() {
    return {
      enabled: this.getDefaultValue('diagnostics.enabled'),
      maxProblems: this.getDefaultValue('diagnostics.maxProblems'),
      validateOnSave: this.getDefaultValue('diagnostics.validateOnSave'),
      validateOnChange: this.getDefaultValue('diagnostics.validateOnChange')
    };
  }

  /**
   * スキーマ設定
   */
  static getSchemaSettings() {
    return {
      validationEnabled: this.getDefaultValue('schema.validation.enabled'),
      autoReload: this.getDefaultValue('schema.autoReload')
    };
  }

  /**
   * テンプレート設定
   */
  static getTemplateSettings() {
    return {
      defaultLocation: this.getDefaultValue('templates.defaultLocation'),
      customTemplates: this.getDefaultValue('templates.customTemplates')
    };
  }

  /**
   * パフォーマンス設定
   */
  static getPerformanceSettings() {
    return {
      // WebView更新のデバウンス時間（ミリ秒）- よりリアルタイムに近い更新
      webviewDebounceDelay: this.getDefaultValue('performance.webviewDebounceDelay'),
      // 診断のデバウンス時間（ミリ秒）- よりリアルタイムに近い更新
      diagnosticDebounceDelay: this.getDefaultValue('performance.diagnosticDebounceDelay'),
      // 補完のデバウンス時間（ミリ秒）
      completionDebounceDelay: this.getDefaultValue('performance.completionDebounceDelay'),
      // キャッシュの有効期限（ミリ秒）- より短くしてリアルタイム性を向上
      cacheTTL: this.getDefaultValue('performance.cacheTTL'),
      // スキーマキャッシュの有効期限（ミリ秒）
      schemaCacheTTL: this.getDefaultValue('performance.schemaCacheTTL'),
      // メモリ使用量の監視間隔（ミリ秒、開発時のみ）
      memoryMonitorInterval: this.getDefaultValue('performance.memoryMonitorInterval'),
      // パフォーマンスログの有効化
      enablePerformanceLogs: this.getDefaultValue('performance.enablePerformanceLogs'),
      // 最小更新間隔（ミリ秒）- より短くしてリアルタイム性を向上
      minUpdateInterval: this.getDefaultValue('performance.minUpdateInterval'),
      // 最大同時処理数 - より多くしてレスポンス性を向上
      maxConcurrentOperations: this.getDefaultValue('performance.maxConcurrentOperations'),
      // メモリ追跡の有効化
      enableMemoryTracking: this.getDefaultValue('performance.enableMemoryTracking'),
      // メモリ測定間隔（ミリ秒）
      memoryMeasurementInterval: this.getDefaultValue('performance.memoryMeasurementInterval'),
      // メモリクリーンアップ間隔（ミリ秒）
      memoryCleanupInterval: this.getDefaultValue('performance.memoryCleanupInterval')
    };
  }

  /**
   * 設定をリセット
   */
  static async resetConfiguration(): Promise<void> {
    const config = this.getConfig();
    for (const key of Object.keys(this.SETTINGS_DEFAULTS) as Array<keyof SettingsDefaults>) {
      await config.update(key, undefined);
    }
  }

  private static getDefaultValue<K extends keyof SettingsDefaults>(key: K): SettingsDefaults[K] {
    return this.get(key, this.SETTINGS_DEFAULTS[key]);
  }

  /**
   * 設定スキーマを取得
   */
  static getConfigurationSchema(): Record<string, unknown> {
    const defaultValue = <K extends keyof SettingsDefaults>(key: K): SettingsDefaults[K] => this.SETTINGS_DEFAULTS[key];

    return {
      type: 'object',
      title: 'TextUI Designer',
      properties: {
        'supportedFileExtensions': {
          type: 'array',
          items: { type: 'string' },
          default: defaultValue('supportedFileExtensions'),
          description: 'サポートするファイル拡張子'
        },
        'autoPreview.enabled': {
          type: 'boolean',
          default: defaultValue('autoPreview.enabled'),
          description: 'ファイルを開いた時に自動的にプレビューを表示'
        },
        'devTools.enabled': {
          type: 'boolean',
          default: defaultValue('devTools.enabled'),
          description: '開発者ツールの有効化'
        },
        'webview.disableThemeVariables': {
          type: 'boolean',
          default: defaultValue('webview.disableThemeVariables'),
          description: 'VS Codeのテーマ変数を無効化して独自スタイルを使用'
        },
        'webview.theme': {
          type: 'string',
          enum: ['auto', 'light', 'dark'],
          default: defaultValue('webview.theme'),
          description: 'WebViewのテーマ'
        },
        'webview.fontSize': {
          type: 'number',
          default: defaultValue('webview.fontSize'),
          description: 'WebViewのフォントサイズ'
        },
        'export.defaultFormat': {
          type: 'string',
          enum: ['html', 'react', 'pug'],
          default: defaultValue('export.defaultFormat'),
          description: 'デフォルトのエクスポート形式'
        },
        'export.includeComments': {
          type: 'boolean',
          default: defaultValue('export.includeComments'),
          description: 'エクスポート時にコメントを含める'
        },
        'export.minify': {
          type: 'boolean',
          default: defaultValue('export.minify'),
          description: 'エクスポート時にコードを圧縮'
        },
        'diagnostics.enabled': {
          type: 'boolean',
          default: defaultValue('diagnostics.enabled'),
          description: '診断機能の有効化'
        },
        'diagnostics.maxProblems': {
          type: 'number',
          default: defaultValue('diagnostics.maxProblems'),
          description: '最大診断問題数'
        },
        'diagnostics.validateOnSave': {
          type: 'boolean',
          default: defaultValue('diagnostics.validateOnSave'),
          description: '保存時に診断を実行'
        },
        'diagnostics.validateOnChange': {
          type: 'boolean',
          default: defaultValue('diagnostics.validateOnChange'),
          description: '変更時に診断を実行'
        },
        'schema.validation.enabled': {
          type: 'boolean',
          default: defaultValue('schema.validation.enabled'),
          description: 'スキーマ検証の有効化'
        },
        'schema.autoReload': {
          type: 'boolean',
          default: defaultValue('schema.autoReload'),
          description: 'スキーマの自動再読み込み'
        },
        'templates.defaultLocation': {
          type: 'string',
          default: defaultValue('templates.defaultLocation'),
          description: 'テンプレートのデフォルト保存場所'
        },
        'templates.customTemplates': {
          type: 'array',
          items: { type: 'string' },
          default: defaultValue('templates.customTemplates'),
          description: 'カスタムテンプレートファイルのパス'
        },
        'performance.webviewDebounceDelay': {
          type: 'number',
          default: defaultValue('performance.webviewDebounceDelay'),
          description: 'WebView更新のデバウンス時間（ミリ秒）'
        },
        'performance.diagnosticDebounceDelay': {
          type: 'number',
          default: defaultValue('performance.diagnosticDebounceDelay'),
          description: '診断のデバウンス時間（ミリ秒）'
        },
        'performance.completionDebounceDelay': {
          type: 'number',
          default: defaultValue('performance.completionDebounceDelay'),
          description: '補完のデバウンス時間（ミリ秒）'
        },
        'performance.cacheTTL': {
          type: 'number',
          default: defaultValue('performance.cacheTTL'),
          description: 'キャッシュの有効期限（ミリ秒）'
        },
        'performance.schemaCacheTTL': {
          type: 'number',
          default: defaultValue('performance.schemaCacheTTL'),
          description: 'スキーマキャッシュの有効期限（ミリ秒）'
        },
        'performance.memoryMonitorInterval': {
          type: 'number',
          default: defaultValue('performance.memoryMonitorInterval'),
          description: 'メモリ使用量の監視間隔（ミリ秒、開発時のみ）'
        },
        'performance.enablePerformanceLogs': {
          type: 'boolean',
          default: defaultValue('performance.enablePerformanceLogs'),
          description: 'パフォーマンスログの有効化'
        },
        'performance.minUpdateInterval': {
          type: 'number',
          default: defaultValue('performance.minUpdateInterval'),
          description: '最小更新間隔（ミリ秒）'
        },
        'performance.maxConcurrentOperations': {
          type: 'number',
          default: defaultValue('performance.maxConcurrentOperations'),
          description: '最大同時処理数'
        },
        'performance.enableMemoryTracking': {
          type: 'boolean',
          default: defaultValue('performance.enableMemoryTracking'),
          description: 'メモリ追跡の有効化'
        },
        'performance.memoryMeasurementInterval': {
          type: 'number',
          default: defaultValue('performance.memoryMeasurementInterval'),
          description: 'メモリ測定間隔（ミリ秒）'
        },
        'performance.memoryCleanupInterval': {
          type: 'number',
          default: defaultValue('performance.memoryCleanupInterval'),
          description: 'メモリクリーンアップ間隔（ミリ秒）'
        }
      }
    };
  }

  /**
   * 設定変更の監視を開始
   */
  static onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this.CONFIG_SECTION)) {
        callback();
      }
    });
  }
} 
