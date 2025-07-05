import * as vscode from 'vscode';
import { TypedConfigManager, ConfigSchema, VSCODE_CONFIG_SCHEMA } from './config-system';

/**
 * 設定管理ユーティリティ（後方互換性維持版）
 * 
 * リファクタリング後：
 * - 内部的にTypedConfigManagerを使用
 * - 既存のAPIとの互換性を保持
 * - 型安全性の恩恵を受ける
 */
export class ConfigManager {
  static readonly CONFIG_SECTION = 'textui-designer';

  /**
   * 設定値を取得（後方互換性のため残存）
   * @deprecated TypedConfigManager.get() の使用を推奨
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      // 型安全なキーの場合はTypedConfigManagerを使用
      if (key in TypedConfigManager.get as any) {
        const typedKey = key as keyof ConfigSchema;
        return TypedConfigManager.get(typedKey) as T;
      }
      
      // フォールバック: 従来の方法
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
      const value = config.get<T>(key, defaultValue);
      return value;
    } catch (error) {
      console.error(`[ConfigManager] 設定取得エラー: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * 設定値を設定（後方互換性のため残存）
   * @deprecated TypedConfigManager.set() の使用を推奨
   */
  static async set(key: string, value: any): Promise<void> {
    try {
      // 型安全なキーの場合はTypedConfigManagerを使用
      if (key in TypedConfigManager.get as any) {
        const typedKey = key as keyof ConfigSchema;
        await TypedConfigManager.set(typedKey, value);
        return;
      }
      
      // フォールバック: 従来の方法
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    } catch (error) {
      console.error(`[ConfigManager] 設定更新エラー: ${key}`, error);
      throw error;
    }
  }

  /**
   * サポートされているファイル拡張子
   */
  static getSupportedFileExtensions(): string[] {
    return TypedConfigManager.get('supportedFileExtensions');
  }

  /**
   * 自動プレビューが有効かチェック
   */
  static isAutoPreviewEnabled(): boolean {
    return TypedConfigManager.get('autoPreview.enabled');
  }

  /**
   * 開発者ツールが有効かチェック
   */
  static isDevToolsEnabled(): boolean {
    return TypedConfigManager.get('devTools.enabled');
  }

  /**
   * WebView設定（型安全バージョン）
   */
  static getWebViewSettings() {
    return {
      disableThemeVariables: TypedConfigManager.get('webview.disableThemeVariables'),
      theme: TypedConfigManager.get('webview.theme'),
      fontSize: TypedConfigManager.get('webview.fontSize')
    };
  }

  /**
   * エクスポート設定（型安全バージョン）
   */
  static getExportSettings() {
    return {
      defaultFormat: TypedConfigManager.get('export.defaultFormat'),
      includeComments: TypedConfigManager.get('export.includeComments'),
      minify: TypedConfigManager.get('export.minify')
    };
  }

  /**
   * 診断設定（型安全バージョン）
   */
  static getDiagnosticSettings() {
    return {
      enabled: TypedConfigManager.get('diagnostics.enabled'),
      maxProblems: TypedConfigManager.get('diagnostics.maxProblems'),
      validateOnSave: TypedConfigManager.get('diagnostics.validateOnSave'),
      validateOnChange: TypedConfigManager.get('diagnostics.validateOnChange')
    };
  }

  /**
   * スキーマ設定（型安全バージョン）
   */
  static getSchemaSettings() {
    return {
      validationEnabled: TypedConfigManager.get('schema.validation.enabled'),
      autoReload: TypedConfigManager.get('schema.autoReload')
    };
  }

  /**
   * テンプレート設定（型安全バージョン）
   */
  static getTemplateSettings() {
    return {
      defaultLocation: TypedConfigManager.get('templates.defaultLocation'),
      customTemplates: TypedConfigManager.get('templates.customTemplates')
    };
  }

  /**
   * パフォーマンス設定（型安全バージョン）
   */
  static getPerformanceSettings() {
    return {
      webviewDebounceDelay: TypedConfigManager.get('performance.webviewDebounceDelay'),
      diagnosticDebounceDelay: TypedConfigManager.get('performance.diagnosticDebounceDelay'),
      completionDebounceDelay: TypedConfigManager.get('performance.completionDebounceDelay'),
      cacheTTL: TypedConfigManager.get('performance.cacheTTL'),
      schemaCacheTTL: TypedConfigManager.get('performance.schemaCacheTTL'),
      memoryMonitorInterval: TypedConfigManager.get('performance.memoryMonitorInterval'),
      enablePerformanceLogs: TypedConfigManager.get('performance.enablePerformanceLogs'),
      minUpdateInterval: TypedConfigManager.get('performance.minUpdateInterval'),
      maxConcurrentOperations: TypedConfigManager.get('performance.maxConcurrentOperations'),
      enableMemoryTracking: TypedConfigManager.get('performance.enableMemoryTracking'),
      memoryMeasurementInterval: TypedConfigManager.get('performance.memoryMeasurementInterval'),
      memoryCleanupInterval: TypedConfigManager.get('performance.memoryCleanupInterval')
    };
  }

  /**
   * 設定をリセット（TypedConfigManagerに委譲）
   */
  static async resetConfiguration(): Promise<void> {
    await TypedConfigManager.resetConfiguration();
  }

  /**
   * 設定スキーマを取得（型安全バージョン）
   */
  static getConfigurationSchema(): any {
    return VSCODE_CONFIG_SCHEMA;
  }

  /**
   * 設定変更の監視を開始（TypedConfigManagerに委譲）
   */
  static onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this.CONFIG_SECTION)) {
        callback();
      }
    });
  }

  /**
   * 型安全な設定管理インスタンスを取得
   */
  static getTypedManager(): typeof TypedConfigManager {
    return TypedConfigManager;
  }

  /**
   * 設定の検証を実行
   */
  static validateConfiguration(): { valid: boolean; errors: string[] } {
    return TypedConfigManager.validateConfiguration();
  }

  /**
   * 設定の統計情報を取得
   */
  static getConfigurationStats() {
    return TypedConfigManager.getConfigurationStats();
  }
} 