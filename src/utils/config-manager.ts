import * as vscode from 'vscode';

/**
 * 設定管理ユーティリティ
 */
export class ConfigManager {
  static readonly CONFIG_SECTION = 'textui-designer';

  /**
   * 設定値を取得
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
      const value = config.get<T>(key, defaultValue);
      
      // autoPreview.enabledの読み込み時のみログを出力
      if (key === 'autoPreview.enabled') {
        console.log(`[ConfigManager] autoPreview.enabled を読み込み: ${value}`);
      }
      
      return value;
    } catch (error) {
      console.error(`[ConfigManager] 設定取得エラー: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * 設定値を設定
   */
  static async set(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  /**
   * サポートされているファイル拡張子
   */
  static getSupportedFileExtensions(): string[] {
    return this.get('supportedFileExtensions', ['.tui.yml', '.tui.yaml']);
  }

  /**
   * 自動プレビューが有効かチェック
   */
  static isAutoPreviewEnabled(): boolean {
    const value = this.get('autoPreview.enabled', false);
    console.log(`[ConfigManager] autoPreview.enabled = ${value}`);
    return value;
  }

  /**
   * 開発者ツールが有効かチェック
   */
  static isDevToolsEnabled(): boolean {
    return this.get('devTools.enabled', false);
  }

  /**
   * WebView設定
   */
  static getWebViewSettings() {
    return {
      disableThemeVariables: this.get('webview.disableThemeVariables', true),
      theme: this.get('webview.theme', 'auto'),
      fontSize: this.get('webview.fontSize', 14)
    };
  }

  /**
   * エクスポート設定
   */
  static getExportSettings() {
    return {
      defaultFormat: this.get('export.defaultFormat', 'html'),
      includeComments: this.get('export.includeComments', true),
      minify: this.get('export.minify', false)
    };
  }

  /**
   * 診断設定
   */
  static getDiagnosticSettings() {
    return {
      enabled: this.get('diagnostics.enabled', true),
      maxProblems: this.get('diagnostics.maxProblems', 100),
      validateOnSave: this.get('diagnostics.validateOnSave', true),
      validateOnChange: this.get('diagnostics.validateOnChange', true)
    };
  }

  /**
   * スキーマ設定
   */
  static getSchemaSettings() {
    return {
      validationEnabled: this.get('schema.validation.enabled', true),
      autoReload: this.get('schema.autoReload', true)
    };
  }

  /**
   * テンプレート設定
   */
  static getTemplateSettings() {
    return {
      defaultLocation: this.get('templates.defaultLocation', ''),
      customTemplates: this.get('templates.customTemplates', [])
    };
  }

  /**
   * パフォーマンス設定
   */
  static getPerformanceSettings() {
    return {
      // WebView更新のデバウンス時間（ミリ秒）- より長くして安定性を向上
      webviewDebounceDelay: this.get('performance.webviewDebounceDelay', 800),
      // 診断のデバウンス時間（ミリ秒）- より長くして安定性を向上
      diagnosticDebounceDelay: this.get('performance.diagnosticDebounceDelay', 1000),
      // 補完のデバウンス時間（ミリ秒）
      completionDebounceDelay: this.get('performance.completionDebounceDelay', 500),
      // キャッシュの有効期限（ミリ秒）- より長くしてパフォーマンスを向上
      cacheTTL: this.get('performance.cacheTTL', 60000),
      // スキーマキャッシュの有効期限（ミリ秒）
      schemaCacheTTL: this.get('performance.schemaCacheTTL', 120000),
      // メモリ使用量の監視間隔（ミリ秒、開発時のみ）
      memoryMonitorInterval: this.get('performance.memoryMonitorInterval', 30000),
      // パフォーマンスログの有効化
      enablePerformanceLogs: this.get('performance.enablePerformanceLogs', true),
      // 最小更新間隔（ミリ秒）- より長くして安定性を向上
      minUpdateInterval: this.get('performance.minUpdateInterval', 300),
      // 最大同時処理数 - より少なくして安定性を向上
      maxConcurrentOperations: this.get('performance.maxConcurrentOperations', 1)
    };
  }

  /**
   * 設定をリセット
   */
  static async resetConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update('supportedFileExtensions', undefined);
    await config.update('autoPreview.enabled', undefined);
    await config.update('devTools.enabled', undefined);
    await config.update('webview.disableThemeVariables', undefined);
    await config.update('export.defaultFormat', undefined);
    await config.update('export.includeComments', undefined);
    await config.update('export.minify', undefined);
    await config.update('diagnostics.enabled', undefined);
    await config.update('diagnostics.maxProblems', undefined);
    await config.update('diagnostics.validateOnSave', undefined);
    await config.update('diagnostics.validateOnChange', undefined);
    await config.update('schema.validation.enabled', undefined);
    await config.update('schema.autoReload', undefined);
    await config.update('webview.theme', undefined);
    await config.update('webview.fontSize', undefined);
    await config.update('templates.defaultLocation', undefined);
    await config.update('templates.customTemplates', undefined);
    await config.update('performance.webviewDebounceDelay', undefined);
    await config.update('performance.diagnosticDebounceDelay', undefined);
    await config.update('performance.completionDebounceDelay', undefined);
    await config.update('performance.cacheTTL', undefined);
    await config.update('performance.schemaCacheTTL', undefined);
    await config.update('performance.memoryMonitorInterval', undefined);
    await config.update('performance.enablePerformanceLogs', undefined);
    await config.update('performance.minUpdateInterval', undefined);
    await config.update('performance.maxConcurrentOperations', undefined);
  }

  /**
   * 設定スキーマを取得
   */
  static getConfigurationSchema(): any {
    return {
      type: 'object',
      title: 'TextUI Designer',
      properties: {
        'supportedFileExtensions': {
          type: 'array',
          items: { type: 'string' },
          default: ['.tui.yml', '.tui.yaml'],
          description: 'サポートするファイル拡張子'
        },
        'autoPreview.enabled': {
          type: 'boolean',
          default: false,
          description: 'ファイルを開いた時に自動的にプレビューを表示'
        },
        'devTools.enabled': {
          type: 'boolean',
          default: false,
          description: '開発者ツールの有効化'
        },
        'webview.disableThemeVariables': {
          type: 'boolean',
          default: true,
          description: 'VS Codeのテーマ変数を無効化して独自スタイルを使用'
        },
        'webview.theme': {
          type: 'string',
          enum: ['auto', 'light', 'dark'],
          default: 'auto',
          description: 'WebViewのテーマ'
        },
        'webview.fontSize': {
          type: 'number',
          default: 14,
          description: 'WebViewのフォントサイズ'
        },
        'export.defaultFormat': {
          type: 'string',
          enum: ['html', 'react', 'pug'],
          default: 'html',
          description: 'デフォルトのエクスポート形式'
        },
        'export.includeComments': {
          type: 'boolean',
          default: true,
          description: 'エクスポート時にコメントを含める'
        },
        'export.minify': {
          type: 'boolean',
          default: false,
          description: 'エクスポート時にコードを圧縮'
        },
        'diagnostics.enabled': {
          type: 'boolean',
          default: true,
          description: '診断機能の有効化'
        },
        'diagnostics.maxProblems': {
          type: 'number',
          default: 100,
          description: '最大診断問題数'
        },
        'diagnostics.validateOnSave': {
          type: 'boolean',
          default: true,
          description: '保存時に診断を実行'
        },
        'diagnostics.validateOnChange': {
          type: 'boolean',
          default: true,
          description: '変更時に診断を実行'
        },
        'schema.validation.enabled': {
          type: 'boolean',
          default: true,
          description: 'スキーマ検証の有効化'
        },
        'schema.autoReload': {
          type: 'boolean',
          default: true,
          description: 'スキーマの自動再読み込み'
        },
        'templates.defaultLocation': {
          type: 'string',
          default: '',
          description: 'テンプレートのデフォルト保存場所'
        },
        'templates.customTemplates': {
          type: 'array',
          items: { type: 'string' },
          default: [],
          description: 'カスタムテンプレートファイルのパス'
        },
        'performance.webviewDebounceDelay': {
          type: 'number',
          default: 800,
          description: 'WebView更新のデバウンス時間（ミリ秒）'
        },
        'performance.diagnosticDebounceDelay': {
          type: 'number',
          default: 1000,
          description: '診断のデバウンス時間（ミリ秒）'
        },
        'performance.completionDebounceDelay': {
          type: 'number',
          default: 500,
          description: '補完のデバウンス時間（ミリ秒）'
        },
        'performance.cacheTTL': {
          type: 'number',
          default: 60000,
          description: 'キャッシュの有効期限（ミリ秒）'
        },
        'performance.schemaCacheTTL': {
          type: 'number',
          default: 120000,
          description: 'スキーマキャッシュの有効期限（ミリ秒）'
        },
        'performance.memoryMonitorInterval': {
          type: 'number',
          default: 30000,
          description: 'メモリ使用量の監視間隔（ミリ秒、開発時のみ）'
        },
        'performance.enablePerformanceLogs': {
          type: 'boolean',
          default: true,
          description: 'パフォーマンスログの有効化'
        },
        'performance.minUpdateInterval': {
          type: 'number',
          default: 300,
          description: '最小更新間隔（ミリ秒）'
        },
        'performance.maxConcurrentOperations': {
          type: 'number',
          default: 1,
          description: '最大同時処理数'
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