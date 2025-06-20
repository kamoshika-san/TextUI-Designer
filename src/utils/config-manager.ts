import * as vscode from 'vscode';

/**
 * 設定管理ユーティリティ
 */
export class ConfigManager {
  private static readonly CONFIG_SECTION = 'textui-designer';

  /**
   * 設定値を取得
   */
  static get<T>(key: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get(key, defaultValue);
  }

  /**
   * 設定値を設定
   */
  static async set<T>(key: string, value: T): Promise<void> {
    await vscode.workspace.getConfiguration(this.CONFIG_SECTION).update(key, value);
  }

  /**
   * ファイル拡張子の設定
   */
  static getSupportedFileExtensions(): string[] {
    return this.get('supportedFileExtensions', ['.tui.yml', '.tui.yaml']);
  }

  /**
   * 自動プレビュー有効化の設定
   */
  static isAutoPreviewEnabled(): boolean {
    return this.get('autoPreview.enabled', true);
  }

  /**
   * 開発者ツール有効化の設定
   */
  static isDevToolsEnabled(): boolean {
    return this.get('devTools.enabled', false);
  }

  /**
   * テーマ変数無効化の設定
   */
  static isThemeVariablesDisabled(): boolean {
    return this.get('webview.disableThemeVariables', true);
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
   * WebView設定
   */
  static getWebViewSettings() {
    return {
      theme: this.get('webview.theme', 'auto'),
      fontSize: this.get('webview.fontSize', 14),
      disableThemeVariables: this.get('webview.disableThemeVariables', true)
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
   * 設定変更の監視を開始
   */
  static onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this.CONFIG_SECTION)) {
        callback();
      }
    });
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
  }
} 