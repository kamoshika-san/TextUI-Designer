export type SettingsDefaults = {
  'templates.customTemplates': Array<{
    name: string;
    path: string;
    description?: string;
  }>;
  'supportedFileExtensions': string[];
  'autoPreview.enabled': boolean;
  'devTools.enabled': boolean;
  'webview.disableThemeVariables': boolean;
  'webview.theme': string;
  'webview.fontSize': number;
  'webview.jumpToDsl.showHoverIndicator': boolean;
  'preview.showUpdateIndicator': boolean;
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
  'mcp.autoConfigure': boolean;
  'mcp.scope': 'workspace' | 'user' | 'both';
  'mcp.serverId': string;
  'mcp.command': string;
  'mcp.notifyOnConfigured': boolean;
};

export const SETTINGS_DEFAULTS: SettingsDefaults = {
  'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
  'autoPreview.enabled': false,
  'devTools.enabled': false,
  'webview.disableThemeVariables': true,
  'webview.theme': 'auto',
  'webview.fontSize': 14,
  'webview.jumpToDsl.showHoverIndicator': true,
  'preview.showUpdateIndicator': true,
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
  'performance.memoryCleanupInterval': 30000,
  'mcp.autoConfigure': true,
  'mcp.scope': 'both',
  'mcp.serverId': 'textui-designer',
  'mcp.command': 'node',
  'mcp.notifyOnConfigured': true
};

export function buildConfigurationSchema(defaults: SettingsDefaults): Record<string, unknown> {
  const defaultValue = <K extends keyof SettingsDefaults>(key: K): SettingsDefaults[K] => defaults[key];

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
      'webview.jumpToDsl.showHoverIndicator': {
        type: 'boolean',
        default: defaultValue('webview.jumpToDsl.showHoverIndicator'),
        description: 'Preview jump-to-DSL hover indicator visibility'
      },
      'preview.showUpdateIndicator': {
        type: 'boolean',
        default: defaultValue('preview.showUpdateIndicator'),
        description: 'Preview update indicator visibility'
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
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'テンプレート名'
            },
            path: {
              type: 'string',
              description: 'テンプレートファイルのパス'
            },
            description: {
              type: 'string',
              description: 'テンプレートの説明'
            }
          },
          required: ['name', 'path']
        },
        default: defaultValue('templates.customTemplates'),
        description: 'カスタムテンプレートの設定'
      },
      'performance.webviewDebounceDelay': {
        type: 'number',
        default: defaultValue('performance.webviewDebounceDelay'),
        minimum: 0,
        maximum: 2000,
        description: 'WebView更新のデバウンス時間（ミリ秒）'
      },
      'performance.diagnosticDebounceDelay': {
        type: 'number',
        default: defaultValue('performance.diagnosticDebounceDelay'),
        minimum: 0,
        maximum: 2000,
        description: '診断のデバウンス時間（ミリ秒）'
      },
      'performance.completionDebounceDelay': {
        type: 'number',
        default: defaultValue('performance.completionDebounceDelay'),
        minimum: 0,
        maximum: 1000,
        description: '補完のデバウンス時間（ミリ秒）'
      },
      'performance.cacheTTL': {
        type: 'number',
        default: defaultValue('performance.cacheTTL'),
        minimum: 1000,
        maximum: 60000,
        description: 'キャッシュの有効期限（ミリ秒）'
      },
      'performance.schemaCacheTTL': {
        type: 'number',
        default: defaultValue('performance.schemaCacheTTL'),
        minimum: 5000,
        maximum: 300000,
        description: 'スキーマキャッシュの有効期限（ミリ秒）'
      },
      'performance.memoryMonitorInterval': {
        type: 'number',
        default: defaultValue('performance.memoryMonitorInterval'),
        minimum: 10000,
        maximum: 300000,
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
        minimum: 50,
        maximum: 1000,
        description: '最小更新間隔（ミリ秒）'
      },
      'performance.maxConcurrentOperations': {
        type: 'number',
        default: defaultValue('performance.maxConcurrentOperations'),
        minimum: 1,
        maximum: 5,
        description: '最大同時処理数'
      },
      'performance.enableMemoryTracking': {
        type: 'boolean',
        default: defaultValue('performance.enableMemoryTracking'),
        description: 'TextUI Designer専用のメモリ追跡を有効化'
      },
      'performance.memoryMeasurementInterval': {
        type: 'number',
        default: defaultValue('performance.memoryMeasurementInterval'),
        minimum: 1000,
        maximum: 30000,
        description: 'メモリ測定間隔（ミリ秒）'
      },
      'performance.memoryCleanupInterval': {
        type: 'number',
        default: defaultValue('performance.memoryCleanupInterval'),
        minimum: 10000,
        maximum: 300000,
        description: 'メモリクリーンアップ間隔（ミリ秒）'
      },
      'mcp.autoConfigure': {
        type: 'boolean',
        default: defaultValue('mcp.autoConfigure'),
        description: '拡張起動時にMCP設定(mcp.json)を自動構成する'
      },
      'mcp.scope': {
        type: 'string',
        enum: ['workspace', 'user', 'both'],
        default: defaultValue('mcp.scope'),
        description: 'MCP設定の書き込み先（mcp.json と Codex用 .codex/config.toml）'
      },
      'mcp.serverId': {
        type: 'string',
        default: defaultValue('mcp.serverId'),
        description: 'mcp.jsonで使用するMCPサーバーID'
      },
      'mcp.command': {
        type: 'string',
        default: defaultValue('mcp.command'),
        description: 'MCPサーバー起動コマンド（通常はnode）'
      },
      'mcp.notifyOnConfigured': {
        type: 'boolean',
        default: defaultValue('mcp.notifyOnConfigured'),
        description: 'MCP設定更新時に通知を表示する'
      }
    }
  };
}
