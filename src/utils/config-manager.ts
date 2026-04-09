import * as vscode from 'vscode';
import { buildConfigurationSchema, SETTINGS_DEFAULTS, type SettingsDefaults } from './config-schema';

export type ConfigProvider = (section: string) => {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown, target?: boolean | vscode.ConfigurationTarget | null): Thenable<void>;
};

/**
 * 設定管理ユーティリティ
 *
 * テスト時は setConfigProvider() で vscode.workspace.getConfiguration を
 * モックに差し替え可能。呼び出し側の static API は変更不要。
 */
export class ConfigManager {
  static readonly CONFIG_SECTION = 'textui-designer';

  private static readonly SETTINGS_DEFAULTS: SettingsDefaults = SETTINGS_DEFAULTS;

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

  static isNavigationFlowFile(fileName: string): boolean {
    const normalizedFileName = fileName.toLowerCase();
    return normalizedFileName.endsWith('.tui.flow.yml')
      || normalizedFileName.endsWith('.tui.flow.yaml')
      || normalizedFileName.endsWith('.tui.flow.json');
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
      fontSize: this.getDefaultValue('webview.fontSize'),
      preview: {
        showUpdateIndicator: this.getDefaultValue('preview.showUpdateIndicator')
      },
      jumpToDsl: {
        showHoverIndicator: this.getDefaultValue('webview.jumpToDsl.showHoverIndicator')
      }
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
    return buildConfigurationSchema(this.SETTINGS_DEFAULTS);
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
