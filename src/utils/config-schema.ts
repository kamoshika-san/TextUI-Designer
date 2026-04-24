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
  'performance.enableMemoryTracking': true,
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
        description: 'Choose which file extensions TextUI Designer treats as TextUI DSL files.'
      },
      'autoPreview.enabled': {
        type: 'boolean',
        default: defaultValue('autoPreview.enabled'),
        description: 'Open the Preview automatically when you open a TextUI file.'
      },
      'devTools.enabled': {
        type: 'boolean',
        default: defaultValue('devTools.enabled'),
        description: 'Allow the WebView developer tools command for troubleshooting extension internals.'
      },
      'webview.disableThemeVariables': {
        type: 'boolean',
        default: defaultValue('webview.disableThemeVariables'),
        description: 'Use TextUI preview styling instead of inheriting VS Code theme variables.'
      },
      'webview.theme': {
        type: 'string',
        enum: ['auto', 'light', 'dark'],
        default: defaultValue('webview.theme'),
        description: 'Choose the Preview theme: follow VS Code, light, or dark.'
      },
      'webview.fontSize': {
        type: 'number',
        default: defaultValue('webview.fontSize'),
        description: 'Set the Preview font size in pixels.'
      },
      'webview.jumpToDsl.showHoverIndicator': {
        type: 'boolean',
        default: defaultValue('webview.jumpToDsl.showHoverIndicator'),
        description: 'Show the hover hint for jumping from Preview components back to YAML.'
      },
      'preview.showUpdateIndicator': {
        type: 'boolean',
        default: defaultValue('preview.showUpdateIndicator'),
        description: 'Show a small status indicator when the Preview refreshes.'
      },
      'export.defaultFormat': {
        type: 'string',
        enum: ['html', 'react', 'svelte', 'vue', 'pug'],
        default: defaultValue('export.defaultFormat'),
        description: 'Choose the export format used when no format is specified.'
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
        description: 'Show validation diagnostics for TextUI files.'
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
        description: 'Validate TextUI files against the bundled schemas.'
      },
      'schema.autoReload': {
        type: 'boolean',
        default: defaultValue('schema.autoReload'),
        description: 'スキーマの自動再読み込み'
      },
      'templates.defaultLocation': {
        type: 'string',
        default: defaultValue('templates.defaultLocation'),
        description: 'Default folder for saving templates'
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
        description: 'Delay Preview refreshes while typing, in milliseconds.'
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
        description: 'Track TextUI Designer memory usage for troubleshooting.'
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
        description: '拡張起動時にMCP設定を自動構成する（workspace: .vscode/mcp.json、user: ~/.config/.../mcp.json または .codex/config.toml の mcp_servers を更新）'
      },
      'mcp.scope': {
        type: 'string',
        enum: ['workspace', 'user', 'both'],
        default: defaultValue('mcp.scope'),
        description: 'Choose where TextUI Designer writes MCP client configuration.'
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
