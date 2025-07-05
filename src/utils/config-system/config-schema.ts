/**
 * TextUI Designer の型安全な設定スキーマ定義
 * 
 * このインターフェースが唯一の真実の情報源として、
 * 全ての設定管理機能を生成します。
 */
export interface ConfigSchema {
  // ファイル関連設定
  'supportedFileExtensions': string[];
  
  // 自動プレビュー設定
  'autoPreview.enabled': boolean;
  
  // 開発者ツール設定
  'devTools.enabled': boolean;
  
  // WebView設定
  'webview.disableThemeVariables': boolean;
  'webview.theme': 'auto' | 'light' | 'dark';
  'webview.fontSize': number;
  
  // エクスポート設定
  'export.defaultFormat': 'html' | 'react' | 'pug';
  'export.includeComments': boolean;
  'export.minify': boolean;
  
  // 診断設定
  'diagnostics.enabled': boolean;
  'diagnostics.maxProblems': number;
  'diagnostics.validateOnSave': boolean;
  'diagnostics.validateOnChange': boolean;
  
  // スキーマ設定
  'schema.validation.enabled': boolean;
  'schema.autoReload': boolean;
  
  // テンプレート設定
  'templates.defaultLocation': string;
  'templates.customTemplates': string[];
  
  // パフォーマンス設定
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
}

/**
 * 設定のデフォルト値定義
 * ConfigSchemaと完全に一致する型安全な構造
 */
export const CONFIG_DEFAULTS: ConfigSchema = {
  // ファイル関連設定
  'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
  
  // 自動プレビュー設定
  'autoPreview.enabled': false,
  
  // 開発者ツール設定
  'devTools.enabled': false,
  
  // WebView設定
  'webview.disableThemeVariables': true,
  'webview.theme': 'auto',
  'webview.fontSize': 14,
  
  // エクスポート設定
  'export.defaultFormat': 'html',
  'export.includeComments': true,
  'export.minify': false,
  
  // 診断設定
  'diagnostics.enabled': true,
  'diagnostics.maxProblems': 100,
  'diagnostics.validateOnSave': true,
  'diagnostics.validateOnChange': true,
  
  // スキーマ設定
  'schema.validation.enabled': true,
  'schema.autoReload': true,
  
  // テンプレート設定
  'templates.defaultLocation': '',
  'templates.customTemplates': [],
  
  // パフォーマンス設定
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
  'performance.memoryCleanupInterval': 30000,
};

/**
 * VS Code設定スキーマ定義
 * package.jsonのcontributeセクション用
 */
export const VSCODE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'TextUI Designer',
  properties: {
    // ファイル関連設定
    'supportedFileExtensions': {
      type: 'array',
      items: { type: 'string' },
      default: CONFIG_DEFAULTS['supportedFileExtensions'],
      description: 'サポートするファイル拡張子'
    },
    
    // 自動プレビュー設定
    'autoPreview.enabled': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['autoPreview.enabled'],
      description: 'ファイルを開いた時に自動的にプレビューを表示'
    },
    
    // 開発者ツール設定
    'devTools.enabled': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['devTools.enabled'],
      description: '開発者ツールの有効化'
    },
    
    // WebView設定
    'webview.disableThemeVariables': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['webview.disableThemeVariables'],
      description: 'VS Codeのテーマ変数を無効化して独自スタイルを使用'
    },
    'webview.theme': {
      type: 'string',
      enum: ['auto', 'light', 'dark'],
      default: CONFIG_DEFAULTS['webview.theme'],
      description: 'WebViewのテーマ'
    },
    'webview.fontSize': {
      type: 'number',
      default: CONFIG_DEFAULTS['webview.fontSize'],
      description: 'WebViewのフォントサイズ'
    },
    
    // エクスポート設定
    'export.defaultFormat': {
      type: 'string',
      enum: ['html', 'react', 'pug'],
      default: CONFIG_DEFAULTS['export.defaultFormat'],
      description: 'デフォルトのエクスポート形式'
    },
    'export.includeComments': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['export.includeComments'],
      description: 'エクスポート時にコメントを含める'
    },
    'export.minify': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['export.minify'],
      description: 'エクスポート時にコードを圧縮'
    },
    
    // 診断設定
    'diagnostics.enabled': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['diagnostics.enabled'],
      description: '診断機能の有効化'
    },
    'diagnostics.maxProblems': {
      type: 'number',
      default: CONFIG_DEFAULTS['diagnostics.maxProblems'],
      description: '最大診断問題数'
    },
    'diagnostics.validateOnSave': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['diagnostics.validateOnSave'],
      description: '保存時に診断を実行'
    },
    'diagnostics.validateOnChange': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['diagnostics.validateOnChange'],
      description: '変更時に診断を実行'
    },
    
    // スキーマ設定
    'schema.validation.enabled': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['schema.validation.enabled'],
      description: 'スキーマ検証の有効化'
    },
    'schema.autoReload': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['schema.autoReload'],
      description: 'スキーマの自動再読み込み'
    },
    
    // テンプレート設定
    'templates.defaultLocation': {
      type: 'string',
      default: CONFIG_DEFAULTS['templates.defaultLocation'],
      description: 'テンプレートのデフォルト保存場所'
    },
    'templates.customTemplates': {
      type: 'array',
      items: { type: 'string' },
      default: CONFIG_DEFAULTS['templates.customTemplates'],
      description: 'カスタムテンプレートファイルのパス'
    },
    
    // パフォーマンス設定
    'performance.webviewDebounceDelay': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.webviewDebounceDelay'],
      description: 'WebView更新のデバウンス時間（ミリ秒）'
    },
    'performance.diagnosticDebounceDelay': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.diagnosticDebounceDelay'],
      description: '診断のデバウンス時間（ミリ秒）'
    },
    'performance.completionDebounceDelay': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.completionDebounceDelay'],
      description: '補完のデバウンス時間（ミリ秒）'
    },
    'performance.cacheTTL': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.cacheTTL'],
      description: 'キャッシュの有効期限（ミリ秒）'
    },
    'performance.schemaCacheTTL': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.schemaCacheTTL'],
      description: 'スキーマキャッシュの有効期限（ミリ秒）'
    },
    'performance.memoryMonitorInterval': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.memoryMonitorInterval'],
      description: 'メモリ使用量の監視間隔（ミリ秒、開発時のみ）'
    },
    'performance.enablePerformanceLogs': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['performance.enablePerformanceLogs'],
      description: 'パフォーマンスログの有効化'
    },
    'performance.minUpdateInterval': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.minUpdateInterval'],
      description: '最小更新間隔（ミリ秒）'
    },
    'performance.maxConcurrentOperations': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.maxConcurrentOperations'],
      description: '最大同時処理数'
    },
    'performance.enableMemoryTracking': {
      type: 'boolean',
      default: CONFIG_DEFAULTS['performance.enableMemoryTracking'],
      description: 'メモリ追跡の有効化'
    },
    'performance.memoryMeasurementInterval': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.memoryMeasurementInterval'],
      description: 'メモリ測定間隔（ミリ秒）'
    },
    'performance.memoryCleanupInterval': {
      type: 'number',
      default: CONFIG_DEFAULTS['performance.memoryCleanupInterval'],
      description: 'メモリクリーンアップ間隔（ミリ秒）'
    }
  }
};

/**
 * 設定カテゴリーの定義
 */
export type ConfigCategory = 
  | 'file'
  | 'autoPreview' 
  | 'devTools'
  | 'webview'
  | 'export'
  | 'diagnostics'
  | 'schema'
  | 'templates'
  | 'performance';

/**
 * カテゴリー別の設定キー取得ヘルパー型
 */
export type ConfigKeysOfCategory<T extends ConfigCategory> = 
  T extends 'file' ? 'supportedFileExtensions' :
  T extends 'autoPreview' ? 'autoPreview.enabled' :
  T extends 'devTools' ? 'devTools.enabled' :
  T extends 'webview' ? 'webview.disableThemeVariables' | 'webview.theme' | 'webview.fontSize' :
  T extends 'export' ? 'export.defaultFormat' | 'export.includeComments' | 'export.minify' :
  T extends 'diagnostics' ? 'diagnostics.enabled' | 'diagnostics.maxProblems' | 'diagnostics.validateOnSave' | 'diagnostics.validateOnChange' :
  T extends 'schema' ? 'schema.validation.enabled' | 'schema.autoReload' :
  T extends 'templates' ? 'templates.defaultLocation' | 'templates.customTemplates' :
  T extends 'performance' ? keyof ConfigSchema & `performance.${string}` :
  never; 